import {
  Armchair,
  BatteryCharging,
  CarFront,
  CircleDot,
  CircleGauge,
  Cog,
  Disc3,
  Fan,
  Fuel,
  MoveVertical,
  Package,
  PackageSearch,
  Settings2,
  Snowflake,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type CategoryIconKey =
  | "accessories"
  | "body"
  | "brakes"
  | "climate"
  | "cooling"
  | "electrical"
  | "engine"
  | "exhaust"
  | "fallback"
  | "fuel"
  | "interior"
  | "steering"
  | "suspension"
  | "transmission"
  | "wheels";

type CategoryIconDefinition = {
  icon: LucideIcon;
  key: CategoryIconKey;
  pattern: RegExp;
};

const categoryIconDefinitions: readonly CategoryIconDefinition[] = [
  { icon: Disc3, key: "brakes", pattern: /brake|caliper|rotor|disc/i },
  { icon: Cog, key: "engine", pattern: /engine|piston|timing/i },
  { icon: Settings2, key: "transmission", pattern: /transmission|gearbox|clutch/i },
  { icon: MoveVertical, key: "suspension", pattern: /suspension|shock|strut|bushing/i },
  { icon: BatteryCharging, key: "electrical", pattern: /electrical|battery|alternator|starter/i },
  { icon: CarFront, key: "body", pattern: /body|bumper|mirror|panel/i },
  { icon: Armchair, key: "interior", pattern: /interior|seat|console|trim/i },
  { icon: Fan, key: "cooling", pattern: /cooling|radiator|water pump|cooling fan/i },
  { icon: Fuel, key: "fuel", pattern: /fuel|injector/i },
  { icon: CircleGauge, key: "steering", pattern: /steering|tie rod/i },
  { icon: Wind, key: "exhaust", pattern: /exhaust|muffler|catalytic/i },
  { icon: Snowflake, key: "climate", pattern: /\bac\b|a\/c|heating|climate|compressor|condenser/i },
  { icon: CircleDot, key: "wheels", pattern: /wheel|tire|tyre|rim/i },
  { icon: Package, key: "accessories", pattern: /accessor|wiper|floor mat|cargo/i },
];

const fallbackDefinition: CategoryIconDefinition = {
  icon: PackageSearch,
  key: "fallback",
  pattern: /.*/,
};

export function getCategoryIconDefinition(label: string) {
  return (
    categoryIconDefinitions.find((definition) =>
      definition.pattern.test(label.trim()),
    ) ?? fallbackDefinition
  );
}

export function getCategoryIcon(label: string) {
  return getCategoryIconDefinition(label).icon;
}

export function getCategoryIconKey(label: string) {
  return getCategoryIconDefinition(label).key;
}
