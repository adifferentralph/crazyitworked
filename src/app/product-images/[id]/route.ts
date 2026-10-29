import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db/client";
import { productImages, products } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const [image] = await getDatabase()
    .select({ bucket: productImages.storageBucket, mimeType: productImages.mimeType, path: productImages.storagePath })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(and(eq(productImages.id, id), eq(productImages.isActive, true), eq(products.status, "APPROVED")))
    .limit(1);
  if (!image) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  const signed = await supabase.storage.from(image.bucket).createSignedUrl(image.path, 120);
  if (signed.error || !signed.data.signedUrl) return new NextResponse(null, { status: 404 });
  const upstream = await fetch(signed.data.signedUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "Content-Type": upstream.headers.get("content-type") ?? image.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}
