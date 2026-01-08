-- ============================================
-- 여러 완료 링크 일괄 삭제 SQL (통합 버전)
-- ============================================
-- ⭐ 중요: 아래 링크 목록을 첫 번째 UPDATE 문에만 수정하고, 
-- 나머지 두 곳에는 복사해서 붙여넣으세요!
-- 
-- [자동으로 체크하는 곳]
-- 1. orders.completedLink (일반 완료 링크)
-- 2. orders.completedLink2 (내돈내산 리뷰의 블로그 리뷰 링크)
-- 3. experience_applications.completedLink (체험단 완료 링크)

-- ============================================
-- ⭐ 삭제할 링크 목록 (여기만 수정하고 아래로 복사하세요!)
-- ============================================
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 여기에 더 많은 링크를 추가하세요 (쉼표로 구분)
);

-- ⬇️ 위의 IN (...) 안의 링크 목록을 복사해서 아래 두 곳에 붙여넣으세요
UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 위에서 복사한 링크 목록을 여기에 붙여넣으세요
);

UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 위에서 복사한 링크 목록을 여기에 붙여넣으세요
);

