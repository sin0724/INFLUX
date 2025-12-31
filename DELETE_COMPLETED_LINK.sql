-- ============================================
-- 특정 완료 링크 삭제 SQL
-- ============================================
-- 사용법: 아래 'YOUR_LINK_HERE' 부분을 삭제할 링크로 교체하세요
-- 예: 'https://blog.naver.com/moon13544/224094490857'

-- 삭제할 링크 입력 (여기를 수정하세요)
-- ============================================
-- 링크를 여기에 입력하세요:
-- ============================================

-- 1. orders 테이블에서 completedLink 삭제
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" = 'YOUR_LINK_HERE';

-- 2. orders 테이블에서 completedLink2 삭제 (내돈내산 리뷰용)
UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" = 'YOUR_LINK_HERE';

-- 3. experience_applications 테이블에서 completedLink 삭제
UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" = 'YOUR_LINK_HERE';

-- 삭제된 레코드 수 확인
SELECT 
    (SELECT COUNT(*) FROM orders WHERE "completedLink" = 'YOUR_LINK_HERE' OR "completedLink2" = 'YOUR_LINK_HERE') AS remaining_orders,
    (SELECT COUNT(*) FROM experience_applications WHERE "completedLink" = 'YOUR_LINK_HERE') AS remaining_experiences;

-- ============================================
-- 실제 사용 예시 (주석 해제하고 링크만 수정하면 됩니다):
-- ============================================
/*
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';

UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" = 'https://blog.naver.com/moon13544/224094490857';

UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';
*/

