# 🚀 Vercel 배포 바로 가기

## 현재 상태
✅ Supabase 마이그레이션 완료
✅ Storage 버킷 설정 완료
✅ GitHub 푸시 완료

## 다음 단계: Vercel 배포

### 1. Vercel 접속 및 로그인
1. **https://vercel.com** 접속
2. **GitHub 계정으로 로그인** (또는 계정 생성)

### 2. 프로젝트 생성
1. 대시보드에서 **"Add New Project"** 클릭
2. **GitHub 저장소 선택**:
   - `sin0724/INFLUX` 선택
   - "Import" 클릭

### 3. 프로젝트 설정
- **Framework Preset**: Next.js (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동)
- **Output Directory**: `.next` (자동)

### 4. 환경 변수 설정 ⚠️ 중요!

**"Environment Variables"** 섹션에서 다음을 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDI1NjUsImV4cCI6MjA3OTYxODU2NX0.HvqYPwC8mMPaoasPu4JQJiO85PuizKmmjN3V_qaVQdU
```

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA0MjU2NSwiZXhwIjoyMDc5NjE4NTY1fQ.FQTKgn0kgmYJTU9sIkKP0SNe9IEEYvVc1zHAC8XdIQY
```

```
JWT_SECRET=C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
```

```
NODE_ENV=production
```

**중요**: 각 환경 변수를 **Production**, **Preview**, **Development** 모두에 추가해야 합니다!

### 5. 배포 실행
1. **"Deploy"** 버튼 클릭
2. 배포 완료까지 대기 (약 2-3분)
3. 배포 완료 후 URL 확인 (예: `https://influx-xxxxx.vercel.app`)

### 6. 배포 확인
배포된 URL로 접속해서:
- [ ] 홈페이지 접속 확인
- [ ] 로그인 페이지 접속 확인

---

## 📝 배포 후 관리자 계정 생성

배포 후 관리자 계정을 생성해야 합니다. 방법은 두 가지:

### 방법 1: Supabase SQL Editor 사용
SQL Editor에서 다음 SQL 실행:

```sql
-- 비밀번호 "1234"의 bcrypt 해시 필요
-- scripts/create-test-accounts.js 로컬에서 실행
```

### 방법 2: 로컬 스크립트 실행 (권장)
로컬 컴퓨터에서:

```bash
# .env.local 파일에 환경 변수 설정 필요
node scripts/create-test-accounts.js
```

하지만 배포된 환경에서는 이 방법이 어려우므로, 먼저 Supabase SQL Editor에서 직접 관리자 계정을 생성하는 것이 좋습니다.

---

## 🎉 완료!

배포가 완료되면:
1. 관리자 계정 생성
2. 광고주 계정 생성 테스트
3. 모든 기능 동작 확인

문제가 있으면 알려주세요!

