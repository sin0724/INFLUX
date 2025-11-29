# 🔧 데이터베이스 마이그레이션 실행 안내

현재 발생하고 있는 오류들을 해결하기 위한 마이그레이션을 실행해야 합니다.

## 발생 중인 오류

1. **orders 테이블 taskType CHECK 제약조건 위반**
   - `blog`, `receipt`, `daangn` taskType이 제약조건에 포함되지 않음

2. **experience_applications 테이블이 존재하지 않음**
   - 체험단 신청 기능이 작동하지 않음

## 해결 방법

### Supabase SQL Editor에서 실행

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **마이그레이션 SQL 실행**
   - `supabase/fix-all-migrations.sql` 파일의 전체 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

4. **실행 결과 확인**
   - "모든 마이그레이션이 성공적으로 완료되었습니다." 메시지 확인
   - 오류가 없다면 마이그레이션 완료

## 마이그레이션 내용

### 1. orders 테이블 taskType 제약조건 수정
- `blog`, `receipt`, `daangn` taskType 추가

### 2. experience_applications 테이블 생성
- 체험단 신청을 위한 테이블 생성
- 필요한 인덱스 및 트리거 생성
- RLS 비활성화

### 3. 완료 링크 필드 확인
- orders 테이블에 completedLink 필드가 있는지 확인 및 추가

## 마이그레이션 후 확인사항

1. ✅ 블로그/영수증 리뷰 링크 추가 기능 작동 확인
2. ✅ 체험단 신청 기능 작동 확인
3. ✅ 당근마켓 주문 생성 기능 작동 확인

## 문제 해결

마이그레이션 실행 후에도 문제가 발생하면:

1. Supabase SQL Editor에서 다음 쿼리로 확인:
   ```sql
   -- orders 테이블 제약조건 확인
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'orders'::regclass 
   AND conname = 'orders_taskType_check';
   
   -- experience_applications 테이블 확인
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'experience_applications';
   ```

2. Railway 로그 확인:
   - Railway 대시보드 → Logs 탭
   - 최신 오류 메시지 확인

