# 🔍 6개월 플랜 인스타그램 할당량 1000개 표시 문제 디버깅 가이드

## 문제 현상
6개월 플랜 광고주의 남은 작업에서 인스타그램이 1000개로 표시됨 (2000개가 되어야 함)

## 원인 가능성

1. **데이터베이스에 실제로 1000개만 저장되어 있음**
   - SQL 업데이트가 실행되지 않았거나
   - 업데이트 조건이 맞지 않음

2. **이미 사용한 quota가 있어서 remaining이 1000 미만**
   - total은 2000개이지만 remaining이 1000개

3. **6개월 플랜 판단 조건이 맞지 않음**
   - 계약 기간 계산 오류

## 확인 방법

### 1단계: 현재 데이터베이스 값 확인

Supabase SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- 현재 모든 광고주의 인스타그램 할당량 확인
SELECT 
  id,
  username,
  "companyName",
  "contractStartDate",
  "contractEndDate",
  EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 as months,
  quota->'follower' as follower_quota,
  quota->'like' as like_quota,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_remaining,
  (COALESCE((quota->'follower'->>'total')::int, 0) + COALESCE((quota->'like'->>'total')::int, 0)) as total_total
FROM users
WHERE 
  role = 'client'
  AND quota IS NOT NULL
ORDER BY "createdAt" DESC;
```

### 2단계: 6개월 플랜 광고주 확인

특정 광고주의 계약 기간이 6개월인지 확인:

```sql
-- 특정 광고주 확인 (username으로 검색)
SELECT 
  id,
  username,
  "companyName",
  "contractStartDate",
  "contractEndDate",
  EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 as months,
  quota->'follower' as follower_quota,
  quota->'like' as like_quota
FROM users
WHERE username = '광고주아이디' -- 여기에 실제 아이디 입력
AND quota IS NOT NULL;
```

### 3단계: 문제 해결

#### 방법 1: 자동 업데이트 (권장)

`supabase/CHECK_AND_FIX_6MONTH_QUOTA.sql` 파일의 전체 내용을 실행하세요.

이 파일은:
- 현재 값 확인
- 6개월 플랜 판단 조건에 맞는 광고주 자동 업데이트
- 업데이트 후 확인

#### 방법 2: 특정 광고주만 직접 업데이트

광고주의 UUID를 알고 있다면:

```sql
UPDATE users
SET quota = jsonb_set(
  jsonb_set(
    COALESCE(quota, '{}'::jsonb),
    '{follower}',
    jsonb_build_object('total', 1000, 'remaining', 1000)
  ),
  '{like}',
  jsonb_build_object('total', 1000, 'remaining', 1000)
)
WHERE id = '광고주-UUID-여기에-입력';
```

#### 방법 3: 계약 기간 계산 조건 수정

6개월 플랜 판단이 정확하지 않은 경우, 직접 업데이트:

```sql
-- 계약 기간이 5개월 이상 7개월 이하인 모든 광고주를 6개월 플랜으로 간주
UPDATE users
SET quota = jsonb_set(
  jsonb_set(
    COALESCE(quota, '{}'::jsonb),
    '{follower}',
    jsonb_build_object('total', 1000, 'remaining', 1000)
  ),
  '{like}',
  jsonb_build_object('total', 1000, 'remaining', 1000)
)
WHERE 
  "contractStartDate" IS NOT NULL 
  AND "contractEndDate" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("contractEndDate"::timestamp - "contractStartDate"::timestamp)) / 2592000 BETWEEN 5 AND 7
  AND quota IS NOT NULL;
```

### 4단계: 업데이트 후 확인

```sql
-- 업데이트된 값 확인
SELECT 
  username,
  "companyName",
  quota->'follower' as follower_quota,
  quota->'like' as like_quota,
  (COALESCE((quota->'follower'->>'remaining')::int, 0) + COALESCE((quota->'like'->>'remaining')::int, 0)) as total_remaining
FROM users
WHERE id = '업데이트한-광고주-UUID';
```

## 추가 확인사항

### 브라우저 캐시
업데이트 후 브라우저를 새로고침:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 세션 새로고침
로그아웃 후 다시 로그인하면 최신 데이터를 가져옵니다.

## 문제가 계속되면

1. `supabase/CHECK_AND_FIX_6MONTH_QUOTA.sql` 파일을 실행하세요
2. 실행 결과를 확인하고, 어떤 광고주가 업데이트되었는지 확인하세요
3. 여전히 문제가 있으면 해당 광고주의 UUID와 계약 정보를 알려주세요

