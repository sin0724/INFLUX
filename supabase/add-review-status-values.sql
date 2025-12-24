-- ============================================
-- 리뷰 워크플로우 상태 값 추가
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요
-- ============================================

-- orders 테이블의 status CHECK constraint에 리뷰 워크플로우 상태 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'working', 'done', 'draft_uploaded', 'revision_requested', 'draft_revised', 'published'));

-- 완료 메시지
SELECT '✅ 리뷰 워크플로우 상태 값이 추가되었습니다!' AS message;

