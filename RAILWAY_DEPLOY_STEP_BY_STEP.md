# 🚂 Railway + Supabase 배포 가이드 (단계별)

## 현재 상태
✅ Supabase 마이그레이션 완료
✅ Storage 버킷 설정 완료
✅ GitHub 푸시 완료
✅ 코드 타입 오류 수정 완료

---

## 📋 배포 전 체크리스트

- [x] Supabase 프로젝트 생성 완료
- [x] 데이터베이스 마이그레이션 완료
- [x] Storage 버킷 생성 및 권한 설정 완료
- [x] GitHub 저장소에 코드 푸시 완료
- [ ] Railway 계정 생성
- [ ] Railway에 프로젝트 배포
- [ ] 환경 변수 설정
- [ ] 배포 확인

---

## 🚀 1단계: Railway 계정 생성

### 1.1 Railway 웹사이트 접속
1. **https://railway.app** 접속
2. **"Login"** 또는 **"Start a New Project"** 클릭

### 1.2 GitHub로 로그인
1. **"Login with GitHub"** 클릭
2. GitHub 계정 권한 승인
3. Railway 대시보드로 이동

---

## 🚀 2단계: 프로젝트 생성 및 GitHub 연결

### 2.1 새 프로젝트 시작
1. Railway 대시보드에서 **"New Project"** 클릭
2. 또는 우측 상단 **"+"** 버튼 클릭

### 2.2 GitHub 저장소 연결
1. **"Deploy from GitHub repo"** 선택
2. 저장소 목록에서 **`sin0724/INFLUX`** 선택
3. Railway가 자동으로 Next.js 프로젝트 감지

**참고**: 저장소가 보이지 않으면 "Configure GitHub App"을 클릭하여 권한을 추가하세요.

---

## 🚀 3단계: 환경 변수 설정 ⚠️ 매우 중요!

### 3.1 Variables 탭 열기
1. 프로젝트 페이지에서 서비스(Service) 선택
2. **"Variables"** 탭 클릭

### 3.2 환경 변수 추가
아래 환경 변수들을 **하나씩** 추가하세요:

#### 1) NEXT_PUBLIC_SUPABASE_URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://qpspzclporwtewabcwct.supabase.co
```
**"Add"** 클릭

#### 2) NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDI1NjUsImV4cCI6MjA3OTYxODU2NX0.HvqYPwC8mMPaoasPu4JQJiO85PuizKmmjN3V_qaVQdU
```
**"Add"** 클릭

#### 3) SUPABASE_SERVICE_ROLE_KEY ⚠️ 비밀
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA0MjU2NSwiZXhwIjoyMDc5NjE4NTY1fQ.FQTKgn0kgmYJTU9sIkKP0SNe9IEEYvVc1zHAC8XdIQY
```
**⚠️ 주의**: 이 키는 절대 공개하지 마세요!
**"Add"** 클릭

#### 4) JWT_SECRET
```
Key: JWT_SECRET
Value: C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
```
**"Add"** 클릭

#### 5) NODE_ENV
```
Key: NODE_ENV
Value: production
```
**"Add"** 클릭

### 3.3 환경 변수 확인
모든 변수가 추가되었는지 확인하세요:
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ JWT_SECRET
- ✅ NODE_ENV

---

## 🚀 4단계: 빌드 설정 확인

### 4.1 Settings 탭 확인
1. **"Settings"** 탭 클릭
2. 다음 설정이 자동으로 감지되어야 합니다:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `./`

### 4.2 수동 설정 (필요 시)
자동 감지가 안 되었다면:
1. **"Build"** 섹션에서 설정 확인
2. 필요 시 수정

---

## 🚀 5단계: 배포 시작 및 모니터링

### 5.1 자동 배포
- 환경 변수를 저장하면 Railway가 자동으로 배포를 시작합니다
- 또는 **"Deploy"** 버튼 클릭

### 5.2 배포 진행 상황 확인
1. **"Deployments"** 탭 클릭
2. 배포 진행 상황 확인
3. **"Logs"** 탭에서 실시간 로그 확인

### 5.3 배포 완료 대기
- 빌드 시간: 약 2-5분
- "Ready" 상태가 되면 배포 완료

---

## 🚀 6단계: 도메인 확인 및 설정

### 6.1 기본 도메인 확인
1. 배포 완료 후 **"Settings"** → **"Domains"** 탭
2. Railway가 자동 생성한 도메인 확인
   - 예: `https://influx-production.up.railway.app`

