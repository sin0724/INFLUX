-- 당근마켓(daangn) taskType 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. orders 테이블의 taskType CHECK 제약조건에 'daangn' 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 확인 메시지
SELECT 'orders 테이블에 daangn taskType이 성공적으로 추가되었습니다.' AS message;

