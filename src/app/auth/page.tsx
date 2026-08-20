import { redirect } from "next/navigation";

export default function LegacyAuthPage() {
  redirect("/signup/buyer");
}
