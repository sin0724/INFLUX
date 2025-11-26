# 🔧 Railway 빌드 오류 해결 (텔레메트리 캐시 문제)

## 문제
```
Error: ENOENT: no such file or directory, rename '/app/.next/cache/config.json.2390958195' -> '/app/.next/cache/config.json'
```

## 해결 방법

### 방법 1: Railway 환경 변수 추가 (권장)

Railway 대시보드에서 환경 변수 추가:
1. Railway 프로젝트 → Settings → Variables
2. 다음 환경 변수 추가:
   ```
   NEXT_TELEMETRY_DISABLED=1
   ```
3. 저장 후 자동 재배포

### 방법 2: railway.json 파일 수정 (이미 적용됨)

`railway.json` 파일의 `buildCommand`가 다음으로 수정되었습니다:
```json
"buildCommand": "rm -rf .next && NEXT_TELEMETRY_DISABLED=1 npm run build"
```

이렇게 하면:
- 빌드 전에 `.next` 디렉토리를 완전히 삭제하여 캐시 문제 방지
- 텔레메트리를 비활성화하여 캐시 관련 오류 방지

### 방법 3: 두 방법 모두 적용 (가장 확실함)

1. `railway.json` 파일 수정 (이미 완료됨)
2. Railway 환경 변수에 `NEXT_TELEMETRY_DISABLED=1` 추가

## 확인

변경 사항 적용 후:
1. Railway에서 자동 재배포 시작
2. Logs 탭에서 빌드 성공 확인
3. "Build completed successfully" 메시지 확인

## 참고

- 이 오류는 Next.js 텔레메트리가 빌드 시 캐시 파일을 생성하려고 할 때 발생합니다.
- Railway 빌드 환경에서는 캐시 디렉토리가 없을 수 있어 오류가 발생할 수 있습니다.
- 텔레메트리를 비활성화하거나 빌드 전에 캐시를 정리하면 해결됩니다.
