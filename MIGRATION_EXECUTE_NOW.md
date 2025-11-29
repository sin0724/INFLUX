# 🚨 긴급: 데이터베이스 마이그레이션 필수 실행

**현재 발생 중인 모든 오류는 데이터베이스 마이그레이션이 실행되지 않아서 발생합니다.**

## ❌ 발생 중인 오류들

1. **당근마켓 신청 실패** ❌
   - 오류: `orders_taskType_check` 제약조건 위반
   - 원인: orders 테이블에 'daangn' taskType이 없음

2. **블로그/영수증 리뷰 링크 추가 실패** ❌
   - 오류: `orders_taskType_check` 제약조건 위반
   - 원인: orders 테이블에 'blog', 'receipt' taskType이 없음

## ✅ 해결 방법: 아래 SQL을 Supabase에서 실행하세요

### 실행 방법

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard

2. **프로젝트 선택**

3. **SQL Editor 열기**
   - 왼쪽 메뉴 → **SQL Editor**
   - **New query** 클릭

4. **아래 SQL 전체 복사하여 붙여넣기**

5. **Run 버튼 클릭**

---

## 📋 실행할 SQL (아래 전체 복사)

```sql
-- ============================================
-- 모든 필수 마이그레이션 통합 실행 파일
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요
-- ============================================

-- ============================================
-- 1. orders 테이블 taskType CHECK 제약조건 수정
-- blog, receipt, daangn 추가
-- ============================================

-- 기존 제약조건 삭제
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

-- 새로운 제약조건 추가 (모든 taskType 포함)
ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- ============================================
-- 2. experience_applications 테이블 생성
-- ============================================

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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_experience_applications_client_id ON experience_applications("clientId");
CREATE INDEX IF NOT EXISTS idx_experience_applications_status ON experience_applications(status);
CREATE INDEX IF NOT EXISTS idx_experience_applications_created_at ON experience_applications("createdAt");
CREATE INDEX IF NOT EXISTS idx_experience_applications_completed_link ON experience_applications("completedLink") WHERE "completedLink" IS NOT NULL;

-- updatedAt 자동 업데이트 트리거
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

-- RLS 비활성화
ALTER TABLE experience_applications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 완료 링크 필드가 없는 경우 추가
-- ============================================

-- orders 테이블에 completedLink 필드 추가 (이미 있으면 스킵)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "completedLink" TEXT;

-- 인덱스 추가 (완료된 주문 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_completed_link ON orders("completedLink") WHERE "completedLink" IS NOT NULL;

-- ============================================
-- 확인 메시지
-- ============================================

SELECT '✅ 모든 마이그레이션이 성공적으로 완료되었습니다!' AS message;

-- 현재 taskType 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';

-- experience_applications 테이블 확인
SELECT COUNT(*) AS experience_applications_table_exists 
FROM information_schema.tables 
WHERE table_name = 'experience_applications';

-- completedLink 필드 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'completedLink';
```

---

## ✅ 실행 후 확인

마이그레이션 실행 후 다음이 표시되어야 합니다:

1. `✅ 모든 마이그레이션이 성공적으로 완료되었습니다!` 메시지
2. taskType 제약조건에 'blog', 'receipt', 'daangn'이 포함됨
3. experience_applications 테이블이 생성됨
4. orders 테이블에 completedLink 필드가 추가됨

## 🔧 실행 후 테스트

1. ✅ **당근마켓 신청** - 정상 작동해야 함
2. ✅ **블로그/영수증 리뷰 링크 추가** - 정상 작동해야 함
3. ✅ **체험단 신청** - 정상 작동해야 함

---

## ⚠️ 중요

**이 마이그레이션을 실행하지 않으면 위 기능들이 계속 작동하지 않습니다.**

