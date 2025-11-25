# 🚂 Railway 배포 가이드

## Railway로 배포하기

### 장점
- ✅ 저렴한 비용 ($5/월부터 시작)
- ✅ 유연한 설정
- ✅ 사용량 기반 과금

---

## 1. Railway 계정 생성

1. **https://railway.app** 접속
2. **"Start a New Project"** 클릭
3. **GitHub로 로그인**

---

## 2. 프로젝트 생성

### 방법 1: GitHub 저장소 연결 (권장)
1. "Deploy from GitHub repo" 선택
2. `sin0724/INFLUX` 저장소 선택
3. Railway가 자동으로 Next.js 프로젝트 감지

### 방법 2: 직접 배포
1. "Empty Project" 선택
2. "New" → "GitHub Repo" 선택
3. 저장소 연결

---

## 3. 환경 변수 설정

**Settings → Variables**에서 다음 환경 변수 추가:

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

---

## 4. 빌드 설정

Railway가 자동으로 감지하지만, 필요시 **Settings → Build**에서:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `./`

---

## 5. 배포 시작

1. 환경 변수 저장 후 **자동 배포 시작**
2. 배포 진행 상황 확인 (Logs 탭)
3. 배포 완료 후 URL 확인 (예: `https://influx-production.up.railway.app`)

---

## 6. 커스텀 도메인 설정 (선택)

1. **Settings → Domains**
2. **"Generate Domain"** 클릭
3. 또는 **"Custom Domain"** 추가

---

## 7. 배포 확인

배포된 URL로 접속해서:
- [ ] 홈페이지 접속 확인
- [ ] 로그인 페이지 접속 확인
- [ ] API 동작 확인

---

## 💰 Railway 요금제

### 무료 티어
- $5 크레딧 제공 (신규 사용자)
- 사용량 기반 과금

### Developer 플랜 ($5/월)
- $5 크레딧 포함
- 추가 사용량 $0.000463/GB/s

### Pro 플랜 ($20/월)
- 더 많은 크레딧
- 팀 기능

---

## 🆘 문제 해결

### 빌드 실패
- Logs 탭에서 에러 확인
- 환경 변수 누락 확인

### 환경 변수 미적용
- Variables에서 저장 확인
- 재배포 필요할 수 있음

---

## ✅ Railway 배포 완료!

배포가 완료되면 관리자 계정을 생성하세요!

