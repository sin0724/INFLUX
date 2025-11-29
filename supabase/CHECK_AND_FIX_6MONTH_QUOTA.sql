-- ============================================
-- 6개월 플랜 인스타그램 할당량 확인 및 수정
-- ============================================

-- 1. 현재 6개월 플랜 광고주의 인스타그램 할당량 확인
SELECT 
  id,
  username,
  "companyName",
  "contractStartDate",
  "contractEndDate",
  EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 as months,
  quota->'follower' as follower_quota,
  quota->'like' as like_quota,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_instagram_remaining,
  (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) as total_instagram_total
FROM users
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND quota IS NOT NULL
ORDER BY "createdAt" DESC;

-- 2. 6개월 플랜으로 추정되는 모든 광고주의 인스타그램 할당량을 2000개로 업데이트
-- (계약 기간이 5.5개월 이상 6.5개월 이하인 경우)
UPDATE users
SET quota = jsonb_set(
  jsonb_set(
    COALESCE(quota, '{}'::jsonb),
    '{follower}',
    jsonb_build_object(
      'total', 1000,
      'remaining', 1000
    )
  ),
  '{like}',
  jsonb_build_object(
    'total', 1000,
    'remaining', 1000
  )
)
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 BETWEEN 5.5 AND 6.5
  AND quota IS NOT NULL
  AND (
    -- 기존 total이 1000보다 작거나 같거나, 2500 이상인 경우 (잘못된 값)
    (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) <= 1000
    OR (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) >= 2500
  );

-- 3. 업데이트 후 확인
SELECT 
  id,
  username,
  "companyName",
  EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 as months,
  quota->'follower' as follower_quota,
  quota->'like' as like_quota,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_instagram_remaining,
  (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) as total_instagram_total
FROM users
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 BETWEEN 5.5 AND 6.5
  AND quota IS NOT NULL
ORDER BY "createdAt" DESC;

-- 4. 특정 광고주의 ID를 알고 있다면 직접 업데이트 가능
-- UPDATE users
-- SET quota = jsonb_set(
--   jsonb_set(
--     COALESCE(quota, '{}'::jsonb),
--     '{follower}',
--     jsonb_build_object('total', 1000, 'remaining', 1000)
--   ),
--   '{like}',
--   jsonb_build_object('total', 1000, 'remaining', 1000)
-- )
-- WHERE id = '광고주-UUID-여기에-입력';

