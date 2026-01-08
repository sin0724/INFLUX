-- ============================================
-- 여러 완료 링크 일괄 삭제 SQL
-- ============================================
-- 사용법: 아래 링크 목록에 삭제할 링크들을 추가하세요
-- 여러 업체의 여러 링크를 한번에 삭제할 수 있습니다.

-- ============================================
-- 삭제할 링크 목록 (여기에 링크를 추가하세요)
-- ============================================
-- 예시:
-- 'https://blog.naver.com/moon13544/224094490857',
-- 'https://blog.naver.com/example1/123456789',
-- 'https://blog.naver.com/example2/987654321'

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

-- 삭제된 레코드 수 확인
SELECT 
    'orders completedLink' AS table_column,
    COUNT(*) AS deleted_count
FROM orders 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
)
UNION ALL
SELECT 
    'orders completedLink2' AS table_column,
    COUNT(*) AS deleted_count
FROM orders 
WHERE "completedLink2" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
)
UNION ALL
SELECT 
    'experience_applications completedLink' AS table_column,
    COUNT(*) AS deleted_count
FROM experience_applications 
WHERE "completedLink" IN (
  'https://blog.naver.com/moon13544/224094490857',
  'https://blog.naver.com/example1/123456789',
  'https://blog.naver.com/example2/987654321'
);

