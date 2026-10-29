"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import { createVerifiedProductReview } from "@/lib/reviews/data";

const reviewSchema = z.object({
  body: z.string().trim().max(2000).transform((value) => value || null),
  orderItemId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  reviewerName: z.string().trim().min(2).max(80),
  title: z.string().trim().max(120).transform((value) => value || null),
});

export async function submitProductReviewAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/reviews");
  const parsed = reviewSchema.safeParse({
    body: formData.get("body") ?? "",
    orderItemId: formData.get("orderItemId"),
    rating: formData.get("rating"),
    reviewerName: formData.get("reviewerName"),
    title: formData.get("title") ?? "",
  });
  if (!parsed.success) redirect("/account/reviews?error=Check+your+review+and+try+again.");
  try {
    const product = await createVerifiedProductReview({ ...parsed.data, buyerId: principal.id });
    revalidatePath("/account/reviews");
    revalidatePath(`/parts/${product.productSlug}`);
  } catch (error) {
    if (error instanceof Error && (error.message === "REVIEW_NOT_ELIGIBLE" || error.message.includes("product_reviews_order_item_unique"))) {
      redirect("/account/reviews?error=This+purchase+cannot+be+reviewed+or+already+has+a+review.");
    }
    throw error;
  }
  redirect("/account/reviews?message=Review+published.");
}
