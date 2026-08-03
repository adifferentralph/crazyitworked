"use client";

import { motion } from "framer-motion";

import { GlobalSearchBar } from "@/components/search/global-search-bar";
import { Badge } from "@/components/ui/badge";
import { VehicleFitmentFinder } from "@/components/vehicle/vehicle-fitment-finder";

export function MarketplaceHero() {
  return (
    <section className="relative min-h-[680px] overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-55"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1800&q=80)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
      <div className="container-page relative grid min-h-[680px] content-center gap-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl space-y-5"
        >
          <Badge variant="accent">Retail, wholesale, verified fitment</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            TorqueMart Automotive Parts Marketplace
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/86 sm:text-lg">
            Source compatible parts from approved vendors, negotiate directly, and route retail or
            bulk orders through a marketplace built for local pickup, delivery, and interstate
            shipping.
          </p>
        </motion.div>
        <div className="grid gap-3">
          <GlobalSearchBar />
          <VehicleFitmentFinder />
        </div>
      </div>
    </section>
  );
}
