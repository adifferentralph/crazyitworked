import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createR2Upload } from "@/lib/storage/r2";
import { jsonError, requireSameOrigin } from "@/lib/security/http";
import { uploadRequestSchema } from "@/lib/validation/marketplace";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { userId } = await auth();

    if (!userId) {
      return jsonError("Authentication is required.", 401);
    }

    const body = uploadRequestSchema.parse(await request.json());
    const upload = await createR2Upload({ ...body, userId });

    return NextResponse.json(upload);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Invalid upload request.", 422, error.flatten());
    }

    return jsonError(error instanceof Error ? error.message : "Upload signing failed.", 500);
  }
}
