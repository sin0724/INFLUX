-- 관리자 계정 생성 SQL
-- Supabase SQL Editor에서 이 SQL을 실행하세요

-- 비밀번호: 1234
-- 생성된 해시: $2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6

INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin1',
  '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6',
  'admin',
  0,
  0,
  true
)
ON CONFLICT (username) DO NOTHING;

-- 확인 쿼리
SELECT username, role, "isActive", "createdAt" FROM users WHERE username = 'admin1';

