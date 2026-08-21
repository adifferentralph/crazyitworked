CREATE OR REPLACE FUNCTION public.seller_can_upload_product_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(object_name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id::text = (storage.foldername(object_name))[2]
        AND products.seller_id = (SELECT auth.uid())
        AND products.status IN ('DRAFT', 'NEEDS_CHANGES')
    );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.seller_can_upload_product_media(text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.seller_can_upload_product_media(text) TO authenticated;
--> statement-breakpoint
DROP POLICY IF EXISTS "product_media_insert_seller_original" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product_media_insert_seller_original"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media'
  AND public.seller_can_upload_product_media(name)
);