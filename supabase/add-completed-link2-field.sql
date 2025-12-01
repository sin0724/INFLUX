-- 내돈내산 리뷰 완료링크 2개 입력을 위한 completedLink2 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- completedLink2 필드 추가 (TEXT)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "completedLink2" TEXT;

-- 확인 메시지
SELECT '✅ orders 테이블에 completedLink2 필드가 추가되었습니다!' AS message;

