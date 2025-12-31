-- ============================================
-- 완료 링크 삭제 SQL (간단 버전)
-- ============================================
-- 아래 링크를 삭제할 링크로 교체하고 실행하세요
-- 예: https://blog.naver.com/moon13544/224094490857

-- orders 테이블의 completedLink 삭제
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';

-- orders 테이블의 completedLink2 삭제 (내돈내산 리뷰용)
UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" = 'https://blog.naver.com/moon13544/224094490857';

-- experience_applications 테이블의 completedLink 삭제
UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';

