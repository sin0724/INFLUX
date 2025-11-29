# 🚨 모든 문제 해결 가이드

현재 발생 중인 모든 문제를 해결하기 위한 단계별 가이드입니다.

## ⚠️ 중요: `supabase/EXECUTE_THIS_NOW.sql` 파일을 먼저 실행하세요!

## ❌ 발생 중인 문제들

1. **1개월 플랜 광고주 신청하기 버튼 반응 없음**
2. **6개월 플랜 인스타그램 1000개 표시 (2000개여야 함)**
3. **당근마켓 신청 실패** (데이터베이스 마이그레이션 필요)
4. **블로그/영수증 리뷰 링크 추가 실패** (데이터베이스 마이그레이션 필요)

---

## 🔧 해결 방법

### 1단계: 데이터베이스 마이그레이션 실행 (필수, 먼저)

**이 단계를 먼저 실행하지 않으면 3번, 4번 문제가 계속 발생합니다.**

#### Supabase SQL Editor에서 실행:

1. Supabase 대시보드 → SQL Editor
2. 아래 SQL **전체를 복사**하여 실행

```sql
-- ============================================
-- 모든 필수 마이그레이션 통합 실행
-- ============================================

-- 1. orders 테이블 taskType CHECK 제약조건 수정
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 2. experience_applications 테이블 생성
CREATE TABLE IF NOT EXISTS experience_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientUsername" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "place" TEXT NOT NULL,
  "reservationPhone" TEXT NOT NULL,
  "desiredParticipants" INTEGER NOT NULL,
  "providedDetails" TEXT NOT NULL,
  "keywords" TEXT NOT NULL,
  "blogMissionRequired" BOOLEAN DEFAULT false,
  "additionalNotes" TEXT,
  "completedLink" TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_applications_client_id ON experience_applications("clientId");
CREATE INDEX IF NOT EXISTS idx_experience_applications_status ON experience_applications(status);
CREATE INDEX IF NOT EXISTS idx_experience_applications_created_at ON experience_applications("createdAt");
CREATE INDEX IF NOT EXISTS idx_experience_applications_completed_link ON experience_applications("completedLink") WHERE "completedLink" IS NOT NULL;

CREATE OR REPLACE FUNCTION update_experience_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_experience_applications_updated_at_trigger ON experience_applications;
CREATE TRIGGER update_experience_applications_updated_at_trigger 
BEFORE UPDATE ON experience_applications
FOR EACH ROW 
EXECUTE FUNCTION update_experience_applications_updated_at();

ALTER TABLE experience_applications DISABLE ROW LEVEL SECURITY;

-- 3. 완료 링크 필드 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "completedLink" TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_completed_link ON orders("completedLink") WHERE "completedLink" IS NOT NULL;

-- 확인 메시지
SELECT '✅ 모든 마이그레이션이 성공적으로 완료되었습니다!' AS message;
```

#### 실행 결과 확인:

실행 후 다음 메시지가 표시되어야 합니다:
- `✅ 모든 마이그레이션이 성공적으로 완료되었습니다!`

---

### 2단계: 6개월 플랜 인스타그램 할당량 업데이트 (선택)

기존 6개월 플랜 광고주의 인스타그램 할당량을 2000개로 업데이트하려면:

```sql
-- 6개월 플랜 광고주 인스타그램 할당량 2000개로 업데이트
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
```

---

### 3단계: 코드 배포 확인

Railway에서 최신 코드가 배포되었는지 확인:

1. Railway 대시보드 접속
2. 최근 배포 내역 확인
3. 빌드 상태 확인

**배포가 완료되지 않았다면:**
- Railway에서 수동으로 "Redeploy" 버튼 클릭
- 또는 Git에 푸시된 최신 코드가 자동 배포되도록 대기

---

## ✅ 해결 후 확인사항

### 1. 1개월 플랜 신청하기 버튼
- [ ] 1개월 플랜 광고주로 로그인
- [ ] "신청하기" 버튼 클릭
- [ ] `/client/order` 페이지로 이동되는지 확인

### 2. 6개월 플랜 인스타그램 할당량
- [ ] 6개월 플랜 광고주로 로그인
- [ ] 남은 작업에서 "인스타그램" 2000개 표시 확인

### 3. 당근마켓 신청
- [ ] 당근마켓 신청 양식 작성
- [ ] 신청 성공 확인

### 4. 블로그/영수증 리뷰 링크 추가
- [ ] 관리자 → 완료된 링크 모아보기
- [ ] 블로그/영수증 리뷰 링크 추가
- [ ] 성공 확인

---

## 🆘 문제가 계속되면

### 데이터베이스 마이그레이션 확인

Supabase SQL Editor에서 다음 쿼리로 확인:

```sql
-- taskType 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

-- 'daangn'이 포함되어 있는지 확인
```

### Railway 배포 확인

- Railway 로그에서 최신 빌드 확인
- 빌드 오류가 있는지 확인
- 배포 완료 시간 확인

---

## 📝 중요

1. **데이터베이스 마이그레이션을 먼저 실행해야 합니다**
2. **마이그레이션 실행 후 Railway 배포 완료까지 대기**
3. **브라우저 캐시 삭제 후 다시 시도**

