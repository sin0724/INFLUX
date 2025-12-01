# 🚨 블로그/영수증 리뷰 링크 추가 오류 수정

## 발생 중인 오류
**오류 메시지**: `블로그 리뷰 주문 생성에 실패했습니다.`

**원인**: `orders` 테이블의 `taskType` CHECK 제약 조건에 `blog`와 `receipt`가 포함되어 있지 않음

## 해결 방법

### 1단계: Supabase 대시보드 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택

### 2단계: SQL Editor 열기
1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭

### 3단계: SQL 실행
1. 아래 SQL을 **전체 복사**하여 SQL Editor에 붙여넣기
2. **"Run"** 버튼 클릭

---

## 📋 실행할 SQL (아래 전체 복사)

```sql
-- ============================================
-- 🚨 블로그/영수증/당근마켓 taskType 오류 수정
-- 모든 taskType을 포함하도록 제약조건 업데이트
-- ============================================

-- orders 테이블의 taskType CHECK 제약조건 업데이트
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 확인 메시지
SELECT '✅ 모든 taskType(blog, receipt, daangn 포함)이 성공적으로 추가되었습니다!' AS message;

-- 현재 제약조건 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';
```

---

## 확인 방법

SQL 실행 후 결과에서:
- `✅ 모든 taskType(blog, receipt, daangn 포함)이 성공적으로 추가되었습니다!` 메시지가 표시되면 성공
- `constraint_definition`에 `blog`, `receipt`, `daangn`이 모두 포함되어 있는지 확인

그 후 다시 블로그/영수증 리뷰 링크 추가를 시도해보세요!

## 참고

이 SQL은 다음 모든 taskType을 포함합니다:
- 기존: `follower`, `like`, `hotpost`, `momcafe`, `powerblog`, `clip`
- 추가: `blog`, `receipt`, `daangn`

한 번 실행하면 블로그/영수증 리뷰와 당근마켓 신청이 모두 정상 작동합니다.

