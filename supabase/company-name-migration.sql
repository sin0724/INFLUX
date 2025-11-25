-- 상호명 컬럼 추가 마이그레이션
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "companyName" TEXT;

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users("companyName");

