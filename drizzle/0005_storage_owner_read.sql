DROP POLICY IF EXISTS "product_media_select_permitted" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "product_media_select_owner"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-media'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);
--> statement-breakpoint
CREATE POLICY "product_media_select_approved"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-media'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.product_images
      JOIN public.products ON products.id = product_images.product_id
      WHERE product_images.storage_path = storage.objects.name
        AND product_images.is_active = true
        AND products.status = 'APPROVED'
    )
  )
);