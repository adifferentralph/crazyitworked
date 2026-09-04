import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { getAppUrl } from "@/config/env";
import { getDatabase } from "@/db/client";
import {
  cartItems,
  commercePayments,
  commerceWebhookEvents,
  inventoryTransactions,
  orderItems,
  orders,
  products,
  sellerLedgerEntries,
} from "@/db/schema";
import {
  hasKoraEnvironment,
  initializeKoraCharge,
  verifyKoraCharge,
  verifyKoraWebhookSignature,
} from "@/lib/commerce/kora";

const CHECKOUT_LIFETIME_MS = 30 * 60 * 1000;
const MAX_EXPIRED_ORDERS_PER_SWEEP = 50;

export type CheckoutErrorCode =
  | "CART_EMPTY"
  | "KORA_NOT_CONFIGURED"
  | "PAYMENT_INITIALIZATION_FAILED"
  | "PAYMENT_MISMATCH"
  | "PICKUP_UNAVAILABLE"
  | "STOCK_CHANGED";

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

type BuyerIdentity = {
  email: string;
  fullName: string;
  id: string;
};

type CheckoutRecord = {
  checkoutUrl: string | null;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  reference: string;
  totalMinor: number;
};

function buildReference() {
  return `TTP-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 10)
    .toUpperCase()}`;
}

export function calculateCheckoutFingerprint(
  buyerId: string,
  items: Array<{ priceMinor: number; productId: string; quantity: number; version: number }>,
) {
  const canonicalItems = [...items]
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((item) => [item.productId, item.quantity, item.priceMinor, item.version]);

  return createHash("sha256")
    .update(JSON.stringify({ buyerId, fulfillmentMethod: "PICKUP", items: canonicalItems }))
    .digest("hex");
}

