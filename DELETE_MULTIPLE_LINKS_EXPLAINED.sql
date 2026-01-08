-- ============================================
-- 여러 완료 링크 일괄 삭제 SQL (상세 설명 버전)
-- ============================================
-- 
-- [왜 여러 곳을 체크하나요?]
-- 
-- 1. orders.completedLink
--    - 일반 완료 링크 (인스타그램, 블로그, 영수증, 당근마켓 등 대부분의 작업)
--    - 내돈내산 리뷰의 경우: 예약자 리뷰 링크가 여기에 저장됨
--
-- 2. orders.completedLink2
--    - 내돈내산 리뷰 전용 두 번째 링크 (블로그 리뷰 링크)
--    - 내돈내산 리뷰만 이 필드를 사용함
--
-- 3. experience_applications.completedLink
--    - 체험단 완료 링크
--    - 체험단은 별도 테이블에 저장됨
--
-- 따라서 같은 링크가 세 곳 중 어디에 저장되어 있을지 모르기 때문에
-- 모든 곳을 체크해서 삭제하는 것이 안전합니다.
--
-- ============================================
-- 삭제할 링크 목록 (여기에 링크를 추가하세요)
-- ============================================

-- orders 테이블의 completedLink 삭제
UPDATE orders 
SET "completedLink" = NULL 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 여기에 더 많은 링크를 추가하세요
);

-- orders 테이블의 completedLink2 삭제 (내돈내산 리뷰용)
UPDATE orders 
SET "completedLink2" = NULL 
WHERE "completedLink2" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 여기에 더 많은 링크를 추가하세요
);

-- experience_applications 테이블의 completedLink 삭제
UPDATE experience_applications 
SET "completedLink" = NULL 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
  -- 여기에 더 많은 링크를 추가하세요
);

-- 삭제 결과 확인
SELECT 
    'orders.completedLink' AS 삭제된_필드,
    COUNT(*) AS 삭제된_개수
FROM orders 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
)
UNION ALL
SELECT 
    'orders.completedLink2' AS 삭제된_필드,
    COUNT(*) AS 삭제된_개수
FROM orders 
WHERE "completedLink2" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
)
UNION ALL
SELECT 
    'experience_applications.completedLink' AS 삭제된_필드,
    COUNT(*) AS 삭제된_개수
FROM experience_applications 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
);

