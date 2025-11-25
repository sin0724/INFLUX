# 🔐 Vercel 환경 변수 설정 가이드

## Vercel에 추가할 환경 변수

배포 시 **Settings → Environment Variables**에서 다음 변수들을 추가하세요:

---

## 필수 환경 변수

### 1. NEXT_PUBLIC_SUPABASE_URL
```
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
```
- **모든 환경에 추가**: Production, Preview, Development

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDI1NjUsImV4cCI6MjA3OTYxODU2NX0.HvqYPwC8mMPaoasPu4JQJiO85PuizKmmjN3V_qaVQdU
```
- **모든 환경에 추가**: Production, Preview, Development

### 3. SUPABASE_SERVICE_ROLE_KEY ⚠️ 비밀
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc3B6Y2xwb3J3dGV3YWJjd2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA0MjU2NSwiZXhwIjoyMDc5NjE4NTY1fQ.FQTKgn0kgmYJTU9sIkKP0SNe9IEEYvVc1zHAC8XdIQY
```
- **주의**: 이 키는 절대 공개하지 마세요!
- **모든 환경에 추가**: Production, Preview, Development

### 4. JWT_SECRET
```
JWT_SECRET=C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
```
- **모든 환경에 추가**: Production, Preview, Development

### 5. NODE_ENV
```
NODE_ENV=production
```
- **Production에만 추가** (Preview, Development에는 필요 없음)

---

## 추가 방법

### Vercel Dashboard에서:
1. 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 각 변수를 추가할 때:
   - **Key**: 변수 이름
   - **Value**: 변수 값
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development 모두 선택
   - **"Add"** 클릭

### 또는 배포 시 한 번에:
1. 프로젝트 Import 화면에서
2. "Environment Variables" 섹션에서 추가
3. 모든 변수를 한 번에 추가 가능

---

## ✅ 확인 방법

배포 후:
1. 배포된 사이트 접속
2. 브라우저 개발자 도구 (F12) → Console
3. 에러 메시지 확인 (환경 변수 누락 시 에러 발생)

---

## 🆘 문제 해결

### "Missing Supabase environment variables" 에러
→ 환경 변수가 제대로 설정되지 않았습니다. Vercel Settings에서 확인하세요.

### 환경 변수가 적용되지 않음
→ 환경 변수 추가 후 **재배포**가 필요합니다. Settings에서 저장하면 자동 재배포됩니다.

