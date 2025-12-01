-- ============================================
-- 🔍 문제 진단 SQL
-- 이 SQL을 먼저 실행하여 현재 상태를 확인하세요
-- ============================================

-- 1. orders 테이블의 모든 제약조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition,
    convalidated AS is_valid
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
ORDER BY contype, conname;

-- 2. taskType 관련 제약조건만 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass 
AND (
    conname LIKE '%taskType%' 
    OR pg_get_constraintdef(oid) LIKE '%taskType%'
    OR pg_get_constraintdef(oid) LIKE '%task%'
);

-- 3. orders 테이블의 taskType 컬럼 정보
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'taskType';

-- 4. 현재 orders 테이블에 있는 모든 taskType 값 확인
SELECT 
    "taskType",
    COUNT(*) as count
FROM orders
GROUP BY "taskType"
ORDER BY "taskType";

-- 5. 최근 생성된 orders 확인
SELECT 
    id,
    "taskType",
    status,
    "createdAt"
FROM orders
ORDER BY "createdAt" DESC
LIMIT 10;

