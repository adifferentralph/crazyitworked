export type RfqActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  requestId?: string;
  status: "idle" | "error" | "success";
};

export const initialRfqActionState: RfqActionState = { status: "idle" };