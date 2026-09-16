import { redirect } from "next/navigation";

import { getVendorAppUrl } from "@/config/env";

export default function SellerSignupPage() {
  redirect(new URL("/signup", getVendorAppUrl()).toString());
}