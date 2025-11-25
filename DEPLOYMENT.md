# 배포 가이드

이 문서는 INFLUX 캠페인 발주 시스템을 Railway 또는 Vercel에 배포하는 방법을 안내합니다.

## 사전 준비

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인하고 새 프로젝트를 생성합니다.
2. 프로젝트가 생성되면 다음 정보를 확인합니다:
   - Project URL
   - Anon (public) key
   - Service role key (Settings → API)

### 2. Supabase 데이터베이스 설정

1. Supabase 대시보드에서 SQL Editor를 엽니다.
2. `supabase/schema.sql` 파일의 내용을 복사하여 실행합니다.
3. Storage에서 새 버킷을 생성합니다:
   - 버킷 이름: `order-images`
   - Public bucket: 체크
   - File size limit: 5MB (또는 원하는 크기)

### 3. Storage 권한 설정

Supabase SQL Editor에서 다음 명령을 실행하여 Storage 접근 권한을 설정합니다:

```sql
-- Storage 정책 설정
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'order-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'order-images' AND
  auth.role() = 'authenticated'
);
```

### 4. 테스트 계정 생성

배포 후 API를 통해 테스트 계정을 생성하거나, Supabase SQL Editor에서 직접 생성할 수 있습니다:

```sql
-- 비밀번호 "1234"의 해시 (bcrypt)
-- 실제로는 API를 통해 생성하는 것을 권장합니다
```

## Railway 배포

### 1. Railway 프로젝트 생성

1. [Railway](https://railway.app)에 GitHub 계정으로 로그인합니다.
2. "New Project"를 클릭하고 GitHub 저장소를 선택합니다.

### 2. 환경 변수 설정

Railway 대시보드에서 Variables 탭으로 이동하여 다음 환경 변수를 추가합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_random_secret_key_at_least_32_characters
NODE_ENV=production
```

**JWT_SECRET**은 안전한 랜덤 문자열로 생성해야 합니다:
```bash
openssl rand -base64 32
```

### 3. 빌드 및 배포 설정

Railway가 자동으로 Next.js 프로젝트를 감지합니다. 다음 설정을 확인합니다:

- **Build Command**: `npm run build` (자동 설정됨)
- **Start Command**: `npm start` (자동 설정됨)
- **Node Version**: 18.x 이상

### 4. 도메인 설정

1. Settings → Domains에서 "Generate Domain"을 클릭합니다.
2. 생성된 도메인으로 접속하여 테스트합니다.

## Vercel 배포

### 1. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인합니다.
2. "Add New Project"를 클릭하고 저장소를 선택합니다.
3. Framework Preset에서 "Next.js"를 선택합니다.

### 2. 환경 변수 설정

Vercel 대시보드에서 Settings → Environment Variables로 이동하여 다음 변수를 추가합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_random_secret_key_at_least_32_characters
```

**Production**, **Preview**, **Development** 모두에 동일하게 설정합니다.

### 3. 배포

1. "Deploy" 버튼을 클릭합니다.
2. 배포가 완료되면 제공된 URL로 접속합니다.

### 4. 커스텀 도메인 설정 (선택사항)

1. Settings → Domains에서 도메인을 추가합니다.
2. DNS 설정을 안내에 따라 구성합니다.

## 배포 후 설정

### 1. 테스트 계정 생성

배포가 완료된 후, 관리자 계정을 생성해야 합니다:

#### 방법 1: API를 통한 생성 (권장)

배포된 애플리케이션의 `/admin/clients` 페이지에서 관리자 계정으로 로그인한 후, 광고주 계정을 생성할 수 있습니다.

#### 방법 2: Supabase SQL Editor를 통한 생성

```sql
-- 비밀번호는 반드시 bcrypt로 해싱해야 합니다
-- 실제 해시는 API를 통해 생성하는 것을 권장합니다
```

### 2. 초기 관리자 계정 생성

Supabase SQL Editor에서 다음 명령을 실행합니다 (비밀번호는 애플리케이션 코드를 통해 해싱해야 함):

**주의**: 프로덕션 환경에서는 API를 통해 계정을 생성하는 것을 권장합니다.

### 3. 환경 변수 확인

배포된 애플리케이션이 올바른 환경 변수를 사용하고 있는지 확인합니다:
- Supabase 연결 테스트
- 로그인 기능 테스트
- 이미지 업로드 테스트

## 문제 해결

### 이미지 업로드가 작동하지 않는 경우

1. Supabase Storage 버킷이 올바르게 생성되었는지 확인
2. Storage 정책이 올바르게 설정되었는지 확인
3. 환경 변수 `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인

### 인증이 작동하지 않는 경우

1. `JWT_SECRET`이 올바르게 설정되었는지 확인
2. 쿠키 도메인이 올바르게 설정되었는지 확인
3. HTTPS가 활성화되어 있는지 확인 (프로덕션 환경)

### 데이터베이스 연결 오류

1. Supabase 프로젝트가 활성 상태인지 확인
2. 환경 변수가 올바른지 확인
3. Supabase RLS 정책이 올바르게 설정되었는지 확인

## 보안 체크리스트

- [ ] 프로덕션 환경에서 `JWT_SECRET`을 안전한 랜덤 문자열로 변경
- [ ] 테스트 계정 비밀번호 변경
- [ ] Supabase RLS 정책 검토
- [ ] Storage 권한 정책 검토
- [ ] HTTPS 활성화 확인
- [ ] 환경 변수가 공개 저장소에 노출되지 않았는지 확인

## 모니터링

### Railway

- Railway 대시보드에서 로그를 확인할 수 있습니다
- Metrics 탭에서 리소스 사용량을 모니터링할 수 있습니다

### Vercel

- Vercel 대시보드에서 배포 로그를 확인할 수 있습니다
- Analytics를 활성화하여 성능을 모니터링할 수 있습니다

### Supabase

- Supabase 대시보드에서 데이터베이스 메트릭을 확인할 수 있습니다
- Storage 사용량을 모니터링할 수 있습니다

