-- ============================================
-- 관리자 시스템 개선 마이그레이션
-- 1. 최고관리자(superadmin) 역할 추가
-- 2. 관리자 활동 로그 테이블 생성
-- ============================================

-- ============================================
-- 1단계: users 테이블의 role CHECK 제약조건 수정
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

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "adminId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "adminUsername" TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create_user', 'update_user', 'delete_user', 'update_order_status', 'delete_order', etc.
  target_type TEXT, -- 'user', 'order', 'client', etc.
  "targetId" UUID, -- 대상의 ID
  details JSONB, -- 추가 정보 (변경 내용, 이전 값, 새 값 등)
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

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_admin_logs_updated_at ON admin_activity_logs;
CREATE TRIGGER update_admin_logs_updated_at BEFORE UPDATE ON admin_activity_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 정책
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 최고관리자는 모든 로그 조회 가능
DROP POLICY IF EXISTS "Superadmins can read all logs" ON admin_activity_logs;
CREATE POLICY "Superadmins can read all logs" ON admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()::text::uuid) 
      AND users.role = 'superadmin'
    )
  );

-- 모든 관리자는 자신의 로그 조회 가능
DROP POLICY IF EXISTS "Admins can read own logs" ON admin_activity_logs;
CREATE POLICY "Admins can read own logs" ON admin_activity_logs
  FOR SELECT USING (
    "adminId" = (SELECT auth.uid()::text::uuid)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()::text::uuid) 
      AND users.role = 'superadmin'
    )
  );

-- 서버 사이드에서만 로그 작성 가능 (RLS 우회)
DROP POLICY IF EXISTS "Service role can manage logs" ON admin_activity_logs;
CREATE POLICY "Service role can manage logs" ON admin_activity_logs
  FOR ALL USING (true);

-- ============================================
-- 3단계: 최고관리자 계정 생성 함수 (선택사항)
-- ============================================

-- 주석: 최고관리자 계정은 직접 INSERT로 생성하거나
-- 아래 SQL로 생성할 수 있습니다.

-- 최고관리자 계정 생성 (비밀번호: 1234)
-- 비밀번호 해시는 별도로 생성해야 합니다.

-- INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
-- VALUES (
--   'admin',
--   '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6', -- "1234"의 bcrypt 해시
--   'superadmin',
--   0,
--   0,
--   true
-- )
-- ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 완료!
-- ============================================
-- 이제 다음을 수행하세요:
-- 1. 최고관리자 계정 생성 (CREATE_SUPERADMIN.sql 참고)
-- 2. API 수정 (권한 체크, 로그 기록)
-- 3. UI 추가 (하위 관리자 관리, 로그 조회)

