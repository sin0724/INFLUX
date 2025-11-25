-- 최고관리자 계정 생성 SQL
-- Supabase SQL Editor에서 실행하세요

-- 비밀번호: 1234
-- 생성된 해시: $2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6

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

-- 확인 쿼리
SELECT username, role, "isActive", "createdAt" 
FROM users 
WHERE username = 'admin' AND role = 'superadmin';

