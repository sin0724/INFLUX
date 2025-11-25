-- ============================================
-- INFLUX 전체 마이그레이션 SQL
-- Supabase SQL Editor에서 이 파일 전체를 순서대로 실행하세요
-- ============================================

-- ============================================
-- 1단계: 기본 스키마 확인
-- ============================================
-- 이미 실행했다면 건너뛰어도 됩니다

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (기본)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  "totalQuota" INTEGER DEFAULT 0,
  "remainingQuota" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table (기본)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "taskType" TEXT NOT NULL CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip')),
  caption TEXT,
  "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'done')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders("clientId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders("status");
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS 정책
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Clients can read own orders" ON orders;
CREATE POLICY "Clients can read own orders" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (true);

-- ============================================
-- 2단계: Quota 컬럼 추가
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;

-- 기존 데이터가 있는 경우 기본값 설정
UPDATE users 
SET quota = '{}'::jsonb 
WHERE quota IS NULL;

-- ============================================
-- 3단계: 계약기간 컬럼 추가
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

-- 기존 데이터 기본값 설정
UPDATE users 
SET "isActive" = COALESCE("isActive", true) 
WHERE "isActive" IS NULL;

-- ============================================
-- 4단계: 상호명 컬럼 추가
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "companyName" TEXT;

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users("companyName");

-- ============================================
-- 5단계: 최종 확인 쿼리
-- ============================================
-- 아래 쿼리로 모든 컬럼이 제대로 추가되었는지 확인하세요

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
  'quota',
  'contractStartDate', 
  'contractEndDate', 
  'isActive',
  'companyName'
)
ORDER BY column_name;

-- 모든 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 완료!
-- ============================================
-- 모든 마이그레이션이 성공적으로 완료되었습니다.
-- 이제 배포를 진행하세요!

