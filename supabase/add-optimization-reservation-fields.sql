-- 최적화/예약 필드 추가 마이그레이션

-- 최적화 필드 (boolean)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS optimization BOOLEAN DEFAULT false;

-- 예약 필드 (boolean)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reservation BOOLEAN DEFAULT false;

-- 인덱스 생성 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_optimization ON users(optimization);
CREATE INDEX IF NOT EXISTS idx_users_reservation ON users(reservation);

-- 기존 데이터 기본값 설정
UPDATE users 
SET optimization = false 
WHERE optimization IS NULL;

UPDATE users 
SET reservation = false 
WHERE reservation IS NULL;
