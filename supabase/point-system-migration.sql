-- 포인트 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블에 points 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. 포인트 충전 신청 테이블 생성
CREATE TABLE IF NOT EXISTS point_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientUsername" TEXT NOT NULL,
  "companyName" TEXT,
  points INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "adminId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "adminUsername" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "approvedAt" TIMESTAMP WITH TIME ZONE
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_point_charges_client_id ON point_charges("clientId");
CREATE INDEX IF NOT EXISTS idx_point_charges_status ON point_charges(status);
CREATE INDEX IF NOT EXISTS idx_point_charges_created_at ON point_charges("createdAt");
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points);

-- 4. updatedAt 자동 업데이트 트리거
CREATE TRIGGER update_point_charges_updated_at BEFORE UPDATE ON point_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 기존 사용자 포인트 기본값 설정
UPDATE users 
SET points = COALESCE(points, 0) 
WHERE points IS NULL;

