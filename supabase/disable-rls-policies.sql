-- RLS 정책 비활성화 (API 레벨 권한 체크 사용)
-- 커스텀 인증 시스템을 사용하므로 RLS는 비활성화하고 API에서만 권한 체크

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_charges DISABLE ROW LEVEL SECURITY;

-- 체크리스트 테이블이 있다면
ALTER TABLE checklist_items DISABLE ROW LEVEL SECURITY;
