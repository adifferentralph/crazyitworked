import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { now, requireRole, timestamps } from "./utils";

export const listYears = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("vehicleYears").collect();
    return [...new Set(rows.filter((row) => !row.deletedAt).map((row) => row.year))].sort(
      (a, b) => b - a,
    );
  },
});

export const listMakes = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.year) {
      return await ctx.db
        .query("vehicleMakes")
        .withIndex("by_name")
        .collect()
        .then((rows) => rows.filter((row) => !row.deletedAt));
    }

    const years = await ctx.db
      .query("vehicleYears")
      .withIndex("by_year", (query) => query.eq("year", args.year))
      .collect();
    const makeIds = [...new Set(years.filter((row) => !row.deletedAt).map((row) => row.makeId))];
    return await Promise.all(makeIds.map((id) => ctx.db.get(id))).then((rows) =>
      rows.filter(Boolean).filter((row) => !row.deletedAt),
    );
  },
});

export const listModels = query({
  args: { makeId: v.id("vehicleMakes"), year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.year) {
      return await ctx.db
        .query("vehicleModels")
        .withIndex("by_make", (query) => query.eq("makeId", args.makeId))
        .collect()
        .then((rows) => rows.filter((row) => !row.deletedAt));
    }

    const years = await ctx.db
      .query("vehicleYears")
      .withIndex("by_make_year", (query: any) =>
        query.eq("makeId", args.makeId).eq("year", args.year),
      )
      .collect();
    const modelIds = [...new Set(years.filter((row) => !row.deletedAt).map((row) => row.modelId))];
    return await Promise.all(modelIds.map((id) => ctx.db.get(id))).then((rows) =>
      rows.filter(Boolean).filter((row) => !row.deletedAt),
    );
  },
});

export const listVariants = query({
  args: { yearId: v.id("vehicleYears") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehicleVariants")
      .withIndex("by_year", (query) => query.eq("yearId", args.yearId))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const upsertMakeModelYear = mutation({
  args: {
    makeName: v.string(),
    makeSlug: v.string(),
    modelName: v.string(),
    modelSlug: v.string(),
    year: v.number(),
    variantName: v.optional(v.string()),
    engine: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "super_admin"]);
    const current = now();
    let make = await ctx.db
      .query("vehicleMakes")
      .withIndex("by_slug", (query) => query.eq("slug", args.makeSlug))
      .first();

    if (!make) {
      const makeId = await ctx.db.insert("vehicleMakes", {
        ...timestamps(),
        name: args.makeName,
        slug: args.makeSlug,
      });
      make = await ctx.db.get(makeId);
    }

    let model = await ctx.db
      .query("vehicleModels")
      .withIndex("by_make_slug", (query: any) =>
        query.eq("makeId", make._id).eq("slug", args.modelSlug),
      )
      .first();

    if (!model) {
      const modelId = await ctx.db.insert("vehicleModels", {
        ...timestamps(),
        makeId: make._id,
        name: args.modelName,
        slug: args.modelSlug,
      });
      model = await ctx.db.get(modelId);
    }

    let year = await ctx.db
      .query("vehicleYears")
      .withIndex("by_model_year", (query: any) =>
        query.eq("modelId", model._id).eq("year", args.year),
      )
      .first();

    if (!year) {
      const yearId = await ctx.db.insert("vehicleYears", {
        ...timestamps(),
        makeId: make._id,
        modelId: model._id,
        year: args.year,
      });
      year = await ctx.db.get(yearId);
    }

    if (args.variantName) {
      await ctx.db.insert("vehicleVariants", {
        createdAt: current,
        updatedAt: current,
        makeId: make._id,
        modelId: model._id,
        yearId: year._id,
        name: args.variantName,
        engine: args.engine,
      });
    }

    return { makeId: make._id, modelId: model._id, yearId: year._id };
  },
});
