-- ============================================
-- 완전한 관리자 시스템 설정 SQL (수정 버전)
-- 순서대로 실행하세요!
-- ============================================

-- ============================================
-- 1단계: role 제약조건 수정 (필수!)
-- ============================================
-- 기존 CHECK 제약조건 삭제
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- 새로운 CHECK 제약조건 추가 (superadmin, admin, client 허용)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('superadmin', 'admin', 'client'));

-- ============================================
-- 2단계: 관리자 활동 로그 테이블 생성
-- ============================================

-- Enable UUID extension (이미 있다면 무시됨)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 관리자 활동 로그 테이블
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "adminId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "adminUsername" TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  "targetId" UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_activity_logs("adminId");
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_type ON admin_activity_logs(target_type);

-- updated_at 자동 업데이트 함수 (이미 있다면 무시됨)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_admin_logs_updated_at ON admin_activity_logs;
CREATE TRIGGER update_admin_logs_updated_at BEFORE UPDATE ON admin_activity_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 정책
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (서버 사이드 접근 허용)
DROP POLICY IF EXISTS "Service role can manage logs" ON admin_activity_logs;
CREATE POLICY "Service role can manage logs" ON admin_activity_logs
  FOR ALL USING (true);

-- ============================================
-- 3단계: 최고관리자 계정 생성
-- ============================================

-- 최고관리자 계정 생성 (비밀번호: 1234)
-- 해시: $2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6

INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin',
  '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6',
  'superadmin',
  0,
  0,
  true
)
ON CONFLICT (username) DO UPDATE
SET 
  role = 'superadmin',
  "isActive" = true,
  password = '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6';

-- ============================================
-- 4단계: 확인 쿼리
-- ============================================

-- 최고관리자 계정 확인
SELECT username, role, "isActive", "createdAt" 
FROM users 
WHERE username = 'admin' AND role = 'superadmin';

-- 제약조건 확인 (수정된 쿼리)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- 로그 테이블 확인
SELECT COUNT(*) as log_count FROM admin_activity_logs;

-- ============================================
-- 완료!
-- ============================================

