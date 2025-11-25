-- 전체 마이그레이션 스크립트
-- 순서대로 실행해주세요

-- 1. quota 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;

-- 2. 계약기간 관련 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

-- 기존 데이터가 있는 경우, 기본값 설정
UPDATE users 
SET "isActive" = true 
WHERE "isActive" IS NULL;

UPDATE users 
SET quota = '{}'::jsonb 
WHERE quota IS NULL;

