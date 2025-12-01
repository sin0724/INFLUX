-- ============================================
-- 🚨 강제로 모든 제약조건 제거 후 재생성
-- 이 SQL은 모든 제약조건을 확인하고 강제로 수정합니다
-- ============================================

-- 1단계: 현재 모든 taskType 관련 제약조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass 
AND (conname LIKE '%taskType%' OR pg_get_constraintdef(oid) LIKE '%taskType%');

-- 2단계: 모든 가능한 제약조건 이름으로 삭제 시도
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 모든 taskType 관련 제약조건 찾기
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass 
        AND (conname LIKE '%taskType%' OR pg_get_constraintdef(oid) LIKE '%taskType%')
    LOOP
        -- 제약조건 삭제
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
        RAISE NOTICE 'Deleted constraint: %', constraint_name;
    END LOOP;
END $$;

-- 3단계: CHECK 제약조건이 아닌 다른 방식의 제약조건도 확인 및 삭제
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    -- 모든 제약조건 검사
    FOR constraint_def IN 
        SELECT pg_get_constraintdef(oid)
        FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass
        AND contype = 'c'  -- CHECK constraint
        AND pg_get_constraintdef(oid) LIKE '%taskType%'
    LOOP
        RAISE NOTICE 'Found CHECK constraint: %', constraint_def;
    END LOOP;
END $$;

-- 4단계: 새로운 제약조건 생성 (모든 taskType 포함)
ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 5단계: 확인
SELECT 
    '✅ 제약조건이 성공적으로 생성되었습니다!' AS result,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

-- 6단계: 테스트 (실제로는 실행되지 않음, 주석 처리)
-- INSERT INTO orders ("clientId", "taskType", status) 
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'blog', 'pending');