async function releaseOrderReservations(orderId: string, reason: string) {
  const database = getDatabase();

  await database.transaction(async (transaction) => {
    const [cancelledOrder] = await transaction
      .update(orders)
      .set({
        cancelledAt: new Date(),
        paymentStatus: "FAILED",
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "PENDING_PAYMENT")))
      .returning({ id: orders.id });

    if (!cancelledOrder) return;

    const items = await transaction
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      const [updatedProduct] = await transaction
        .update(products)
        .set({
          reservedQuantity: sql`${products.reservedQuantity} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, item.productId),
            sql`${products.reservedQuantity} >= ${item.quantity}`,
          ),
        )
        .returning({
          quantity: products.quantity,
          reservedAfter: products.reservedQuantity,
        });

      if (!updatedProduct) continue;

      await transaction.insert(inventoryTransactions).values({
        metadata: { orderId },
        productId: item.productId,
        quantityAfter: updatedProduct.quantity,
        quantityBefore: updatedProduct.quantity,
        quantityDelta: 0,
        reason,
        reservedAfter: updatedProduct.reservedAfter,
        reservedBefore: updatedProduct.reservedAfter + item.quantity,
        reservedDelta: -item.quantity,
        type: "RESERVATION_RELEASE",
      });
    }

    await transaction
      .update(commercePayments)
      .set({
        failureCode: "CHECKOUT_CANCELLED",
        failureMessage: reason,
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commercePayments.orderId, orderId),
          inArray(commercePayments.status, ["PENDING", "PROCESSING"]),
        ),
      );
  });
}

export async function releaseExpiredCheckoutReservations() {
  const database = getDatabase();
  const expiredOrders = await database
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "PENDING_PAYMENT"), lt(orders.expiresAt, new Date())))
    .orderBy(orders.expiresAt)
    .limit(MAX_EXPIRED_ORDERS_PER_SWEEP);

  for (const order of expiredOrders) {
    await releaseOrderReservations(order.id, "Checkout expired before verified payment.");
  }
}

async function prepareCheckout(identity: BuyerIdentity): Promise<CheckoutRecord> {
  const database = getDatabase();

  return database.transaction(async (transaction) => {
    const cart = await transaction
      .select({
        cartId: cartItems.id,
        pickupAvailable: products.pickupAvailable,
        priceMinor: products.priceMinor,
        productCity: products.city,
        productCountry: products.country,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productState: products.state,
        productStatus: products.status,
        quantity: cartItems.quantity,
        reservedQuantity: products.reservedQuantity,
        sellerId: products.sellerId,
        sku: products.sku,
        stockQuantity: products.quantity,
        version: products.version,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(cartItems.buyerId, identity.id));

    if (!cart.length) {
      throw new CheckoutError("CART_EMPTY", "Your cart is empty.");
    }

    if (cart.some((item) => item.productStatus !== "APPROVED")) {
      throw new CheckoutError(
        "STOCK_CHANGED",
        "A part in your cart is no longer available for purchase.",
      );
    }

    if (cart.some((item) => !item.pickupAvailable)) {
      throw new CheckoutError(
        "PICKUP_UNAVAILABLE",
        "Pickup is not available for every part in this cart.",
      );
    }

    if (
      cart.some(
        (item) =>
          item.quantity < 1 ||
          item.stockQuantity - item.reservedQuantity < item.quantity,
      )
    ) {
      throw new CheckoutError(
        "STOCK_CHANGED",
        "Available stock changed. Review your cart quantities and try again.",
      );
    }

    const fingerprint = calculateCheckoutFingerprint(
      identity.id,
      cart.map((item) => ({
        priceMinor: item.priceMinor,
        productId: item.productId,
        quantity: item.quantity,
        version: item.version,
      })),
    );

    const [existing] = await transaction
      .select({
        checkoutUrl: commercePayments.checkoutUrl,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        paymentId: commercePayments.id,
        reference: commercePayments.providerReference,
        totalMinor: orders.totalMinor,
      })
      .from(orders)
      .innerJoin(commercePayments, eq(commercePayments.orderId, orders.id))
      .where(
        and(
          eq(orders.buyerId, identity.id),
          eq(orders.cartFingerprint, fingerprint),
          eq(orders.status, "PENDING_PAYMENT"),
          gt(orders.expiresAt, new Date()),
          inArray(commercePayments.status, ["PENDING", "PROCESSING"]),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (existing) return existing;

    const orderId = randomUUID();
    const paymentId = randomUUID();
    const orderNumber = buildReference();
    const totalMinor = cart.reduce(
      (sum, item) => sum + item.priceMinor * item.quantity,
      0,
    );
    const expiresAt = new Date(Date.now() + CHECKOUT_LIFETIME_MS);

    if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) {
      throw new CheckoutError("STOCK_CHANGED", "The cart total is invalid.");
    }

    for (const item of cart) {
      const [reservedProduct] = await transaction
        .update(products)
        .set({
          reservedQuantity: sql`${products.reservedQuantity} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.status, "APPROVED"),
            eq(products.pickupAvailable, true),
            sql`${products.quantity} - ${products.reservedQuantity} >= ${item.quantity}`,
          ),
        )
        .returning({
          quantity: products.quantity,
          reservedAfter: products.reservedQuantity,
        });

      if (!reservedProduct) {
        throw new CheckoutError(
          "STOCK_CHANGED",
          "Available stock changed. Review your cart and try again.",
        );
      }

      await transaction.insert(inventoryTransactions).values({
        metadata: { orderId },
        productId: item.productId,
        quantityAfter: reservedProduct.quantity,
        quantityBefore: reservedProduct.quantity,
        quantityDelta: 0,
        reason: "Reserved for Kora checkout.",
        reservedAfter: reservedProduct.reservedAfter,
        reservedBefore: reservedProduct.reservedAfter - item.quantity,
        reservedDelta: item.quantity,
        type: "RESERVATION",
      });
    }

    await transaction.insert(orders).values({
      actualDeliveryCostMinor: 0,
      buyerId: identity.id,
      cartFingerprint: fingerprint,
      customerEmail: identity.email,
      customerName: identity.fullName,
      deliveryTotalMinor: 0,
      expiresAt,
      fulfillmentMethod: "PICKUP",
      id: orderId,
      orderNumber,
      platformServiceComponentMinor: 0,
      productSubtotalMinor: totalMinor,
      totalMinor,
    });

    await transaction.insert(orderItems).values(
      cart.map((item) => {
        const productTotalMinor = item.priceMinor * item.quantity;

        return {
          id: randomUUID(),
          orderId,
          pickupCity: item.productCity,
          pickupCountry: item.productCountry,
          pickupState: item.productState,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productTotalMinor,
          quantity: item.quantity,
          sellerEntitlementMinor: productTotalMinor,
          sellerId: item.sellerId,
          sku: item.sku,
          unitPriceMinor: item.priceMinor,
        };
      }),
    );

    await transaction.insert(commercePayments).values({
      amountMinor: totalMinor,
      id: paymentId,
      idempotencyKey: `kora:${orderId}:initialize`,
      orderId,
      providerReference: orderNumber,
    });

    return {
      checkoutUrl: null,
      orderId,
      orderNumber,
      paymentId,
      reference: orderNumber,
      totalMinor,
    };
  });
}