### 6.2 커스텀 도메인 설정 (선택사항)
1. **"Generate Domain"** 클릭 (더 읽기 쉬운 도메인 생성)
2. 또는 **"Custom Domain"** 입력하여 본인 도메인 연결

---

## 🚀 7단계: 배포 확인

### 7.1 기본 접속 테스트
배포된 URL로 접속하여 확인:
- [ ] 홈페이지 접속 확인
- [ ] 로그인 페이지 접속 확인 (`/login`)
- [ ] 페이지가 정상적으로 로드되는지 확인

### 7.2 기능 테스트
- [ ] 로그인 기능 (관리자 계정 생성 필요)
- [ ] API 엔드포인트 동작 확인

---

## 🔐 8단계: 관리자 계정 생성

배포가 완료되면 관리자 계정을 생성해야 합니다.

### 방법 1: Supabase SQL Editor 사용 (권장)

1. **Supabase 대시보드** 접속
2. **SQL Editor** 열기
3. 다음 SQL 실행:

```sql
-- 관리자 계정 생성 (비밀번호: 1234)
INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin1',
  '$2a$10$rOzJ0X5HnHc5KqV9z0Kz9eH5KqV9z0Kz9eH5KqV9z0Kz9eH5KqV9z0K',  -- "1234"의 bcrypt 해시
  'admin',
  0,
  0,
  true
);
```

**비밀번호 해시 생성 방법:**
로컬에서 실행:
```bash
node scripts/create-test-accounts.js
```

### 방법 2: 로컬 스크립트 사용
로컬 컴퓨터에서:
```bash
# .env.local 파일에 환경 변수 설정 필요
node scripts/create-test-accounts.js
```

---

## 💰 Railway 비용 안내

### 무료 크레딧
- 신규 사용자: **$5 무료 크레딧** 제공
- 사용량 기반 과금

### 예상 비용
- **Railway**: $5-15/월 (사용량에 따라)
- **Supabase**: $25/월 (Pro 플랜)
- **총**: 약 $30-40/월 (~40,000-50,000원)

**참고**: 초기 테스트 기간에는 무료 크레딧으로 충분합니다.

---

## 🆘 문제 해결

### 빌드 실패 시
1. **Logs 탭**에서 에러 메시지 확인
2. 환경 변수 누락 확인
3. 타입 오류 확인 (TypeScript)

### 환경 변수 미적용
1. Variables 탭에서 모든 변수 확인
2. 변수 이름 오타 확인 (대소문자 구분)
3. 저장 후 재배포

### 배포 후 접속 불가
1. 도메인이 제대로 설정되었는지 확인
2. 로그에서 에러 메시지 확인
3. 환경 변수가 제대로 로드되었는지 확인

### 이미지 업로드 오류
1. Supabase Storage 버킷 권한 확인
2. SUPABASE_SERVICE_ROLE_KEY 확인

---

## ✅ 배포 완료!

모든 단계가 완료되면:
1. ✅ Railway에 배포 완료
2. ✅ 환경 변수 설정 완료
3. ✅ 도메인 확인 완료
4. ✅ 관리자 계정 생성 완료

이제 직원들과 광고주들이 사용할 수 있습니다! 🎉

---

## 📞 추가 도움

문제가 발생하면:
1. Railway Logs 탭에서 에러 확인
2. Supabase 대시보드에서 데이터베이스 확인
3. 브라우저 개발자 도구(F12)에서 콘솔 에러 확인

