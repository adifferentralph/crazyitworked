import { NextResponse } from "next/server";

import { handleKoraWebhook } from "@/lib/commerce/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  try {
    const result = await handleKoraWebhook(
      payload,
      request.headers.get("x-korapay-signature"),
    );

    if (!result.accepted) {
      return NextResponse.json({ accepted: false }, { status: 401 });
    }

    return NextResponse.json({ accepted: true });
  } catch {
    // A non-2xx response asks Kora to retry. No provider payload or secret is logged.
    return NextResponse.json({ accepted: false }, { status: 500 });
  }
}