export async function createKoraCheckout(identity: BuyerIdentity) {
  if (!hasKoraEnvironment()) {
    throw new CheckoutError(
      "KORA_NOT_CONFIGURED",
      "Secure payment is not configured yet.",
    );
  }

  await releaseExpiredCheckoutReservations();
  const checkout = await prepareCheckout(identity);

  if (checkout.checkoutUrl) return checkout;

  const database = getDatabase();
  const [claimed] = await database
    .update(commercePayments)
    .set({ status: "PROCESSING", updatedAt: new Date() })
    .where(
      and(
        eq(commercePayments.id, checkout.paymentId),
        eq(commercePayments.status, "PENDING"),
      ),
    )
    .returning({ id: commercePayments.id });

  if (!claimed) {
    const [current] = await database
      .select({ checkoutUrl: commercePayments.checkoutUrl })
      .from(commercePayments)
      .where(eq(commercePayments.id, checkout.paymentId))
      .limit(1);

    if (current?.checkoutUrl) {
      return { ...checkout, checkoutUrl: current.checkoutUrl };
    }

    throw new CheckoutError(
      "PAYMENT_INITIALIZATION_FAILED",
      "Secure payment is already being prepared. Please try again in a moment.",
    );
  }

  const appUrl = getAppUrl();

  try {
    const initialized = await initializeKoraCharge({
      amountMinor: checkout.totalMinor,
      customer: {
        email: identity.email,
        name: identity.fullName,
      },
      notificationUrl: `${appUrl}/api/payments/kora/webhook`,
      redirectUrl: `${appUrl}/checkout/return?reference=${encodeURIComponent(
        checkout.reference,
      )}`,
      reference: checkout.reference,
    });

    await database
      .update(commercePayments)
      .set({
        checkoutUrl: initialized.checkoutUrl,
        initializedAt: new Date(),
        providerPayload: {
          initializationMessage: initialized.providerMessage,
        },
        status: "PROCESSING",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commercePayments.id, checkout.paymentId),
          inArray(commercePayments.status, ["PENDING", "PROCESSING"]),
        ),
      );

    return {
      ...checkout,
      checkoutUrl: initialized.checkoutUrl,
    };
  } catch {
    await releaseOrderReservations(
      checkout.orderId,
      "Kora checkout initialization failed.",
    );
    throw new CheckoutError(
      "PAYMENT_INITIALIZATION_FAILED",
      "We could not start secure payment. No charge was made; please try again.",
    );
  }
}

async function markPaymentForReview(reference: string, message: string) {
  await getDatabase()
    .update(commercePayments)
    .set({
      failureCode: "PAYMENT_VERIFICATION_MISMATCH",
      failureMessage: message,
      status: "PROCESSING",
      updatedAt: new Date(),
      verifiedAt: new Date(),
    })
    .where(
      and(
        eq(commercePayments.providerReference, reference),
        inArray(commercePayments.status, ["PENDING", "PROCESSING"]),
      ),
    );
}

