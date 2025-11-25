# 🆘 Railway 환경 변수 문제 해결

## 문제: "Missing Supabase environment variables" 에러

### 원인
Railway에서 빌드 시점에 환경 변수가 로드되지 않을 수 있습니다.

---

## ✅ 해결 방법

### 1. 환경 변수 확인
Railway 대시보드에서 확인:
1. 프로젝트 → **Settings** → **Variables** 탭
2. 다음 변수들이 모두 있는지 확인:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `JWT_SECRET`
   - ✅ `NODE_ENV`

### 2. 환경 변수 재설정
변수가 있다면:
1. 각 변수를 **삭제**하고
2. 다시 **추가**하세요
3. 변수명과 값에 오타가 없는지 확인

### 3. 재배포
환경 변수를 수정한 후:
1. **"Deploy"** 버튼 클릭하거나
2. 자동 재배포 대기

---

## 🔍 확인 사항

### 변수명 확인
- `NEXT_PUBLIC_SUPABASE_URL` (대소문자 정확히)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (대소문자 정확히)
- `SUPABASE_SERVICE_ROLE_KEY` (대소문자 정확히)
- `JWT_SECRET` (대소문자 정확히)
- `NODE_ENV` (대소문자 정확히)

### 값 확인
- 공백이 없어야 합니다
- 따옴표가 없어야 합니다
- 전체 값이 한 줄에 있어야 합니다

---

## 📝 코드 수정 (완료됨)

`lib/supabase.ts` 파일을 수정하여:
- 빌드 타임에 에러를 던지지 않도록 변경
- 런타임에서만 환경 변수 체크

이제 코드가 업데이트되었으므로 다시 배포해보세요!

---

## 🚀 다음 단계

1. ✅ 환경 변수 재확인
2. ✅ 재배포
3. ✅ 빌드 로그 확인

문제가 계속되면 Railway 로그에서 자세한 에러를 확인하세요!

