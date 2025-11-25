# 🆘 Railway "Application failed to respond" 에러 해결

## 문제 상황
Railway 배포 후 "Application failed to respond" 에러 발생

---

## 🔍 1단계: Railway 로그 확인

### Railway 대시보드에서:
1. **프로젝트 선택**
2. **서비스 선택** (INFLUX)
3. **"Logs" 탭 클릭**
4. **최신 로그 확인**

### 확인할 내용:
- 빌드 성공 여부
- 런타임 에러 메시지
- 환경 변수 로드 여부
- 포트 설정 확인

---

## 🔧 2단계: 일반적인 문제 해결

### 문제 1: 포트 설정
Railway는 동적으로 포트를 할당합니다. `PORT` 환경 변수를 확인해야 합니다.

**해결 방법:**
Railway에서 환경 변수 추가:
```
PORT=3000
```

또는 Next.js가 자동으로 `PORT` 환경 변수를 읽도록 설정되어 있는지 확인

### 문제 2: 환경 변수 누락
필수 환경 변수가 설정되지 않았을 수 있습니다.

**확인 사항:**
Railway → Settings → Variables에서 다음이 모두 있는지 확인:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `JWT_SECRET`
- ✅ `NODE_ENV=production`

### 문제 3: 빌드 실패
빌드가 실패했을 수 있습니다.

**확인 방법:**
- Railway 로그에서 빌드 에러 확인
- 타입 에러, 의존성 문제 등

---

## 📝 3단계: Next.js 프로덕션 설정 확인

Next.js는 Railway에서 자동으로 포트를 감지해야 합니다. 하지만 명시적으로 설정할 수 있습니다.

### `next.config.js` 확인
이미 올바르게 설정되어 있어야 합니다.

### `package.json` 확인
- `start` 스크립트가 `next start`인지 확인
- 포트 설정이 올바른지 확인

---

## 🚀 4단계: Railway 설정 확인

### Build & Deploy 설정:
1. **Settings → Build**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Root Directory: `./`

### 환경 변수:
1. **Settings → Variables**
   - 모든 필수 변수가 설정되어 있는지 확인

### 재배포:
1. 변경사항 저장 후 자동 재배포
2. 또는 "Redeploy" 버튼 클릭

---

## 💡 빠른 해결 방법

### 1. Railway 로그 확인
```
Railway → 프로젝트 → 서비스 → Logs 탭
```

### 2. 환경 변수 재확인
모든 환경 변수가 올바르게 설정되어 있는지 확인

### 3. 재배포
설정 변경 후 재배포

---

## 📞 문제가 계속되면

Railway 로그에서 다음 정보를 확인하세요:
1. 빌드 로그 (성공/실패)
2. 런타임 에러 메시지
3. 환경 변수 로드 여부

로그 내용을 알려주시면 더 정확한 해결책을 제시하겠습니다!

