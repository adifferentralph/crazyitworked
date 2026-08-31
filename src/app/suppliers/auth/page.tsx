import { redirect } from "next/navigation";

export default function LegacySupplierAuthPage() {
  redirect("/login?next=/seller/dashboard");
}
