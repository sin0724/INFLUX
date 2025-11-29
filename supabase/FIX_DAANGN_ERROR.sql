-- ============================================
-- 🚨 당근마켓 신청 오류 수정
-- Supabase SQL Editor에서 이 SQL을 실행하세요
-- ============================================

-- orders 테이블의 taskType CHECK 제약조건에 'daangn' 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 확인 메시지
SELECT '✅ 당근마켓(daangn) taskType이 성공적으로 추가되었습니다!' AS message;

-- 현재 제약조건 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

