-- 작업 종류별 Quota 시스템으로 마이그레이션
-- 기존 totalQuota, remainingQuota를 JSON 형태의 quota 컬럼으로 변경

-- JSONB 타입의 quota 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;

-- 기존 데이터 마이그레이션 (필요시)
-- UPDATE users SET quota = jsonb_build_object(
--   'total', totalQuota,
--   'remaining', remainingQuota
-- ) WHERE quota = '{}'::jsonb AND totalQuota IS NOT NULL;

-- 새로운 quota 구조:
-- {
--   "follower": { "total": 1000, "remaining": 1000 },
--   "like": { "total": 1000, "remaining": 1000 },
--   "hotpost": { "total": 3, "remaining": 3 },
--   "momcafe": { "total": 3, "remaining": 3 }
-- }

-- 기존 컬럼은 유지하되 (하위 호환성) 새로운 quota 시스템 사용

