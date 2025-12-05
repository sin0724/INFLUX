-- 내돈내산 리뷰어 이름 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- reviewerName 필드 추가 (TEXT)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "reviewerName" TEXT;

-- 확인 메시지
SELECT '✅ orders 테이블에 reviewerName 필드가 추가되었습니다!' AS message;

