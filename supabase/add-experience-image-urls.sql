-- 체험단 신청 테이블에 이미지 URL 배열 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- imageUrls 필드 추가 (TEXT 배열)
ALTER TABLE experience_applications 
ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[];

-- 인덱스 생성 (선택사항, 이미지 URL 검색이 필요한 경우)
CREATE INDEX IF NOT EXISTS idx_experience_applications_image_urls 
ON experience_applications USING GIN("imageUrls") 
WHERE "imageUrls" IS NOT NULL;

-- 확인 메시지
SELECT '✅ experience_applications 테이블에 imageUrls 필드가 추가되었습니다!' AS message;

