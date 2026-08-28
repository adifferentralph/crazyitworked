CREATE OR REPLACE FUNCTION public.audit_product_fitment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_row record;
  seller_id_value uuid;
  vehicle_value jsonb := '{}'::jsonb;
  change_reason text := nullif(current_setting('app.fitment_change_reason', true), '');
BEGIN
  IF TG_OP = 'DELETE' THEN source_row := OLD; ELSE source_row := NEW; END IF;
  SELECT coalesce(
    (SELECT seller_id FROM public.products WHERE id = source_row.product_id),
    source_row.claimed_by_user_id
  ) INTO seller_id_value;
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'fitmentId', vf.id, 'make', vm.name, 'model', vmo.name, 'year', vy.year,
    'trim', vt.name, 'engine', e.name, 'transmission', tr.name, 'drivetrain', d.name
  )) INTO vehicle_value
  FROM public.vehicle_fitments vf
  JOIN public.vehicle_makes vm ON vm.id = vf.make_id
  JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
  JOIN public.vehicle_years vy ON vy.id = vf.year_id
  LEFT JOIN public.vehicle_trims vt ON vt.id = vf.trim_id
  LEFT JOIN public.engines e ON e.id = vf.engine_id
  LEFT JOIN public.transmissions tr ON tr.id = vf.transmission_id
  LEFT JOIN public.drivetrains d ON d.id = vf.drivetrain_id
  WHERE vf.id = source_row.fitment_id;

  INSERT INTO public.fitment_claim_history (
    product_id, fitment_id, seller_id, action, previous_evidence, new_evidence,
    previous_active, new_active, vehicle_snapshot, changed_by_user_id, reason, metadata
  ) VALUES (
    source_row.product_id,
    source_row.fitment_id,
    seller_id_value,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.evidence_type END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.evidence_type END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.is_active END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.is_active END,
    coalesce(vehicle_value, '{}'::jsonb),
    (SELECT auth.uid()),
    coalesce(change_reason, CASE WHEN TG_OP = 'INSERT' THEN 'Seller compatibility claim recorded' END),
    jsonb_build_object('notesChanged', CASE WHEN TG_OP = 'UPDATE' THEN NEW.notes IS DISTINCT FROM OLD.notes ELSE false END)
  );
  RETURN source_row;
END;
$$;