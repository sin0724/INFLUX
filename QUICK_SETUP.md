# 🚀 Supabase 빠른 설정 가이드

## 1️⃣ Supabase 정보 확인 (2분)

### 1-1. Settings → API로 이동
```
Supabase 대시보드 → 왼쪽 메뉴 Settings (⚙️) → API
```

### 1-2. 정보 복사하기
아래 3가지를 복사해서 메모장에 저장하세요:

1. **Project URL**
   - 예: `https://abcdefghijklmnop.supabase.co`

2. **anon public 키**
   - "Project API keys" → `anon` `public` 키

3. **service_role 키** 
   - 아래로 스크롤 → `service_role` `secret` 키
   - ⚠️ 이 키는 절대 공개하지 마세요!

---

## 2️⃣ 데이터베이스 스키마 실행 (1분)

### 2-1. SQL Editor 열기
```
왼쪽 메뉴 → SQL Editor → New query 클릭
```

### 2-2. schema.sql 파일 실행
1. 프로젝트 폴더에서 `supabase/schema.sql` 파일 열기
2. **전체 내용 복사** (Ctrl+A → Ctrl+C)
3. SQL Editor에 붙여넣기 (Ctrl+V)
4. **RUN** 버튼 클릭 (또는 Ctrl+Enter)

### 2-3. 성공 확인
- "Success. No rows returned" 메시지가 보이면 성공!
- Table Editor에서 `users`, `orders` 테이블 확인

---

## 3️⃣ Storage 버킷 생성 (1분)

### 3-1. Storage 메뉴로 이동
```
왼쪽 메뉴 → Storage
```

### 3-2. 새 버킷 생성
1. **New bucket** 버튼 클릭
2. 다음처럼 입력:
   ```
   Name: order-images
   Public bucket: ✅ 체크
   File size limit: 5
   ```
3. **Create bucket** 클릭

---

## 4️⃣ Storage 권한 설정 (30초)

### 4-1. SQL Editor로 돌아가기
```
왼쪽 메뉴 → SQL Editor → New query
```

### 4-2. storage-setup.sql 실행
1. 프로젝트 폴더에서 `supabase/storage-setup.sql` 파일 열기
2. **전체 내용 복사**
3. SQL Editor에 붙여넣기
4. **RUN** 클릭

---

## 5️⃣ 환경 변수 설정 (3분)

### 5-1. .env.local 파일 생성
프로젝트 루트 폴더에 `.env.local` 파일 생성

### 5-2. 아래 내용 복사해서 붙여넣기
```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_public_키_붙여넣기
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키_붙여넣기
JWT_SECRET=여기에_랜덤_문자열_입력
NODE_ENV=development
```

### 5-3. 값 채우기
1. **NEXT_PUBLIC_SUPABASE_URL**: Step 1에서 복사한 Project URL
2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Step 1에서 복사한 anon public 키
3. **SUPABASE_SERVICE_ROLE_KEY**: Step 1에서 복사한 service_role 키
4. **JWT_SECRET**: 아래 명령어로 생성

#### JWT_SECRET 생성 방법:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

생성된 긴 문자열을 `JWT_SECRET=` 뒤에 붙여넣기

### 5-4. 파일 저장
저장하고 닫기

---

## 6️⃣ 테스트 계정 생성 (1분)

### 터미널에서 실행:
```bash
node scripts/create-test-accounts.js
```

**성공 메시지:**
```
✅ 관리자 계정 생성 완료:
   아이디: admin1
   비밀번호: 1234

✅ 광고주 계정 생성 완료:
   아이디: testclient
   비밀번호: 1234
```

---

## 7️⃣ 개발 서버 실행 및 테스트 (1분)

### 7-1. 서버 실행
```bash
npm install   # 처음 한 번만
npm run dev
```

### 7-2. 브라우저에서 확인
[http://localhost:3000](http://localhost:3000) 열기

### 7-3. 로그인 테스트
- 관리자: `admin1` / `1234`
- 광고주: `testclient` / `1234`

---

## ✅ 완료!

이제 모든 설정이 끝났습니다! 🎉

---

## 🚨 문제 발생 시

### SQL 실행 오류
→ SQL을 다시 복사해서 한 번에 실행

### 이미지 업로드 안 됨
→ Storage 버킷이 `order-images`로 정확히 생성되었는지 확인

### 로그인 안 됨
→ `.env.local` 파일 값이 올바른지 확인, 서버 재시작

### 계정 생성 스크립트 오류
→ 환경 변수가 제대로 설정되었는지 확인

---

**더 자세한 설명이 필요하면 `SUPABASE_SETUP_GUIDE.md` 파일을 참고하세요!**

