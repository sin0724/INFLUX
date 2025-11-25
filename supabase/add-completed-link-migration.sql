-- ============================================
-- 완료 링크 필드 추가 마이그레이션
-- ============================================

-- orders 테이블에 completedLink 필드 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "completedLink" TEXT;

-- 인덱스 추가 (완료된 주문 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_completed_link ON orders("completedLink") WHERE "completedLink" IS NOT NULL;

