export type SellerActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  productId?: string;
  status: "idle" | "error" | "success";
};

export const initialSellerActionState: SellerActionState = { status: "idle" };
