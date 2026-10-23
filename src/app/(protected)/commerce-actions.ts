"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

const productActionSchema = z.object({
  productId: z.string().uuid(),
  operation: z.enum(["increment", "set"]).default("increment"),
  quantity: z.coerce.number().int().min(0).max(1000).default(1),
});
const cartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(1000),
});

export type CartMutationState = {
  message: string | null;
  quantity: number;
  status: "idle" | "success" | "error";
};

export async function addToCartAction(
  previousState: CartMutationState,
  formData: FormData,
): Promise<CartMutationState> {
  const principal = await requireRole(["BUYER"], "/marketplace");
  const parsed = productActionSchema.safeParse({
    operation: formData.get("operation") ?? "increment",
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return {
      message: "Choose a valid quantity and try again.",
      quantity: previousState.quantity,
      status: "error",
    };
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, quantity, reserved_quantity")
    .eq("id", parsed.data.productId)
    .eq("status", "APPROVED")
    .single();
  if (!product) {
    return {
      message: "This part is no longer available.",
      quantity: previousState.quantity,
      status: "error",
    };
  }
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("buyer_id", principal.id)
    .eq("product_id", product.id)
    .maybeSingle();
  const currentQuantity = existing?.quantity ?? 0;
  const available = product ? product.quantity - product.reserved_quantity : 0;
  const nextQuantity = parsed.data.operation === "increment"
    ? currentQuantity + Math.max(parsed.data.quantity, 1)
    : parsed.data.quantity;

  if (nextQuantity > available) {
    return {
      message: available > 0 ? `Only ${available} currently available.` : "This part is out of stock.",
      quantity: currentQuantity,
      status: "error",
    };
  }

  const { error } = nextQuantity === 0
    ? await supabase
        .from("cart_items")
        .delete()
        .eq("buyer_id", principal.id)
        .eq("product_id", product.id)
    : await supabase.from("cart_items").upsert(
        {
          buyer_id: principal.id,
          product_id: product.id,
          quantity: nextQuantity,
        },
        { onConflict: "buyer_id,product_id" },
      );
  if (error) {
    return {
      message: "We could not update your cart. Try again.",
      quantity: currentQuantity,
      status: "error",
    };
  }
  revalidatePath("/cart");
  revalidatePath("/marketplace");
  revalidatePath("/parts/[slug]", "page");
  return {
    message: nextQuantity === 0 ? "Removed from cart." : "Cart updated.",
    quantity: nextQuantity,
    status: "success",
  };
}

export async function updateCartItemAction(
  previousState: CartMutationState,
  formData: FormData,
): Promise<CartMutationState> {
  const principal = await requireRole(["BUYER"], "/cart");
  const parsed = cartItemSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return {
      message: "Choose a valid quantity and try again.",
      quantity: previousState.quantity,
      status: "error",
    };
  }
  const supabase = await createClient();
  const { data: cartItem } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity")
    .eq("id", parsed.data.cartItemId)
    .eq("buyer_id", principal.id)
    .maybeSingle();
  if (!cartItem) {
    return { message: "This cart item is no longer available.", quantity: 0, status: "error" };
  }

  if (parsed.data.quantity > 0) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity, reserved_quantity")
      .eq("id", cartItem.product_id)
      .eq("status", "APPROVED")
      .maybeSingle();
    const available = product ? product.quantity - product.reserved_quantity : 0;
    if (!product || parsed.data.quantity > available) {
      return {
        message: available > 0 ? `Only ${available} currently available.` : "This part is out of stock.",
        quantity: cartItem.quantity,
        status: "error",
      };
    }
  }

  const { error } = parsed.data.quantity === 0
    ? await supabase
        .from("cart_items")
        .delete()
        .eq("id", parsed.data.cartItemId)
        .eq("buyer_id", principal.id)
    : await supabase
        .from("cart_items")
        .update({ quantity: parsed.data.quantity })
        .eq("id", parsed.data.cartItemId)
        .eq("buyer_id", principal.id);
  if (error) {
    return {
      message: "We could not update your cart. Try again.",
      quantity: cartItem.quantity,
      status: "error",
    };
  }
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/marketplace");
  return {
    message: parsed.data.quantity === 0 ? "Removed from cart." : "Quantity saved.",
    quantity: parsed.data.quantity,
    status: "success",
  };
}

export async function removeCartItemAction(formData: FormData) {
  const nextData = new FormData();
  nextData.set("cartItemId", String(formData.get("cartItemId") ?? ""));
  nextData.set("quantity", "0");
  await updateCartItemAction(
    { message: null, quantity: 0, status: "idle" },
    nextData,
  );
}

export async function toggleSavedPartAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/marketplace");
  const parsed = productActionSchema.pick({ productId: true }).safeParse({ productId: formData.get("productId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_parts")
    .select("product_id")
    .eq("buyer_id", principal.id)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();
  if (existing) {
    await supabase.from("saved_parts").delete().eq("buyer_id", principal.id).eq("product_id", parsed.data.productId);
  } else {
    await supabase.from("saved_parts").insert({ buyer_id: principal.id, product_id: parsed.data.productId });
  }
  revalidatePath("/account/saved-parts");
}
