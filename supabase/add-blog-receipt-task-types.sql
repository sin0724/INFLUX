-- 블로그 리뷰, 영수증 리뷰 taskType 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. orders 테이블의 taskType CHECK 제약조건에 'blog', 'receipt' 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt'));

-- 확인 메시지
SELECT 'orders 테이블에 blog, receipt taskType이 성공적으로 추가되었습니다.' AS message;

