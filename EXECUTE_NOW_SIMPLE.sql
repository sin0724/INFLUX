-- ============================================
-- 🚨 필수: 이 SQL을 Supabase에서 실행하세요!
-- ============================================
-- 
-- 실행 방법:
-- 1. Supabase 대시보드 접속 (https://supabase.com/dashboard)
-- 2. 프로젝트 선택
-- 3. 왼쪽 메뉴에서 "SQL Editor" 클릭
-- 4. "New query" 버튼 클릭
-- 5. 이 전체 파일을 복사하여 붙여넣기
-- 6. "Run" 버튼 클릭
--
-- ============================================

-- orders 테이블의 taskType CHECK 제약조건 업데이트
-- blog, receipt, daangn 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 성공 메시지
SELECT '✅ 성공! 모든 taskType이 추가되었습니다!' AS result;

-- 제약조건 확인
SELECT 
    '현재 제약조건' AS info,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

