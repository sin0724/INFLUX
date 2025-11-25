-- ============================================
-- 데이터베이스 초기화 및 슈퍼 어드민 생성
-- 모든 계정과 작업 데이터를 삭제하고 슈퍼 어드민만 생성
-- ============================================

-- ============================================
-- 1단계: 모든 데이터 삭제
-- ============================================

-- 관리자 활동 로그 삭제
TRUNCATE TABLE admin_activity_logs CASCADE;

-- 발주(orders) 삭제
TRUNCATE TABLE orders CASCADE;

-- 모든 사용자 삭제 (CASCADE로 관련 데이터 자동 삭제)
-- 주의: 이 명령은 모든 계정을 삭제합니다
DELETE FROM users;

-- ============================================
-- 2단계: role 제약조건 확인 및 수정 (필수!)
-- ============================================

-- 기존 CHECK 제약조건 삭제
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- 새로운 CHECK 제약조건 추가 (superadmin, admin, client 허용)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('superadmin', 'admin', 'client'));

-- ============================================
-- 3단계: 슈퍼 어드민 계정 생성
-- ============================================

-- 슈퍼 어드민 계정 생성
-- 아이디: admin
-- 비밀번호: 1234
-- 비밀번호 해시: $2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6

INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin',
  '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6',
  'superadmin',
  0,
  0,
  true
);

-- ============================================
-- 4단계: 확인
-- ============================================

-- 슈퍼 어드민 계정 확인
SELECT 
  username, 
  role, 
  "isActive", 
  "createdAt",
  "totalQuota",
  "remainingQuota"
FROM users 
WHERE username = 'admin' AND role = 'superadmin';

-- 전체 사용자 수 확인 (1개여야 함: admin만)
SELECT COUNT(*) as total_users FROM users;

-- 발주 수 확인 (0개여야 함)
SELECT COUNT(*) as total_orders FROM orders;

-- 활동 로그 수 확인 (0개여야 함)
SELECT COUNT(*) as total_logs FROM admin_activity_logs;

-- ============================================
-- 완료!
-- ============================================
-- 슈퍼 어드민 로그인 정보:
-- 아이디: admin
-- 비밀번호: 1234
-- ============================================

