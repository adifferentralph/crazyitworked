import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const demandSignalSchema = z.object({
  categoryId: z.string().uuid().optional(),
  eventToken: z.string().uuid(),
  eventType: z.enum(["ZERO_RESULT_SEARCH", "ABANDONED_FILTERED_SEARCH"]),
  fitmentId: z.string().uuid().optional(),
  location: z.string().trim().max(120).optional(),
  query: z.string().trim().max(160).optional(),
  resultCount: z.number().int().nonnegative(),
  sessionId: z.string().uuid(),
}).superRefine((value, context) => {
  if (value.eventType === "ZERO_RESULT_SEARCH" && value.resultCount !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Zero-result demand must have zero results." });
  }
  if (value.eventType === "ABANDONED_FILTERED_SEARCH" && value.resultCount < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Abandoned search demand requires results." });
  }
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = demandSignalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid demand signal." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_demand_event", {
    p_category_id: parsed.data.categoryId ?? null,
    p_event_token: parsed.data.eventToken,
    p_event_type: parsed.data.eventType,
    p_fitment_id: parsed.data.fitmentId ?? null,
    p_location: parsed.data.location ?? null,
    p_query: parsed.data.query ?? null,
    p_result_count: parsed.data.resultCount,
    p_session_id: parsed.data.sessionId,
  });
  if (error) return NextResponse.json({ error: "Demand signal was not recorded." }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}