# 🚨 당근마켓 신청 오류 수정 방법

## 발생 중인 오류
**오류 메시지**: `new row for relation "orders" violates check constraint "orders_taskType_check"`

**원인**: `orders` 테이블의 `taskType` CHECK 제약 조건에 `daangn`이 포함되어 있지 않음

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
-- 🚨 당근마켓 신청 오류 수정
-- ============================================

-- orders 테이블의 taskType CHECK 제약조건에 'daangn' 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 확인 메시지
SELECT '✅ 당근마켓(daangn) taskType이 성공적으로 추가되었습니다!' AS message;
```

---

## 확인 방법

SQL 실행 후 결과 메시지에서:
- `✅ 당근마켓(daangn) taskType이 성공적으로 추가되었습니다!` 메시지가 표시되면 성공

그 후 다시 당근마켓 신청을 시도해보세요!

## 추가 참고

만약 블로그/영수증 리뷰 관련 오류도 발생한다면, 위 SQL은 이미 `blog`, `receipt`, `daangn`을 모두 포함하고 있으므로 한 번 실행으로 모든 문제가 해결됩니다.

