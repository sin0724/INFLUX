# 데이터베이스 마이그레이션 가이드

## 문제 해결: "사용자 생성에 실패했습니다"

광고주 계정 생성 시 이 오류가 발생한다면, 데이터베이스에 필요한 컬럼들이 추가되지 않았을 가능성이 높습니다.

## 해결 방법

### 1. Supabase SQL Editor 열기
1. Supabase Dashboard 접속
2. 좌측 메뉴에서 "SQL Editor" 클릭

### 2. 마이그레이션 SQL 실행

`supabase/full-migration.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 실행하세요:

```sql
-- 전체 마이그레이션 스크립트

-- 1. quota 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;

-- 2. 계약기간 관련 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

-- 기존 데이터가 있는 경우, 기본값 설정
UPDATE users 
SET "isActive" = true 
WHERE "isActive" IS NULL;

UPDATE users 
SET quota = '{}'::jsonb 
WHERE quota IS NULL;
```

### 3. 실행 확인

실행 후 다음 쿼리로 컬럼이 추가되었는지 확인하세요:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('quota', 'contractStartDate', 'contractEndDate', 'isActive');
```

### 4. 브라우저 새로고침

마이그레이션 완료 후 브라우저를 새로고침하고 다시 시도해보세요.

## 추가 디버깅

만약 여전히 문제가 발생한다면:

1. 브라우저 개발자 도구(F12) > Console 탭 확인
2. Network 탭에서 `/api/users` 요청의 응답 확인
3. 에러 메시지를 확인하여 정확한 원인 파악

## 주의사항

- `IF NOT EXISTS` 절을 사용했으므로 여러 번 실행해도 안전합니다
- 기존 데이터는 그대로 유지됩니다
- `isActive`는 기본값이 `true`로 설정됩니다