export async function verifyAndFulfillKoraPayment(reference: string) {
  const database = getDatabase();
  const [localPayment] = await database
    .select({
      amountMinor: commercePayments.amountMinor,
      currency: commercePayments.currency,
      orderId: commercePayments.orderId,
      paymentStatus: commercePayments.status,
      reference: commercePayments.providerReference,
    })
    .from(commercePayments)
    .where(eq(commercePayments.providerReference, reference))
    .limit(1);

  if (!localPayment) {
    return { status: "NOT_FOUND" as const };
  }

  if (localPayment.paymentStatus === "PAID") {
    return { orderId: localPayment.orderId, status: "PAID" as const };
  }

  const verification = await verifyKoraCharge(reference);

  if (
    verification.reference !== localPayment.reference ||
    verification.currency !== localPayment.currency ||
    verification.amountMinor !== localPayment.amountMinor
  ) {
    await markPaymentForReview(
      reference,
      "Provider reference, currency, or amount did not match the order.",
    );
    throw new CheckoutError(
      "PAYMENT_MISMATCH",
      "Payment requires manual review because the verified details did not match.",
    );
  }

  if (!verification.successful) {
    await database
      .update(commercePayments)
      .set({
        providerPayload: { providerStatus: verification.providerStatus },
        updatedAt: new Date(),
        verifiedAt: new Date(),
      })
      .where(eq(commercePayments.providerReference, reference));

    return {
      orderId: localPayment.orderId,
      providerStatus: verification.providerStatus,
      status: "PENDING" as const,
    };
  }

  return database.transaction(async (transaction) => {
    const [payment] = await transaction
      .select({
        amountMinor: commercePayments.amountMinor,
        orderId: commercePayments.orderId,
        paymentStatus: commercePayments.status,
      })
      .from(commercePayments)
      .where(eq(commercePayments.providerReference, reference))
      .limit(1);

    if (!payment) return { status: "NOT_FOUND" as const };
    if (payment.paymentStatus === "PAID") {
      return { orderId: payment.orderId, status: "PAID" as const };
    }

    const [order] = await transaction
      .select({
        buyerId: orders.buyerId,
        orderStatus: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);

    if (!order || order.orderStatus !== "PENDING_PAYMENT") {
      throw new Error("Verified payment belongs to an order that cannot be fulfilled automatically.");
    }

    const items = await transaction
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, payment.orderId));

    for (const item of items) {
      const [updatedProduct] = await transaction
        .update(products)
        .set({
          quantity: sql`${products.quantity} - ${item.quantity}`,
          reservedQuantity: sql`${products.reservedQuantity} - ${item.quantity}`,
          status: sql`case
            when ${products.quantity} - ${item.quantity} = 0 then 'OUT_OF_STOCK'::product_status
            else ${products.status}
          end`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, item.productId),
            sql`${products.quantity} >= ${item.quantity}`,
            sql`${products.reservedQuantity} >= ${item.quantity}`,
          ),
        )
        .returning({
          quantityAfter: products.quantity,
          reservedAfter: products.reservedQuantity,
        });

      if (!updatedProduct) {
        throw new Error("Reserved inventory is no longer available for this verified payment.");
      }

      await transaction.insert(inventoryTransactions).values({
        metadata: {
          orderId: payment.orderId,
          paymentReference: reference,
        },
        productId: item.productId,
        quantityAfter: updatedProduct.quantityAfter,
        quantityBefore: updatedProduct.quantityAfter + item.quantity,
        quantityDelta: -item.quantity,
        reason: "Kora payment verified.",
        reservedAfter: updatedProduct.reservedAfter,
        reservedBefore: updatedProduct.reservedAfter + item.quantity,
        reservedDelta: -item.quantity,
        type: "SALE",
      });

      await transaction
        .insert(sellerLedgerEntries)
        .values({
          amountMinor: item.sellerEntitlementMinor,
          bucket: "HELD",
          direction: "CREDIT",
          entryType: "SALE_HELD",
          idempotencyKey: `sale-held:${item.id}`,
          metadata: { paymentReference: reference },
          orderId: payment.orderId,
          orderItemId: item.id,
          sellerId: item.sellerId,
        })
        .onConflictDoNothing({
          target: sellerLedgerEntries.idempotencyKey,
        });
    }

    await transaction
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.buyerId, order.buyerId),
          inArray(
            cartItems.productId,
            items.map((item) => item.productId),
          ),
        ),
      );

    const paidAt = new Date();

    await transaction
      .update(commercePayments)
      .set({
        failureCode: null,
        failureMessage: null,
        paidAt,
        providerPayload: { providerStatus: verification.providerStatus },
        status: "PAID",
        updatedAt: paidAt,
        verifiedAt: paidAt,
      })
      .where(eq(commercePayments.providerReference, reference));

    await transaction
      .update(orders)
      .set({
        paidAt,
        paymentStatus: "PAID",
        status: "PAID",
        updatedAt: paidAt,
      })
      .where(eq(orders.id, payment.orderId));

    return { orderId: payment.orderId, status: "PAID" as const };
  });
}

