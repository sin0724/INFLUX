# 🚀 INFLUX 배포 단계별 가이드

## 📋 배포 전 체크리스트

- [ ] 모든 마이그레이션 SQL 실행 완료
- [ ] 환경 변수 준비 완료
- [ ] GitHub 저장소 생성 (또는 기존 저장소)
- [ ] Supabase 프로젝트 생성 완료

---

## 🔧 1단계: Supabase 마이그레이션 실행

### Supabase SQL Editor에서 다음 SQL들을 순서대로 실행:

#### 1. 기본 스키마
```sql
-- supabase/schema.sql 파일 내용 실행
```

#### 2. Quota 마이그레이션
```sql
-- supabase/quota-migration.sql 파일 내용 실행
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quota JSONB DEFAULT '{}'::jsonb;
```

#### 3. 계약기간 마이그레이션
```sql
-- supabase/contract-period-migration.sql 파일 내용 실행
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users("contractEndDate");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");
```

#### 4. 상호명 마이그레이션
```sql
-- supabase/company-name-migration.sql 파일 내용 실행
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "companyName" TEXT;

CREATE INDEX IF NOT EXISTS idx_users_company_name ON users("companyName");
```

#### 5. Storage 버킷 생성
1. Supabase Dashboard → Storage
2. "New bucket" 클릭
3. 설정:
   - **Name**: `order-images`
   - **Public bucket**: ✅ 체크
   - **File size limit**: 5MB
4. "Create bucket" 클릭

#### 6. Storage 권한 설정
```sql
-- supabase/storage-setup.sql 또는 수동으로 정책 설정
```

---

## 🐙 2단계: GitHub 저장소 준비

### 로컬에서 Git 초기화 (아직 안 했다면)

```bash
cd c:\Users\user\Desktop\INFLUX
git init
git add .
git commit -m "Initial commit"
```

### GitHub에 저장소 생성 및 푸시

1. GitHub에서 새 저장소 생성
2. 다음 명령어 실행:

```bash
git remote add origin https://github.com/your-username/influx-campaign.git
git branch -M main
git push -u origin main
```

---

## ⚡ 3단계: Vercel 배포 (권장)

### 1. Vercel 계정 생성
1. [Vercel](https://vercel.com) 접속
2. GitHub 계정으로 로그인

### 2. 프로젝트 배포
1. "Add New Project" 클릭
2. GitHub 저장소 선택
3. Framework Preset: **Next.js** 선택
4. Root Directory: `./` (기본값)

### 3. 환경 변수 설정

**Settings → Environment Variables**에서 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
NODE_ENV=production
```

**중요:**
- Production, Preview, Development 모두에 동일하게 설정
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 공개하지 말 것

### 4. 배포 실행
1. "Deploy" 버튼 클릭
2. 배포 완료 대기 (약 2-3분)
3. 배포된 URL 확인 (예: `https://influx-campaign.vercel.app`)

---

## 🚂 3단계 대안: Railway 배포

### 1. Railway 계정 생성
1. [Railway](https://railway.app) 접속
2. GitHub 계정으로 로그인

### 2. 프로젝트 생성
1. "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 저장소 선택

### 3. 환경 변수 설정

**Variables** 탭에서 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=C8/KgeAZcMuzxcUaavxWedrCAjKNOlOYuGlLl5mwyNA=
NODE_ENV=production
PORT=3000
```

### 4. 빌드 설정 확인
- **Build Command**: `npm run build` (자동 감지)
- **Start Command**: `npm start` (자동 감지)

### 5. 도메인 생성
1. Settings → Domains
2. "Generate Domain" 클릭
3. 생성된 도메인 확인

---

## ✅ 4단계: 배포 후 설정

### 1. 관리자 계정 생성

배포된 사이트에서 `/admin/clients` 접속은 불가능하므로, 먼저 관리자 계정을 Supabase SQL Editor에서 생성:

```sql
-- 비밀번호 "1234"의 bcrypt 해시 필요
-- scripts/create-test-accounts.js 실행 또는 API 사용
```

또는 배포된 서버에서 직접 API 호출:

```bash
# 로컬에서 실행 (환경 변수 설정 필요)
node scripts/create-test-accounts.js
```

### 2. 테스트 계정 생성 스크립트 수정

배포된 환경에서 실행할 수 있도록 스크립트를 업데이트:

```javascript
// 환경 변수는 배포 플랫폼에서 설정됨
// Railway/Vercel CLI를 통한 실행 필요
```

### 3. 기능 테스트

배포된 사이트에서:
- [ ] 로그인 테스트
- [ ] 광고주 계정 생성 테스트
- [ ] 발주 신청 테스트
- [ ] 이미지 업로드 테스트
- [ ] 관리자 기능 테스트

---

## 🔒 5단계: 보안 설정

### 1. 프로덕션 JWT_SECRET 변경
기존 JWT_SECRET을 더 강력한 값으로 변경:
```bash
openssl rand -base64 32
```

### 2. 테스트 계정 비밀번호 변경
- 초기 계정 생성 후 즉시 비밀번호 변경
- 관리자 계정 보안 강화

### 3. HTTPS 확인
- Vercel/Railway는 자동으로 HTTPS 제공
- 커스텀 도메인 사용 시 SSL 인증서 자동 발급

---

## 📊 6단계: 모니터링 설정

### Vercel
- 대시보드에서 실시간 로그 확인
- Analytics 활성화 (선택사항)
- 성능 모니터링

### Supabase
- Database → Logs에서 쿼리 로그 확인
- Storage 사용량 모니터링
- API 사용량 추적

---

## 🔄 배포 자동화

### GitHub Actions (선택사항)

`.github/workflows/deploy.yml` 파일 생성 (Vercel은 자동 배포 제공)

---

## 🆘 문제 해결

### 배포 실패 시
1. 빌드 로그 확인 (Vercel/Railway 대시보드)
2. 환경 변수 확인
3. TypeScript 에러 확인
4. 의존성 문제 확인

### 런타임 오류 시
1. 서버 로그 확인
2. Supabase 연결 상태 확인
3. 환경 변수 재확인
4. 데이터베이스 마이그레이션 상태 확인

---

## 📞 다음 단계

배포 완료 후:
1. 관리자 계정 생성
2. 초기 광고주 계정 생성
3. 사용자 가이드 제공
4. 정기적인 백업 설정 (Supabase 자동 백업)

---

## 💡 참고사항

- **무료 티어 제한**: 사용량 모니터링 필수
- **비용 알림**: Vercel/Supabase에서 사용량 알림 설정 권장
- **백업**: Supabase Pro는 일일 자동 백업 제공
- **도메인**: 커스텀 도메인 사용 가능 (추가 비용 없음)

