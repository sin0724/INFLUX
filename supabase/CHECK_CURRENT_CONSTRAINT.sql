-- ============================================
-- 현재 orders 테이블의 taskType 제약조건 확인
-- ============================================

-- 1. 현재 제약조건 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname LIKE '%taskType%';

-- 2. orders 테이블의 모든 taskType 값 확인
SELECT DISTINCT "taskType", COUNT(*) as count
FROM orders
GROUP BY "taskType"
ORDER BY "taskType";

-- 3. orders 테이블 스키마 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'taskType';

-- 4. 모든 제약조건 확인
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass;

