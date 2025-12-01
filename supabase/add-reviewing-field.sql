-- 검수중 필드 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 검수중 필드 (boolean)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reviewing BOOLEAN DEFAULT false;

-- 인덱스 생성 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_reviewing ON users(reviewing);

-- 기존 데이터 기본값 설정
UPDATE users 
SET reviewing = false 
WHERE reviewing IS NULL;

-- 확인 메시지
SELECT '✅ users 테이블에 reviewing 필드가 추가되었습니다!' AS message;

