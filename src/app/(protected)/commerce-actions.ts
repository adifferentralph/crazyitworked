"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

const productActionSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
});
const cartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(1000),
});

export async function addToCartAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/marketplace");
  const parsed = productActionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) redirect("/marketplace?cart=invalid");

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, quantity, reserved_quantity")
    .eq("id", parsed.data.productId)
    .eq("status", "APPROVED")
    .single();
  const available = product ? product.quantity - product.reserved_quantity : 0;
  if (!product || available < parsed.data.quantity) redirect("/marketplace?cart=unavailable");

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("buyer_id", principal.id)
    .eq("product_id", product.id)
    .maybeSingle();
  const nextQuantity = Math.min(available, (existing?.quantity ?? 0) + parsed.data.quantity);
  const { error } = await supabase.from("cart_items").upsert(
    {
      buyer_id: principal.id,
      product_id: product.id,
      quantity: nextQuantity,
    },
    { onConflict: "buyer_id,product_id" },
  );
  if (error) redirect("/marketplace?cart=error");
  revalidatePath("/cart");
  revalidatePath("/marketplace");
  redirect("/cart?message=added");
}

export async function updateCartItemAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/cart");
  const parsed = cartItemSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (parsed.data.quantity === 0) {
    await supabase.from("cart_items").delete().eq("id", parsed.data.cartItemId).eq("buyer_id", principal.id);
  } else {
    await supabase.from("cart_items").update({ quantity: parsed.data.quantity }).eq("id", parsed.data.cartItemId).eq("buyer_id", principal.id);
  }
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const nextData = new FormData();
  nextData.set("cartItemId", String(formData.get("cartItemId") ?? ""));
  nextData.set("quantity", "0");
  await updateCartItemAction(nextData);
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