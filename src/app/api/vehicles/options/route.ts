import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value: string | null) {
  return value && uuidPattern.test(value) ? value : undefined;
}

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const fitmentId = uuid(parameters.get("fitmentId"));
  const makeId = uuid(parameters.get("makeId"));
  const modelId = uuid(parameters.get("modelId"));
  const yearId = uuid(parameters.get("yearId"));
  const supabase = await createClient();

  if (fitmentId) {
    const { data: fitment, error } = await supabase
      .from("vehicle_fitments")
      .select("id, make_id, model_id, year_id, trim_id, engine_id")
      .eq("id", fitmentId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ message: "Vehicle could not be loaded." }, { status: 500 });
    }
    if (!fitment) return NextResponse.json({ fitment: null });

    const [makeResult, modelResult, yearResult, trimResult, engineResult] =
      await Promise.all([
        supabase
          .from("vehicle_makes")
          .select("id, name, is_discontinued, origin_country")
          .eq("id", fitment.make_id)
          .single(),
        supabase
          .from("vehicle_models")
          .select("id, name")
          .eq("id", fitment.model_id)
          .single(),
        supabase
          .from("vehicle_years")
          .select("id, year")
          .eq("id", fitment.year_id)
          .single(),
        fitment.trim_id
          ? supabase.from("vehicle_trims").select("id, name").eq("id", fitment.trim_id).single()
          : Promise.resolve({ data: null }),
        fitment.engine_id
          ? supabase.from("engines").select("id, name").eq("id", fitment.engine_id).single()
          : Promise.resolve({ data: null }),
      ]);
    if (!makeResult.data || !modelResult.data || !yearResult.data) {
      return NextResponse.json({ fitment: null });
    }

    const trim = trimResult.data?.name ?? null;
    const engine = engineResult.data?.name ?? null;
    return NextResponse.json({
      fitment: {
        engine,
        engineId: fitment.engine_id,
        id: fitment.id,
        label: [
          yearResult.data.year,
          makeResult.data.name,
          modelResult.data.name,
          trim,
          engine,
        ]
          .filter(Boolean)
          .join(" - "),
        make: makeResult.data.name,
        makeId: fitment.make_id,
        model: modelResult.data.name,
        modelId: fitment.model_id,
        trim,
        trimId: fitment.trim_id,
        year: yearResult.data.year,
        yearId: fitment.year_id,
      },
      make: {
        id: makeResult.data.id,
        isDiscontinued: makeResult.data.is_discontinued,
        label: makeResult.data.name,
        originCountry: makeResult.data.origin_country,
      },
    });
  }

  if (yearId) {
    const { data: fitments, error } = await supabase
      .from("vehicle_fitments")
      .select("id, make_id, model_id, year_id, trim_id, engine_id")
      .eq("year_id", yearId)
      .limit(200);
    if (error) {
      return NextResponse.json({ message: "Vehicle options could not be loaded." }, { status: 500 });
    }

    const rows = fitments ?? [];
    const trimIds = [...new Set(rows.flatMap((row) => (row.trim_id ? [row.trim_id] : [])))];
    const engineIds = [...new Set(rows.flatMap((row) => (row.engine_id ? [row.engine_id] : [])))];
    const [trimsResult, enginesResult] = await Promise.all([
      trimIds.length
        ? supabase.from("vehicle_trims").select("id, name").in("id", trimIds)
        : Promise.resolve({ data: [] }),
      engineIds.length
        ? supabase.from("engines").select("id, name").in("id", engineIds)
        : Promise.resolve({ data: [] }),
    ]);
    const trims = new Map((trimsResult.data ?? []).map((row) => [row.id, row.name]));
    const engines = new Map((enginesResult.data ?? []).map((row) => [row.id, row.name]));

    return NextResponse.json({
      fitments: rows.map((row) => ({
        engine: row.engine_id ? (engines.get(row.engine_id) ?? null) : null,
        engineId: row.engine_id,
        id: row.id,
        trim: row.trim_id ? (trims.get(row.trim_id) ?? null) : null,
        trimId: row.trim_id,
      })),
    });
  }

  if (modelId) {
    const { data, error } = await supabase
      .from("vehicle_years")
      .select("id, year")
      .eq("model_id", modelId)
      .order("year", { ascending: false })
      .limit(150);
    return error
      ? NextResponse.json({ message: "Vehicle years could not be loaded." }, { status: 500 })
      : NextResponse.json({ years: data ?? [] });
  }

  if (makeId) {
    const { data, error } = await supabase
      .from("vehicle_models")
      .select("id, name")
      .eq("make_id", makeId)
      .eq("is_active", true)
      .order("name")
      .limit(500);
    return error
      ? NextResponse.json({ message: "Vehicle models could not be loaded." }, { status: 500 })
      : NextResponse.json({ models: data ?? [] });
  }

  return NextResponse.json({ message: "Choose a vehicle make first." }, { status: 400 });
}
