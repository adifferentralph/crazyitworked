import type { Sql } from "postgres";

const categoryDefinitions = [
  ["Engine", "engine", ["Oil Filters", "Engine Mounts", "Timing Components"]],
  ["Transmission", "transmission", ["Clutch Kits", "Transmission Filters"]],
  ["Brakes", "brakes", ["Brake Pads", "Brake Discs", "Brake Calipers", "Brake Shoes"]],
  ["Suspension", "suspension", ["Control Arms", "Shock Absorbers", "Bushings"]],
  ["Electrical", "electrical", ["Alternators", "Starters", "Lighting"]],
  ["Body", "body", ["Bumpers", "Headlights", "Mirrors"]],
  ["Interior", "interior", ["Switches", "Trim Panels", "Seat Components"]],
  ["Cooling", "cooling", ["Radiators", "Water Pumps", "Cooling Fans"]],
  ["Fuel System", "fuel-system", ["Fuel Pumps", "Injectors", "Fuel Filters"]],
  ["Steering", "steering", ["Steering Racks", "Tie Rods", "Power Steering Pumps"]],
  ["Exhaust", "exhaust", ["Catalytic Converters", "Mufflers", "Oxygen Sensors"]],
  ["AC / Heating", "ac-heating", ["Compressors", "Condensers", "Blower Motors"]],
  ["Wheels / Tires", "wheels-tires", ["Wheels", "Wheel Bearings", "Tire Sensors"]],
  ["Accessories", "accessories", ["Floor Mats", "Wiper Blades", "Cargo Accessories"]],
] as const;

