-- 빠른 마이그레이션: 필수 컬럼만 추가
-- Supabase SQL Editor에서 이 파일 전체를 복사해서 실행하세요

-- 1. quota 컬럼 추가 (JSONB 타입)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;

-- 2. 계약기간 관련 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

-- 4. 기존 데이터 기본값 설정
UPDATE users 
SET "isActive" = COALESCE("isActive", true) 
WHERE "isActive" IS NULL;

UPDATE users 
SET quota = COALESCE(quota, '{}'::jsonb) 
WHERE quota IS NULL;

-- 확인 쿼리 (실행 후 이 쿼리로 확인)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('quota', 'contractStartDate', 'contractEndDate', 'isActive')
ORDER BY column_name;

