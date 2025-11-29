-- 6개월 플랜 광고주의 인스타그램 할당량을 2000개로 업데이트
-- 이 SQL은 기존 6개월 플랜 광고주의 할당량을 업데이트합니다.

-- 6개월 플랜 광고주 찾기 (계약 기간이 6개월인 경우)
-- 참고: 이 스크립트는 contractStartDate와 contractEndDate를 기준으로 6개월 플랜을 찾습니다.
-- 또는 수동으로 특정 광고주 ID를 지정할 수도 있습니다.

-- 방법 1: 계약 기간이 6개월인 광고주 자동 업데이트
-- 인스타그램 할당량을 총 2000개(follower 1000 + like 1000)로 설정
UPDATE users
SET quota = jsonb_set(
  jsonb_set(
    quota,
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
  AND quota IS NOT NULL;

-- 방법 2: 특정 광고주 ID로 업데이트 (예시)
-- UPDATE users
-- SET quota = jsonb_set(
--   jsonb_set(
--     quota,
--     '{follower}',
--     '{"total": 1000, "remaining": 1000}'::jsonb
--   ),
--   '{like}',
--   '{"total": 1000, "remaining": 1000}'::jsonb
-- )
-- WHERE id = '광고주-UUID-여기에-입력';

-- 확인 쿼리: 6개월 플랜 광고주의 현재 할당량 확인
SELECT 
  id,
  username,
  "companyName",
  "contractStartDate",
  "contractEndDate",
  quota->'follower' as follower_quota,
  quota->'like' as like_quota,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_instagram_remaining
FROM users
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 BETWEEN 5.5 AND 6.5
  AND quota IS NOT NULL
ORDER BY "createdAt" DESC;

