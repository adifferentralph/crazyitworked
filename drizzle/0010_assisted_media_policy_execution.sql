-- Storage RLS invokes this boolean helper as the authenticated caller. The helper
-- exposes no data and still enforces the dedicated permission internally.
GRANT EXECUTE ON FUNCTION public.inventory_staff_can_upload_product_media(text) TO authenticated;