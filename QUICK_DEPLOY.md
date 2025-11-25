# ⚡ 빠른 배포 가이드

## 🎯 가장 빠른 배포 방법 (Vercel 추천)

### 1. GitHub에 푸시 (5분)

```bash
cd c:\Users\user\Desktop\INFLUX
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/your-username/influx.git
git push -u origin main
```

### 2. Vercel 배포 (10분)

1. **Vercel 접속**: https://vercel.com
2. **GitHub 로그인** 후 "Add New Project"
3. **저장소 선택** → "Import"
4. **환경 변수 설정**:

```
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDI1NjUsImV4cCI6MjA3OTYxODU2NX0.HvqYPwC8mMPaoasPu4JQJiO85PuizKmmjN3V_qaVQdU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA0MjU2NSwiZXhwIjoyMDc5NjE4NTY1fQ.FQTKgn0kgmYJTU9sIkKP0SNe9IEEYvVc1zHAC8XdIQY
JWT_SECRET=C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
NODE_ENV=production
```

5. **"Deploy"** 클릭 → 완료!

### 3. 관리자 계정 생성 (5분)

배포된 URL에서 Supabase SQL Editor 사용하거나, 로컬에서 스크립트 실행:

```bash
# 환경 변수 설정 후
node scripts/create-test-accounts.js
```

---

## 💰 예상 비용

### 첫 3개월 (무료)
- **Vercel Hobby**: $0
- **Supabase Free**: $0
- **총: $0/월** ✅

### 정식 운영 후
- **Vercel Pro**: $20/월
- **Supabase Pro**: $25/월
- **총: $45/월** (~60,000원) 💳

---

## ⚠️ 배포 전 필수 확인

1. ✅ Supabase 마이그레이션 실행 (quota, contract, companyName)
2. ✅ Storage 버킷 생성
3. ✅ 환경 변수 준비
4. ✅ GitHub 저장소 준비

---

## 🎉 배포 완료 후

1. 배포된 URL로 접속 테스트
2. 관리자 계정 생성
3. 광고주 계정 생성 테스트
4. 모든 기능 동작 확인

**총 예상 시간: 20-30분** ⏱️

