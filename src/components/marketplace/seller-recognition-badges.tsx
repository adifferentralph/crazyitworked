import { Award, ShieldCheck } from "lucide-react";

import type { PublicSellerRecognition } from "@/lib/trust/public";

export function SellerRecognitionBadges({ recognition }: { recognition: PublicSellerRecognition }) {
  if (!recognition.verifiedSeller && !recognition.foundingTwenty) return null;

  return (
    <div aria-label="Merchant recognition" className="mt-2 flex flex-wrap gap-1.5">
      {recognition.verifiedSeller ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800"
          title="Business identity independently checked by Twenty-Two Parts."
        >
          <ShieldCheck aria-hidden="true" className="size-3" />
          Verified Seller
        </span>
      ) : null}
      {recognition.foundingTwenty ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900"
          title="One of the first 20 merchants to join Twenty-Two Parts."
        >
          <Award aria-hidden="true" className="size-3" />
          Founding 20
        </span>
      ) : null}
    </div>
  );
}
