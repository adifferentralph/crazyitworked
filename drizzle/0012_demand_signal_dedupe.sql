CREATE UNIQUE INDEX demand_events_session_signal_unique
ON public.demand_events (
  anonymous_session_hash,
  event_type,
  coalesce(query, ''),
  coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(fitment_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(location, ''),
  coalesce(result_count, -1)
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.record_demand_event(
  p_event_type public.demand_event_type,
  p_event_token uuid,
  p_session_id uuid,
  p_query text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_fitment_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_result_count integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  buyer_type_value text := 'GUEST';
  make_value text;
  model_value text;
  year_value integer;
BEGIN
  IF p_event_type NOT IN ('ZERO_RESULT_SEARCH', 'ABANDONED_FILTERED_SEARCH') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'This demand event cannot be client-recorded';
  END IF;
  IF p_event_token IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Demand event identifiers are required';
  END IF;
  IF (p_event_type = 'ZERO_RESULT_SEARCH' AND coalesce(p_result_count, -1) <> 0)
    OR (p_event_type = 'ABANDONED_FILTERED_SEARCH' AND coalesce(p_result_count, 0) < 1) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Demand event result count is invalid';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.product_categories WHERE id = p_category_id AND is_active
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Demand category was not found';
  END IF;

  IF actor_id IS NOT NULL THEN
    SELECT account_type::text INTO buyer_type_value
    FROM public.buyer_profiles WHERE user_id = actor_id;
    buyer_type_value := coalesce(buyer_type_value, 'AUTHENTICATED_NON_BUYER');
  END IF;

  IF p_fitment_id IS NOT NULL THEN
    SELECT vm.name, vmo.name, vy.year
    INTO make_value, model_value, year_value
    FROM public.vehicle_fitments vf
    JOIN public.vehicle_makes vm ON vm.id = vf.make_id
    JOIN public.vehicle_models vmo ON vmo.id = vf.model_id
    JOIN public.vehicle_years vy ON vy.id = vf.year_id
    WHERE vf.id = p_fitment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Demand vehicle was not found';
    END IF;
  END IF;

  INSERT INTO public.demand_events (
    event_type, event_token, anonymous_session_hash, buyer_id, buyer_account_type,
    category_id, fitment_id, query, location, vehicle_make, vehicle_model,
    vehicle_year, result_count, metadata
  ) VALUES (
    p_event_type, p_event_token, md5(p_session_id::text),
    CASE WHEN EXISTS (SELECT 1 FROM public.buyer_profiles WHERE user_id = actor_id) THEN actor_id END,
    buyer_type_value, p_category_id, p_fitment_id,
    nullif(left(btrim(coalesce(p_query, '')), 160), ''),
    nullif(left(btrim(coalesce(p_location, '')), 120), ''),
    make_value, model_value, year_value, p_result_count,
    jsonb_build_object('privacy', 'aggregate_only')
  ) ON CONFLICT DO NOTHING;
END;
$$;