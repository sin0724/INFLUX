-- 내돈내산 리뷰 작업 타입 추가
-- Supabase SQL Editor에서 실행하세요

-- orders 테이블의 taskType CHECK 제약조건에 'myexpense' 추가
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn', 'myexpense'));

-- 확인 메시지
SELECT '✅ orders 테이블에 myexpense taskType이 추가되었습니다!' AS message;

-- 제약조건 확인
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
  AND conname = 'orders_taskType_check';


