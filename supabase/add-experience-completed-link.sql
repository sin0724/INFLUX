-- 체험단 완료 링크 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. completedLink 필드 추가
ALTER TABLE experience_applications 
ADD COLUMN IF NOT EXISTS "completedLink" TEXT;

-- 2. status에 'completed' 추가
ALTER TABLE experience_applications 
DROP CONSTRAINT IF EXISTS experience_applications_status_check;

ALTER TABLE experience_applications 
ADD CONSTRAINT experience_applications_status_check 
CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed'));

-- 3. completedLink 인덱스 추가 (완료된 체험단 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_experience_applications_completed_link 
ON experience_applications("completedLink") 
WHERE "completedLink" IS NOT NULL;

-- 확인 메시지
SELECT '체험단 테이블에 completedLink 필드가 성공적으로 추가되었습니다.' AS message;

