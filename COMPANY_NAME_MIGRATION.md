# 상호명 컬럼 추가 마이그레이션

## SQL 실행 방법

Supabase SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- 상호명 컬럼 추가 마이그레이션
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "companyName" TEXT;

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users("companyName");
```

## 변경사항

### 1. 데이터베이스
- `users` 테이블에 `companyName` 컬럼 추가

### 2. 계정 생성
- 광고주 계정 생성 시 상호명 입력 필드 추가 (필수)
- 상호명이 데이터베이스에 저장됨

### 3. 화면 표시
- **광고주 대시보드**: 상호명 표시
- **관리자 - 광고주 목록**: 상호명 컬럼 추가
- **관리자 - 발주 관리**: 광고주 아이디 옆에 상호명 표시

### 4. 수정 기능
- 관리자가 광고주 정보 수정 가능:
  - 아이디 수정
  - 상호명 수정
  - 작업별 남은 개수 수정 (총/남은 개수 각각 수정)

