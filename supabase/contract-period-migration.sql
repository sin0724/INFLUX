-- 계약기간 관리 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 계약기간 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

