# 🚀 배포 완료! 다음 단계

## ✅ 1단계: 배포 확인

배포된 URL로 접속해서 확인:
- [ ] 홈페이지 접속 확인
- [ ] 로그인 페이지 접속 확인 (`/login`)

---

## 🔐 2단계: 관리자 계정 생성 (필수!)

관리자 계정을 생성해야 시스템을 사용할 수 있습니다.

### 방법 1: Supabase SQL Editor 사용 (가장 간단) ⭐

1. **Supabase 대시보드** 접속
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor** 열기
   - 좌측 메뉴 "SQL Editor" 클릭
   - "New query" 클릭

3. **아래 SQL 실행**

먼저 비밀번호 해시를 생성하세요 (로컬에서):

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(hash => console.log(hash));"
```

생성된 해시를 사용하여 SQL 실행:

```sql
-- 관리자 계정 생성
-- 비밀번호: 1234
INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin1',
  '여기에_위에서_생성한_해시_붙여넣기',
  'admin',
  0,
  0,
  true
)
ON CONFLICT (username) DO NOTHING;
```

### 방법 2: 로컬 스크립트 실행 (더 편함)

로컬 컴퓨터에서:

```bash
# .env.local 파일에 환경 변수 설정 필요
# NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=여기에_서비스_롤_키

node scripts/create-test-accounts.js
```

---

## 🔑 3단계: 로그인 테스트

1. 배포된 사이트 접속
2. `/login` 페이지로 이동
3. 관리자 계정으로 로그인:
   - **아이디**: `admin1`
   - **비밀번호**: `1234`
4. 관리자 대시보드 접속 확인

---

## 📋 4단계: 기본 기능 테스트

### 관리자 기능 확인
- [ ] `/admin/clients` - 광고주 관리 페이지
- [ ] 광고주 계정 생성 (1개월/3개월/6개월 플랜)
- [ ] `/admin/orders` - 발주 내역 관리 페이지

### 광고주 기능 확인
- [ ] 광고주 계정으로 로그인
- [ ] 대시보드 확인
- [ ] 발주 신청 테스트
- [ ] 이미지 업로드 테스트

---

## 🎯 빠른 시작

### 지금 바로 해야 할 것:
1. ✅ **관리자 계정 생성** (2단계)
2. ✅ **로그인 테스트** (3단계)
3. ✅ **광고주 계정 생성** (관리자 페이지에서)

### 그 다음:
- 광고주에게 계정 발급
- 시스템 사용 시작! 🎉

---

## 📞 문제 발생 시

### 로그인 실패
→ Supabase에서 사용자 확인

### 기능 오류
→ Railway Logs 확인
→ 브라우저 콘솔(F12) 확인

자세한 체크리스트: `POST_DEPLOYMENT_CHECKLIST.md` 참고

