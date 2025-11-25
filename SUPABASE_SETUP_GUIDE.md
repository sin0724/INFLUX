# Supabase 설정 가이드 (단계별)

이 가이드는 Supabase 프로젝트를 처음부터 설정하는 방법을 자세히 안내합니다.

## 📋 목차
1. [Supabase 프로젝트 정보 확인](#1-supabase-프로젝트-정보-확인)
2. [데이터베이스 스키마 실행](#2-데이터베이스-스키마-실행)
3. [Storage 버킷 생성](#3-storage-버킷-생성)
4. [Storage 권한 설정](#4-storage-권한-설정)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [테스트 계정 생성](#6-테스트-계정-생성)
7. [설정 확인](#7-설정-확인)

---

## 1. Supabase 프로젝트 정보 확인

### Step 1-1: Supabase 대시보드 접속
1. [supabase.com](https://supabase.com)에 로그인
2. 생성한 프로젝트 클릭

### Step 1-2: 프로젝트 URL 확인
1. 왼쪽 메뉴에서 **Settings** (톱니바퀴 아이콘) 클릭
2. **API** 섹션 클릭
3. **Project URL** 복사해두기
   - 예: `https://abcdefghijklmnop.supabase.co`

### Step 1-3: API Keys 확인
같은 API 페이지에서:

1. **anon public** 키 복사
   - "Project API keys" 섹션의 `anon` `public` 키
   - 예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

2. **service_role** 키 복사 (아래로 스크롤)
   - "Project API keys" 섹션의 `service_role` `secret` 키
   - ⚠️ **주의**: 이 키는 절대 공개하지 마세요!

---

## 2. 데이터베이스 스키마 실행

### Step 2-1: SQL Editor 열기
1. Supabase 대시보드 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### Step 2-2: 스키마 SQL 실행
1. 프로젝트의 `supabase/schema.sql` 파일 내용을 모두 복사
2. SQL Editor에 붙여넣기
3. 오른쪽 하단의 **RUN** 버튼 클릭 (또는 `Ctrl + Enter`)
4. 성공 메시지 확인:
   ```
   Success. No rows returned
   ```

### Step 2-3: 테이블 생성 확인
1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. 다음 테이블들이 보이는지 확인:
   - ✅ `users` 테이블
   - ✅ `orders` 테이블

---

## 3. Storage 버킷 생성

### Step 3-1: Storage 메뉴 열기
1. 왼쪽 메뉴에서 **Storage** 클릭

### Step 3-2: 새 버킷 생성
1. **New bucket** 버튼 클릭
2. 다음 설정 입력:
   - **Name**: `order-images` (정확히 이 이름!)
   - **Public bucket**: ✅ **체크** (Public으로 설정)
   - **File size limit**: `5` (MB)
   - **Allowed MIME types**: 비워두기 (모든 이미지 타입 허용)
3. **Create bucket** 버튼 클릭

### Step 3-3: 버킷 생성 확인
- `order-images` 버킷이 목록에 나타나는지 확인

---

## 4. Storage 권한 설정

### Step 4-1: Storage 정책 SQL 실행
1. **SQL Editor**로 다시 이동
2. **New query** 클릭
3. 프로젝트의 `supabase/storage-setup.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **RUN** 버튼 클릭

### Step 4-2: 정책 확인 (선택사항)
1. **Storage** → **Policies** 클릭
2. `order-images` 버킷의 정책 확인:
   - ✅ "Authenticated users can upload images"
   - ✅ "Public can view images"
   - ✅ "Users can delete own images"

---

## 5. 환경 변수 설정

### Step 5-1: .env.local 파일 생성
프로젝트 루트 디렉토리에 `.env.local` 파일 생성

### Step 5-2: 환경 변수 입력
`.env.local` 파일에 다음 내용 입력:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_붙여넣기
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_key_붙여넣기

# JWT Secret (랜덤 문자열 생성)
JWT_SECRET=여기에_랜덤_문자열_입력

# Node Environment
NODE_ENV=development
```

### Step 5-3: JWT_SECRET 생성
터미널에서 다음 명령어 실행:

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

또는 Node.js 사용:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

생성된 문자열을 `JWT_SECRET`에 붙여넣기

### Step 5-4: 파일 저장
파일을 저장하고 닫기

---

## 6. 테스트 계정 생성

### 방법 1: 스크립트 사용 (권장)

1. 터미널에서 프로젝트 디렉토리로 이동
2. 다음 명령어 실행:
   ```bash
   node scripts/create-test-accounts.js
   ```
3. 성공 메시지 확인:
   ```
   ✅ 관리자 계정 생성 완료:
      아이디: admin1
      비밀번호: 1234

   ✅ 광고주 계정 생성 완료:
      아이디: testclient
      비밀번호: 1234
      총 작업 가능 갯수: 10건
   ```

### 방법 2: 관리자 페이지에서 생성 (나중에)

개발 서버 실행 후 관리자 페이지에서 광고주 계정 생성 가능

---

## 7. 설정 확인

### Step 7-1: 개발 서버 실행
```bash
npm install  # 처음 한 번만
npm run dev
```

### Step 7-2: 브라우저에서 접속
[http://localhost:3000](http://localhost:3000) 열기

### Step 7-3: 로그인 테스트
1. 로그인 페이지로 이동 (자동 리다이렉트)
2. 테스트 계정으로 로그인:
   - **관리자**: `admin1` / `1234`
   - **광고주**: `testclient` / `1234`

### Step 7-4: 기능 테스트

#### 광고주 테스트:
1. ✅ 대시보드에서 "남은 작업: 10건" 표시 확인
2. ✅ "신청하기" 버튼 클릭
3. ✅ 작업 종류 선택
4. ✅ 작업 신청 제출
5. ✅ 남은 작업이 9건으로 변경되는지 확인

#### 관리자 테스트:
1. ✅ 관리자 대시보드 접속
2. ✅ 광고주 관리 페이지 접속
3. ✅ `testclient` 계정이 보이는지 확인

---

## 🚨 문제 해결

### 문제 1: SQL 실행 시 오류 발생
**해결 방법:**
- SQL을 한 번에 실행하지 말고, 섹션별로 나눠서 실행
- 오류 메시지를 확인하고 해당 부분만 수정

### 문제 2: Storage 버킷이 보이지 않음
**해결 방법:**
- 버킷 이름이 정확히 `order-images`인지 확인
- Storage 페이지를 새로고침

### 문제 3: 이미지 업로드가 안 됨
**해결 방법:**
1. Storage 정책이 올바르게 설정되었는지 확인
2. 버킷이 Public으로 설정되었는지 확인
3. 환경 변수 `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인

### 문제 4: 로그인이 안 됨
**해결 방법:**
1. 환경 변수가 올바르게 설정되었는지 확인
2. `.env.local` 파일이 프로젝트 루트에 있는지 확인
3. 개발 서버를 재시작: `Ctrl + C` 후 `npm run dev`

### 문제 5: 테스트 계정 생성 스크립트 오류
**해결 방법:**
- 환경 변수가 설정되었는지 확인
- Supabase 프로젝트가 활성 상태인지 확인
- `npm install`로 의존성이 설치되었는지 확인

---

## ✅ 설정 완료 체크리스트

설정이 완료되었는지 확인하세요:

- [ ] Supabase 프로젝트 URL과 API Keys 확인 완료
- [ ] 데이터베이스 스키마 (schema.sql) 실행 완료
- [ ] users, orders 테이블 생성 확인 완료
- [ ] Storage 버킷 `order-images` 생성 완료
- [ ] Storage 정책 (storage-setup.sql) 실행 완료
- [ ] .env.local 파일 생성 및 환경 변수 설정 완료
- [ ] 테스트 계정 생성 완료
- [ ] 개발 서버 실행 및 로그인 테스트 완료

---

**모든 설정이 완료되면 개발을 시작할 수 있습니다!** 🎉

추가 도움이 필요하면 `README.md`나 `SETUP_GUIDE.md`를 참고하세요.

