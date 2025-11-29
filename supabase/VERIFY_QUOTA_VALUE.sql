-- 특정 광고주의 인스타그램 할당량 상세 확인
-- username을 실제 광고주 아이디로 변경해서 실행하세요

SELECT 
  id,
  username,
  "companyName",
  "contractStartDate",
  "contractEndDate",
  EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 as months,
  quota->'follower' as follower_quota_full,
  quota->'like' as like_quota_full,
  (quota->'follower'->>'total')::int as follower_total,
  (quota->'follower'->>'remaining')::int as follower_remaining,
  (quota->'like'->>'total')::int as like_total,
  (quota->'like'->>'remaining')::int as like_remaining,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_remaining,
  (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) as total_total
FROM users
WHERE username = '강산이네횟집'  -- 스크린샷에 표시된 광고주명으로 변경
AND quota IS NOT NULL;

-- 모든 6개월 플랜 광고주 확인
SELECT 
  username,
  "companyName",
  quota->'follower'->>'total' as follower_total,
  quota->'follower'->>'remaining' as follower_remaining,
  quota->'like'->>'total' as like_total,
  quota->'like'->>'remaining' as like_remaining,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_remaining
FROM users
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 BETWEEN 5.5 AND 6.5
  AND quota IS NOT NULL;

