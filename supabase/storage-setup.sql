-- Storage 버킷 생성 (Supabase Dashboard에서 수동으로 생성해야 함)
-- 버킷 이름: order-images
-- Public bucket: true

-- Storage 정책 설정
-- 인증된 사용자가 이미지를 업로드할 수 있도록 설정
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-images' AND
  auth.role() = 'authenticated'
);

-- 모든 사용자가 이미지를 읽을 수 있도록 설정 (Public bucket)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

-- 사용자가 자신이 업로드한 이미지만 삭제할 수 있도록 설정
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

