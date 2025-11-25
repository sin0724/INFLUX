-- Storage 정책 수정 (커스텀 인증 사용 시)
-- Service Role Key를 사용하므로 RLS를 우회할 수 있지만,
-- 더 안전하게 하기 위해 정책을 수정합니다.

-- 기존 정책 삭제 (에러가 나면 무시해도 됩니다)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- 모든 사용자가 읽을 수 있도록 (Public bucket)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

-- 서버에서 업로드할 수 있도록 (Service Role 사용)
-- RLS가 활성화되어 있어도 Service Role은 우회 가능
-- 하지만 안전을 위해 정책 추가
CREATE POLICY "Service role can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-images');

-- 삭제 정책 (선택사항)
CREATE POLICY "Service role can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-images');

