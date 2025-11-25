# 🔧 Railway 포트 설정 및 에러 해결

## "Application failed to respond" 에러 해결

Railway에서 발생하는 가장 일반적인 원인입니다.

---

## 🔍 1단계: Railway 로그 확인

### Railway 대시보드에서:
1. 프로젝트 선택
2. 서비스 선택 (INFLUX)
3. **"Logs" 탭** 클릭
4. 최신 로그 확인

### 확인할 내용:
- ❌ 빌드 에러
- ❌ 런타임 에러
- ❌ 포트 관련 에러
- ❌ 환경 변수 에러

---

## 🔧 2단계: 포트 설정 수정

Railway는 자동으로 `PORT` 환경 변수를 할당하지만, Next.js가 이를 명시적으로 읽도록 설정해야 할 수 있습니다.

### 방법 1: package.json 수정 (권장)

`package.json`의 `start` 스크립트를 수정:

```json
"scripts": {
  "start": "next start -p ${PORT:-3000}"
}
```

또는 더 명확하게:

```json
"scripts": {
  "start": "node -e \"process.env.PORT = process.env.PORT || '3000'; require('next/dist/server/lib/start-server').default({ port: parseInt(process.env.PORT) })\""
}
```

하지만 Next.js는 기본적으로 PORT를 읽으므로, 더 간단한 방법을 사용하겠습니다.

### 방법 2: Railway 환경 변수 추가

Railway → Settings → Variables에서:

```
PORT=3000
```

추가 (선택사항 - Railway가 자동 할당함)

---

## 📋 3단계: 확인 사항

### Railway Settings 확인:

1. **Build & Deploy**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Root Directory: `./`

2. **Environment Variables**
   - 모든 필수 변수가 설정되어 있는지 확인
   - 특히 `NEXT_PUBLIC_SUPABASE_URL` 등

---

## 🚀 4단계: 재배포

1. 설정 변경 후 자동 재배포
2. 또는 **"Redeploy"** 버튼 클릭
3. 로그에서 정상 시작 여부 확인

---

## 💡 빠른 해결

**Railway 로그에서 에러 메시지를 확인하고 알려주세요!**

로그에서 보이는 에러를 알려주시면 더 정확한 해결책을 제시하겠습니다.

