# 🔄 마이그레이션 가이드 (한글)

## 📋 실행 순서

### 1단계: Supabase SQL Editor 열기
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (qpspzclporwtewabcwct)
3. 좌측 메뉴에서 **"SQL Editor"** 클릭
4. **"New query"** 클릭

### 2단계: 전체 마이그레이션 실행

`supabase/ALL_MIGRATIONS.sql` 파일의 **전체 내용**을 복사해서 SQL Editor에 붙여넣고 **"Run"** 클릭하세요.

⚠️ **주의**: 파일 전체를 한 번에 실행하는 것이 안전합니다. `IF NOT EXISTS` 구문을 사용했으므로 여러 번 실행해도 문제없습니다.

### 3단계: 확인

실행 후 마지막 확인 쿼리가 자동으로 실행되어 다음 5개 컬럼이 모두 추가되었는지 확인됩니다:
- ✅ `quota` (JSONB)
- ✅ `contractStartDate` (TIMESTAMP)
- ✅ `contractEndDate` (TIMESTAMP)
- ✅ `isActive` (BOOLEAN)
- ✅ `companyName` (TEXT)

### 4단계: Storage 버킷 확인

1. Supabase Dashboard → **Storage** 메뉴
2. `order-images` 버킷이 있는지 확인
3. 없다면 생성:
   - **Name**: `order-images`
   - **Public bucket**: ✅ 체크
   - **File size limit**: 5MB

---

## ✅ 완료 체크리스트

- [ ] SQL Editor에서 `ALL_MIGRATIONS.sql` 실행 완료
- [ ] 모든 컬럼이 추가되었는지 확인 쿼리 실행
- [ ] Storage 버킷 `order-images` 확인/생성
- [ ] 에러 메시지 없음

---

## 🆘 문제 해결

### "column already exists" 에러
→ 정상입니다. `IF NOT EXISTS` 구문이 있어서 이미 있는 컬럼은 건너뜁니다.

### "permission denied" 에러
→ Supabase 프로젝트의 권한을 확인하세요. Owner 권한이 필요합니다.

### 컬럼이 추가되지 않음
→ 다시 한 번 확인 쿼리를 실행해서 결과를 확인하세요. 실제로는 추가되었을 수 있습니다.

---

## 📝 다음 단계

마이그레이션 완료 후:
1. ✅ GitHub 저장소 준비
2. ✅ Vercel 배포
3. ✅ 테스트

준비되면 알려주세요! 🚀

