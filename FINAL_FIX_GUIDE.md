# 🚨 최종 해결 가이드 - taskType 제약조건 오류

## 문제 현상
```
주문 생성에 실패했습니다: new row for relation "orders" violates check constraint "orders_taskType_check"
```

SQL을 실행했는데도 계속 같은 오류가 발생하는 경우, 다음 단계를 따라주세요.

---

## 🔍 1단계: 문제 진단

먼저 현재 상태를 확인합니다.

### Supabase SQL Editor에서 실행:

```sql
-- ============================================
-- 🔍 문제 진단 SQL
-- ============================================

-- 1. orders 테이블의 모든 제약조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
ORDER BY contype, conname;

-- 2. taskType 관련 제약조건만 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass 
AND (
    conname LIKE '%taskType%' 
    OR pg_get_constraintdef(oid) LIKE '%taskType%'
);
```

### 확인 사항:
1. 제약조건 이름이 정확히 `orders_taskType_check`인지 확인
2. 제약조건 정의에 어떤 taskType들이 포함되어 있는지 확인
3. 여러 개의 제약조건이 있는지 확인

---

## 🔧 2단계: 강제 수정 SQL 실행

진단 결과를 바탕으로 강제로 제약조건을 수정합니다.

### Supabase SQL Editor에서 실행:

```sql
-- ============================================
-- 🚨 강제로 모든 제약조건 제거 후 재생성
-- ============================================

-- 모든 taskType 관련 제약조건 강제 삭제
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass 
        AND (conname LIKE '%taskType%' OR pg_get_constraintdef(oid) LIKE '%taskType%')
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
        RAISE NOTICE 'Deleted constraint: %', constraint_name;
    END LOOP;
END $$;

-- 새로운 제약조건 생성 (모든 taskType 포함)
ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn'));

-- 확인
SELECT 
    '✅ 제약조건이 성공적으로 생성되었습니다!' AS result,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';
```

---

## ✅ 3단계: 확인 및 테스트

### 제약조건 확인:
```sql
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_taskType_check';
```

**확인해야 할 내용:**
- `constraint_definition`에 다음이 모두 포함되어야 함:
  - `follower`, `like`, `hotpost`, `momcafe`, `powerblog`, `clip`
  - `blog`, `receipt`, `daangn` ← 이 3개가 반드시 포함되어야 함

### 테스트:
1. 브라우저 캐시 완전 삭제 (`Ctrl + Shift + Delete`)
2. 브라우저 완전 종료 후 재시작
3. 블로그/영수증 리뷰 링크 추가 시도
4. 당근마켓 신청 시도

---

## 🔄 4단계: 여전히 오류가 발생하는 경우

### 가능한 원인들:

1. **다른 데이터베이스에 연결되어 있을 수 있음**
   - Supabase 대시보드에서 올바른 프로젝트를 선택했는지 확인
   - Railway 환경 변수에서 올바른 Supabase URL을 사용하는지 확인

2. **제약조건 이름이 다를 수 있음**
   - 진단 SQL 결과에서 실제 제약조건 이름 확인
   - 이름이 다르면 그 이름으로 DROP하고 다시 생성

3. **여러 개의 제약조건이 있을 수 있음**
   - 모든 제약조건을 확인하고 모두 삭제 후 재생성

4. **다른 스키마에 orders 테이블이 있을 수 있음**
   ```sql
   SELECT table_schema, table_name 
   FROM information_schema.tables 
   WHERE table_name = 'orders';
   ```

---

## 📋 체크리스트

- [ ] 1단계 진단 SQL 실행 완료
- [ ] 제약조건 이름 및 내용 확인 완료
- [ ] 2단계 강제 수정 SQL 실행 완료
- [ ] 제약조건 확인 SQL 실행 후 `blog`, `receipt`, `daangn` 포함 확인
- [ ] 브라우저 캐시 삭제 완료
- [ ] 실제 기능 테스트 완료

---

## 🆘 여전히 해결되지 않는 경우

진단 SQL 실행 결과를 알려주시면 더 정확한 해결책을 제공하겠습니다.

다음 정보를 포함해주세요:
1. 진단 SQL 실행 결과 (제약조건 이름, 정의)
2. 강제 수정 SQL 실행 결과
3. 정확한 오류 메시지

