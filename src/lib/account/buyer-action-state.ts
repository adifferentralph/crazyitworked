export type BuyerActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialBuyerActionState: BuyerActionState = { status: "idle" };