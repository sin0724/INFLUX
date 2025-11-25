-- ============================================
-- users 테이블의 role 제약조건 수정
-- Supabase SQL Editor에서 이 SQL을 먼저 실행하세요!
-- ============================================

-- 1단계: 기존 CHECK 제약조건 삭제
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- 2단계: 새로운 CHECK 제약조건 추가 (superadmin, admin, client 허용)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('superadmin', 'admin', 'client'));

-- 3단계: 확인 쿼리
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- 완료! 이제 최고관리자 계정을 생성할 수 있습니다.

