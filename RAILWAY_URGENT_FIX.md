# 🆘 Railway "Application failed to respond" 긴급 해결

## 문제
Railway에서 애플리케이션이 응답하지 않음

---

## 🔍 1단계: Railway 로그 확인 (가장 중요!)

### Railway 대시보드에서:
1. 프로젝트 선택
2. 서비스(INFLUX) 선택  
3. **"Logs" 탭** 클릭
4. 최신 로그 스크롤하여 확인

### 확인할 내용:
- ❌ 빌드 에러 메시지
- ❌ "Cannot find module" 같은 에러
- ❌ 포트 관련 에러
- ❌ 환경 변수 에러
- ❌ "EADDRINUSE" 같은 포트 충돌 에러

**로그 내용을 복사해서 알려주세요!**

---

## 🔧 2단계: 즉시 확인 및 수정

### A. 환경 변수 확인
Railway → Settings → Variables에서 다음이 **모두** 있는지 확인:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
NODE_ENV=production
```

**하나라도 없으면 추가하고 재배포!**

### B. Railway 설정 확인
Railway → Settings → Build에서:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `./`

---

## 🚀 3단계: 재배포

### 방법 1: 자동 재배포
- 환경 변수나 설정 변경 시 자동으로 재배포 시작
- 완료될 때까지 대기 (2-5분)

### 방법 2: 수동 재배포
- Railway 대시보드에서 **"Redeploy"** 버튼 클릭
- 또는 **"Deployments"** 탭에서 최신 배포의 "Redeploy" 클릭

---

## 💡 일반적인 원인 및 해결

### 원인 1: 빌드 실패
**증상**: 로그에 빌드 에러 메시지

**해결**:
- 타입 에러 수정
- 의존성 문제 해결
- 환경 변수 추가

### 원인 2: 런타임 에러
**증상**: 빌드는 성공했지만 시작 시 에러

**해결**:
- 로그의 에러 메시지 확인
- 환경 변수 누락 확인
- 코드 오류 수정

### 원인 3: 포트 문제
**증상**: 포트 관련 에러

**해결**:
- package.json의 start 스크립트 수정 (이미 완료)
- 재배포

---

## 📋 체크리스트

확인 순서:
1. [ ] Railway 로그 확인
2. [ ] 환경 변수 모두 설정 확인
3. [ ] 빌드 설정 확인
4. [ ] 재배포
5. [ ] 로그에서 "Ready on" 메시지 확인

---

## 🔗 다음 단계

**Railway 로그의 에러 메시지를 알려주시면** 더 정확한 해결책을 제시하겠습니다!

로그를 확인하지 않고는 정확한 원인을 알 수 없습니다.

