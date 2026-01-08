-- ============================================
-- 완료 링크 삭제 SQL (통합 버전)
-- ============================================
-- ⭐ 중요: 아래 링크를 한 곳만 수정하고 나머지 두 곳에 복사하세요!
-- 
-- [자동으로 체크하는 곳]
-- 1. orders.completedLink (일반 완료 링크)
-- 2. orders.completedLink2 (내돈내산 리뷰의 블로그 리뷰 링크)
-- 3. experience_applications.completedLink (체험단 완료 링크)

-- ⭐ 삭제할 링크 (여기만 수정하고 아래로 복사하세요!)
-- ============================================
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';

-- ⬇️ 위의 링크를 복사해서 아래 두 곳에 붙여넣으세요
UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" = 'https://blog.naver.com/moon13544/224094490857';

UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" = 'https://blog.naver.com/moon13544/224094490857';

