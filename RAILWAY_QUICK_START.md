# ⚡ Railway 빠른 배포 가이드

## 5분 만에 배포하기!

### 1️⃣ Railway 계정 생성
- https://railway.app 접속
- GitHub로 로그인

### 2️⃣ 프로젝트 연결
- "New Project" → "Deploy from GitHub repo"
- `sin0724/INFLUX` 선택

### 3️⃣ 환경 변수 추가
**Settings → Variables**에서 다음 5개 추가:

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

### 4️⃣ 배포 완료
- 자동으로 빌드 시작
- 2-5분 대기
- 배포 완료 후 URL 확인!

### 5️⃣ 관리자 계정 생성
Supabase SQL Editor에서 실행:

```sql
-- 비밀번호: 1234
-- 해시는 scripts/create-test-accounts.js 실행으로 생성
```

---

**자세한 가이드**: `RAILWAY_DEPLOY_STEP_BY_STEP.md` 참고

