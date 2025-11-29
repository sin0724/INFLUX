-- ============================================
-- 🚨 최종 해결: taskType 제약조건 오류 수정
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1단계: 현재 제약조건 확인
-- ============================================
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass 
AND (conname LIKE '%taskType%' OR pg_get_constraintdef(oid) LIKE '%taskType%');

-- ============================================
-- 2단계: 모든 taskType 관련 제약조건 강제 삭제
-- ============================================
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 모든 taskType 관련 제약조건 찾아서 삭제
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass 
        AND (
            conname LIKE '%taskType%' 
            OR pg_get_constraintdef(oid) LIKE '%taskType%'
            OR pg_get_constraintdef(oid) LIKE '%task%Type%'
        )
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
        RAISE NOTICE '삭제된 제약조건: %', constraint_name;
    END LOOP;
END $$;

-- ============================================
-- 3단계: 새로운 제약조건 생성
-- ============================================
ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- ============================================
-- 4단계: 확인
-- ============================================
SELECT 
    '✅ 성공! 제약조건이 생성되었습니다!' AS result,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

-- 제약조건에 모든 값이 포함되어 있는지 확인
SELECT 
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%blog%' 
         AND pg_get_constraintdef(oid) LIKE '%receipt%' 
         AND pg_get_constraintdef(oid) LIKE '%daangn%' 
        THEN '✅ 모든 필수 taskType이 포함되어 있습니다!'
        ELSE '❌ 일부 taskType이 누락되었습니다. 위의 constraint_definition을 확인하세요.'
    END AS verification
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

