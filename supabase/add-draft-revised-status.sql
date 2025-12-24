-- ============================================
-- draft_revised 상태 추가 (원고 수정완료)
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요
-- ============================================

-- orders 테이블의 status CHECK constraint에 draft_revised 상태 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'working', 'done', 'draft_uploaded', 'revision_requested', 'draft_revised', 'published'));

-- 완료 메시지
SELECT '✅ draft_revised 상태가 추가되었습니다!' AS message;

