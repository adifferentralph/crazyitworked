CREATE UNIQUE INDEX IF NOT EXISTS vehicle_fitments_base_configuration_unique
ON public.vehicle_fitments (make_id, model_id, year_id)
WHERE generation_id IS NULL
  AND trim_id IS NULL
  AND engine_id IS NULL
  AND transmission_id IS NULL
  AND drivetrain_id IS NULL;
