-- 플레이스 링크 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- placeLink 필드 추가 (TEXT)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "placeLink" TEXT;

-- 확인 메시지
SELECT '✅ users 테이블에 placeLink 필드가 추가되었습니다!' AS message;