const vehicleDefinitions = [
  {
    make: "Toyota",
    makeSlug: "toyota",
    model: "Camry",
    modelSlug: "camry",
    generation: "XV70",
    startYear: 2018,
    endYear: 2024,
    year: 2018,
    trim: "XLE",
    engine: "2.5L petrol",
    engineCode: "A25A-FKS",
    displacementCc: 2487,
    transmissionCode: "8AT",
    transmissionName: "8-speed automatic",
    drivetrainCode: "FWD",
    drivetrainName: "Front-wheel drive",
  },
  {
    make: "Toyota",
    makeSlug: "toyota",
    model: "Corolla",
    modelSlug: "corolla",
    generation: "E170",
    startYear: 2013,
    endYear: 2019,
    year: 2015,
    trim: "LE",
    engine: "1.8L petrol",
    engineCode: "2ZR-FE",
    displacementCc: 1798,
    transmissionCode: "CVT",
    transmissionName: "Continuously variable transmission",
    drivetrainCode: "FWD",
    drivetrainName: "Front-wheel drive",
  },
  {
    make: "Toyota",
    makeSlug: "toyota",
    model: "Highlander",
    modelSlug: "highlander",
    generation: "XU50",
    startYear: 2014,
    endYear: 2019,
    year: 2019,
    trim: "XLE",
    engine: "3.5L V6 petrol",
    engineCode: "2GR-FKS",
    displacementCc: 3456,
    transmissionCode: "8AT",
    transmissionName: "8-speed automatic",
    drivetrainCode: "AWD",
    drivetrainName: "All-wheel drive",
  },
  {
    make: "Toyota",
    makeSlug: "toyota",
    model: "RAV4",
    modelSlug: "rav4",
    generation: "XA50",
    startYear: 2019,
    endYear: null,
    year: 2020,
    trim: "XLE",
    engine: "2.5L petrol",
    engineCode: "A25A-FKS",
    displacementCc: 2487,
    transmissionCode: "8AT",
    transmissionName: "8-speed automatic",
    drivetrainCode: "AWD",
    drivetrainName: "All-wheel drive",
  },
  {
    make: "Honda",
    makeSlug: "honda",
    model: "Accord",
    modelSlug: "accord",
    generation: "CV1",
    startYear: 2018,
    endYear: 2022,
    year: 2018,
    trim: "EX-L",
    engine: "1.5L turbo petrol",
    engineCode: "L15BE",
    displacementCc: 1498,
    transmissionCode: "CVT",
    transmissionName: "Continuously variable transmission",
    drivetrainCode: "FWD",
    drivetrainName: "Front-wheel drive",
  },
  {
    make: "Lexus",
    makeSlug: "lexus",
    model: "RX",
    modelSlug: "rx",
    generation: "AL20",
    startYear: 2016,
    endYear: 2022,
    year: 2019,
    trim: "RX 350",
    engine: "3.5L V6 petrol",
    engineCode: "2GR-FKS",
    displacementCc: 3456,
    transmissionCode: "8AT",
    transmissionName: "8-speed automatic",
    drivetrainCode: "AWD",
    drivetrainName: "All-wheel drive",
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function seedMarketplace(client: Sql) {
  await client.begin(async (transaction) => {
    for (const [position, [name, slug, children]] of categoryDefinitions.entries()) {
      const [parent] = await transaction<{ id: string }[]>`
        insert into public.product_categories (name, slug, position, description)
        values (${name}, ${slug}, ${position}, ${`${name} parts and related components`})
        on conflict (slug) do update
        set name = excluded.name,
            position = excluded.position,
            description = excluded.description,
            is_active = true
        returning id
      `;

      if (!parent) throw new Error(`Could not seed category: ${name}`);

      for (const [childPosition, childName] of children.entries()) {
        const childSlug = `${slug}-${slugify(childName)}`;
        await transaction`
          insert into public.product_categories (parent_id, name, slug, position)
          values (${parent.id}::uuid, ${childName}, ${childSlug}, ${childPosition})
          on conflict (slug) do update
          set parent_id = excluded.parent_id,
              name = excluded.name,
              position = excluded.position,
              is_active = true
        `;
      }
    }

    for (const definition of vehicleDefinitions) {
      const [make] = await transaction<{ id: string }[]>`
        insert into public.vehicle_makes (name, slug)
        values (${definition.make}, ${definition.makeSlug})
        on conflict (slug) do update set name = excluded.name, is_active = true
        returning id
      `;
      if (!make) throw new Error(`Could not seed make: ${definition.make}`);

      const [model] = await transaction<{ id: string }[]>`
        insert into public.vehicle_models (make_id, name, slug)
        values (${make.id}::uuid, ${definition.model}, ${definition.modelSlug})
        on conflict (make_id, slug) do update set name = excluded.name, is_active = true
        returning id
      `;
      if (!model) throw new Error(`Could not seed model: ${definition.model}`);

      let [generation] = await transaction<{ id: string }[]>`
        select id from public.vehicle_generations
        where model_id = ${model.id}::uuid and lower(name) = lower(${definition.generation})
      `;
      generation ??= (
        await transaction<{ id: string }[]>`
          insert into public.vehicle_generations (model_id, name, start_year, end_year)
          values (
            ${model.id}::uuid,
            ${definition.generation},
            ${definition.startYear},
            ${definition.endYear}
          )
          returning id
        `
      )[0];
      if (!generation) throw new Error(`Could not seed generation: ${definition.generation}`);

      const [year] = await transaction<{ id: string }[]>`
        insert into public.vehicle_years (model_id, generation_id, year)
        values (${model.id}::uuid, ${generation.id}::uuid, ${definition.year})
        on conflict (model_id, year) do update set generation_id = excluded.generation_id
        returning id
      `;
      if (!year) throw new Error(`Could not seed vehicle year: ${definition.year}`);

      let [trim] = await transaction<{ id: string }[]>`
        select id from public.vehicle_trims
        where model_id = ${model.id}::uuid
          and generation_id = ${generation.id}::uuid
          and lower(name) = lower(${definition.trim})
      `;
      trim ??= (
        await transaction<{ id: string }[]>`
          insert into public.vehicle_trims (model_id, generation_id, name)
          values (${model.id}::uuid, ${generation.id}::uuid, ${definition.trim})
          returning id
        `
      )[0];
      if (!trim) throw new Error(`Could not seed trim: ${definition.trim}`);

      const [engine] = await transaction<{ id: string }[]>`
        insert into public.engines (code, name, fuel_type, displacement_cc)
        values (
          ${definition.engineCode},
          ${definition.engine},
          'Petrol',
          ${definition.displacementCc}
        )
        on conflict (lower(name), code) do update
        set fuel_type = excluded.fuel_type, displacement_cc = excluded.displacement_cc
        returning id
      `;
      if (!engine) throw new Error(`Could not seed engine: ${definition.engine}`);

      const [transmission] = await transaction<{ id: string }[]>`
        insert into public.transmissions (code, name)
        values (${definition.transmissionCode}, ${definition.transmissionName})
        on conflict (code) do update set name = excluded.name
        returning id
      `;
      if (!transmission) throw new Error(`Could not seed transmission`);

      const [drivetrain] = await transaction<{ id: string }[]>`
        insert into public.drivetrains (code, name)
        values (${definition.drivetrainCode}, ${definition.drivetrainName})
        on conflict (code) do update set name = excluded.name
        returning id
      `;
      if (!drivetrain) throw new Error(`Could not seed drivetrain`);

      await transaction`
        insert into public.vehicle_fitments (
          make_id,
          model_id,
          generation_id,
          year_id,
          trim_id,
          engine_id,
          transmission_id,
          drivetrain_id
        )
        values (
          ${make.id}::uuid,
          ${model.id}::uuid,
          ${generation.id}::uuid,
          ${year.id}::uuid,
          ${trim.id}::uuid,
          ${engine.id}::uuid,
          ${transmission.id}::uuid,
          ${drivetrain.id}::uuid
        )
        on conflict do nothing
      `;
    }
  });
}