function getWebhookReference(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = record.data;

  if (!data || typeof data !== "object") return null;
  const reference = (data as Record<string, unknown>).reference;

  return typeof reference === "string" && reference.length > 0 ? reference : null;
}

export async function handleKoraWebhook(payload: unknown, signature: string | null) {
  if (!payload || typeof payload !== "object") {
    return { accepted: false, reason: "INVALID_PAYLOAD" as const };
  }

  const record = payload as Record<string, unknown>;

  if (!verifyKoraWebhookSignature(record.data, signature)) {
    return { accepted: false, reason: "INVALID_SIGNATURE" as const };
  }

  const payloadHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  const reference = getWebhookReference(payload);
  const eventType = typeof record.event === "string" ? record.event : null;
  const database = getDatabase();
  const [event] = await database
    .insert(commerceWebhookEvents)
    .values({
      eventType,
      payload,
      payloadHash,
      providerReference: reference,
    })
    .onConflictDoNothing({
      target: commerceWebhookEvents.payloadHash,
    })
    .returning({ id: commerceWebhookEvents.id });

  if (!event) {
    return { accepted: true, duplicate: true as const };
  }

  if (!reference) {
    await database
      .update(commerceWebhookEvents)
      .set({
        errorMessage: "Webhook did not contain a payment reference.",
        processedAt: new Date(),
        processingStatus: "IGNORED",
      })
      .where(eq(commerceWebhookEvents.id, event.id));

    return { accepted: true, ignored: true as const };
  }

  try {
    const result = await verifyAndFulfillKoraPayment(reference);

    await database
      .update(commerceWebhookEvents)
      .set({
        processedAt: new Date(),
        processingStatus: result.status === "NOT_FOUND" ? "IGNORED" : "PROCESSED",
      })
      .where(eq(commerceWebhookEvents.id, event.id));

    return { accepted: true, result };
  } catch (error) {
    await database
      .update(commerceWebhookEvents)
      .set({
        errorMessage:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown processing error.",
        processedAt: new Date(),
        processingStatus: "FAILED",
      })
      .where(eq(commerceWebhookEvents.id, event.id));

    throw error;
  }
}

export async function getBuyerOrders(buyerId: string) {
  const database = getDatabase();
  const orderRows = await database
    .select()
    .from(orders)
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt));

  if (!orderRows.length) return [];

  const items = await database
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((order) => order.id),
      ),
    )
    .orderBy(orderItems.createdAt);

  return orderRows.map((order) => ({
    ...order,
    items: items.filter((item) => item.orderId === order.id),
  }));
}

export async function getSellerOrders(sellerId: string) {
  const database = getDatabase();

  return database
    .select({
      createdAt: orders.createdAt,
      fulfillmentMethod: orders.fulfillmentMethod,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      paidAt: orders.paidAt,
      pickupCity: orderItems.pickupCity,
      pickupState: orderItems.pickupState,
      productName: orderItems.productName,
      productTotalMinor: orderItems.productTotalMinor,
      quantity: orderItems.quantity,
      sku: orderItems.sku,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.sellerId, sellerId), eq(orders.paymentStatus, "PAID")))
    .orderBy(desc(orders.createdAt));
}
