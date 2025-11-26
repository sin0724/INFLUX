-- 광고주 추가 필드 마이그레이션
-- 비고, 네이버 아이디/비밀번호, 업종 컬럼 추가

-- 비고 (특이사항)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 네이버 아이디
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "naverId" TEXT;

-- 네이버 비밀번호
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "naverPassword" TEXT;

-- 업종
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "businessType" TEXT;

-- 업종 인덱스 생성 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_business_type ON users("businessType");

-- 기존 데이터가 있는 경우 기본값 설정
UPDATE users 
SET notes = NULL 
WHERE notes IS NULL;

UPDATE users 
SET "naverId" = NULL 
WHERE "naverId" IS NULL;

UPDATE users 
SET "naverPassword" = NULL 
WHERE "naverPassword" IS NULL;

UPDATE users 
SET "businessType" = NULL 
WHERE "businessType" IS NULL;
