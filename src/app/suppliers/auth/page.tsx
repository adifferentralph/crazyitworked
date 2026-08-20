import { redirect } from "next/navigation";

export default function LegacySupplierAuthPage() {
  redirect("/signup/seller");
}
