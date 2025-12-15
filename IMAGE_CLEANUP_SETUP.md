# 이미지 자동 삭제 설정 가이드

이 문서는 2주(14일) 이상 된 이미지를 자동으로 삭제하는 기능을 설정하는 방법을 안내합니다.

## 개요

업로드된 이미지는 2주(14일) 후에 자동으로 삭제됩니다. 이는 원고 다운로드 시 이미지가 유지되도록 하기 위함입니다.

## 설정 방법

### 방법 1: Supabase Database Function 사용 (권장 - Supabase Pro 이상)

1. Supabase Dashboard → SQL Editor로 이동
2. `supabase/image-cleanup-function.sql` 파일의 내용을 실행
3. pg_cron으로 매일 자정에 실행되도록 스케줄 설정:

```sql
-- pg_cron 확장 활성화 (Supabase Pro 이상 필요)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매일 자정에 실행
SELECT cron.schedule(
  'cleanup-old-images',
  '0 0 * * *',
  $$SELECT cleanup_old_images()$$
);
```

### 방법 2: API 엔드포인트 사용 (무료 플랜 또는 Railway/Vercel)

#### 2-1. Railway Cron 사용

Railway에서 Cron Job을 설정:

1. Railway Dashboard → 프로젝트 → Settings → Cron Jobs
2. 새 Cron Job 추가:
   - **Schedule**: `0 0 * * *` (매일 자정)
   - **Command**: `curl -X POST https://your-app-url.railway.app/api/cleanup-images -H "Authorization: Bearer YOUR_CLEANUP_API_TOKEN"`

#### 2-2. Vercel Cron 사용

`vercel.json` 파일에 Cron 설정 추가:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-images",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### 2-3. 외부 Cron 서비스 사용

cron-job.org, EasyCron 등의 서비스를 사용하여 매일 API를 호출:

- **URL**: `https://your-app-url.com/api/cleanup-images`
- **Method**: POST
- **Headers**: `Authorization: Bearer YOUR_CLEANUP_API_TOKEN`
- **Schedule**: 매일 자정 (0 0 * * *)

### 환경 변수 설정

`.env` 또는 Railway/Vercel 환경 변수에 추가:

```
CLEANUP_API_TOKEN=your-secure-random-token-here
```

## 테스트

### API 엔드포인트 테스트

```bash
curl -X POST https://your-app-url.com/api/cleanup-images \
  -H "Authorization: Bearer YOUR_CLEANUP_API_TOKEN"
```

또는 브라우저에서:
```
https://your-app-url.com/api/cleanup-images
```

### Database Function 테스트

Supabase SQL Editor에서:

```sql
-- 함수 수동 실행
SELECT cleanup_old_images();
```

## 삭제 기준

- **보관 기간**: 14일 (2주)
- **삭제 대상**: `order-images` 버킷의 모든 이미지
- **삭제 시점**: 파일의 `created_at`이 현재 시점에서 14일 이전인 경우

## 주의사항

1. **백업**: 중요한 이미지는 삭제 전에 백업하세요
2. **테스트**: 프로덕션 환경에 적용하기 전에 테스트 환경에서 먼저 테스트하세요
3. **모니터링**: 삭제된 파일 수를 로그로 확인하세요
4. **복구 불가**: 삭제된 이미지는 복구할 수 없습니다

## 문제 해결

### 이미지가 삭제되지 않는 경우

1. Supabase Storage 정책 확인
2. Service Role Key 권한 확인
3. API 엔드포인트 로그 확인
4. Database Function 실행 로그 확인

### 너무 빨리 삭제되는 경우

`supabase/image-cleanup-function.sql` 또는 `app/api/cleanup-images/route.ts`에서 기간을 조정:

```sql
-- 14일을 더 긴 기간으로 변경 (예: 30일)
cutoff_date := NOW() - INTERVAL '30 days';
```

```typescript
// 14일을 더 긴 기간으로 변경 (예: 30일)
cutoffDate.setDate(cutoffDate.getDate() - 30);
```

