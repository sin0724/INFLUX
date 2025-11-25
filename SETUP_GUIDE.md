# 초기 설정 가이드

이 문서는 INFLUX 캠페인 발주 시스템을 처음 설정하는 방법을 단계별로 안내합니다.

## 1. 프로젝트 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd INFLUX

# 의존성 설치
npm install
```

## 2. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름과 데이터베이스 비밀번호 설정
4. 프로젝트 생성 완료 후 다음 정보 확인:
   - Project URL (예: `https://xxxxx.supabase.co`)
   - API Keys:
     - `anon` `public` 키
     - `service_role` 키 (Settings → API에서 확인)

## 3. 데이터베이스 스키마 설정

1. Supabase 대시보드에서 SQL Editor 열기
2. `supabase/schema.sql` 파일의 내용을 복사하여 실행
3. 실행 완료 확인

## 4. Storage 버킷 생성

1. Supabase 대시보드에서 Storage 메뉴 열기
2. "New bucket" 클릭
3. 설정:
   - **Name**: `order-images`
   - **Public bucket**: ✅ 체크
   - **File size limit**: 5MB (또는 원하는 크기)
4. "Create bucket" 클릭

## 5. Storage 권한 설정

1. SQL Editor에서 `supabase/storage-setup.sql` 파일의 내용 실행
2. 또는 Storage → Policies에서 수동으로 정책 생성:
   - **Public Access**: 모든 사용자가 읽기 가능
   - **Authenticated Upload**: 인증된 사용자가 업로드 가능

## 6. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (랜덤 문자열 생성)
JWT_SECRET=your_random_secret_key_at_least_32_characters

# Node Environment
NODE_ENV=development
```

**JWT_SECRET 생성 방법:**
```bash
# 방법 1: OpenSSL 사용
openssl rand -base64 32

# 방법 2: Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 7. 테스트 계정 생성

### 방법 1: 스크립트 사용 (권장)

```bash
# 환경 변수 설정 후
node scripts/create-test-accounts.js
```

### 방법 2: 관리자 페이지에서 생성

1. 개발 서버 실행
2. 임시로 관리자 계정을 SQL로 생성하거나
3. Supabase Auth를 일시적으로 사용하여 관리자 계정 생성
4. 관리자 페이지에서 광고주 계정 생성

### 방법 3: SQL로 직접 생성 (비권장, 개발 환경만)

**주의**: 비밀번호는 반드시 bcrypt로 해싱해야 합니다.

```sql
-- 관리자 계정 생성 (비밀번호: 1234)
-- 실제 해시는 애플리케이션 코드를 통해 생성해야 합니다
INSERT INTO users (username, password, role) VALUES (
  'admin1',
  '$2a$10$your_bcrypt_hash_here',
  'admin'
);

-- 광고주 계정 생성 (비밀번호: 1234, 총 작업 10건)
INSERT INTO users (username, password, role, "totalQuota", "remainingQuota") VALUES (
  'testclient',
  '$2a$10$your_bcrypt_hash_here',
  'client',
  10,
  10
);
```

**실제 해시 생성:**
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('1234', 10);
console.log(hash);
```

## 8. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

## 9. 테스트

### 로그인 테스트

1. `/login` 페이지로 이동
2. 테스트 계정으로 로그인:
   - 관리자: `admin1` / `1234`
   - 광고주: `testclient` / `1234`

### 기능 테스트

#### 광고주
1. 홈 화면에서 남은 작업 갯수 확인
2. "신청하기" 버튼 클릭
3. 작업 종류 선택 (예: 인스타그램 팔로워)
4. 내용 입력 후 제출
5. 발주 목록에서 확인
6. 남은 작업 갯수가 1 감소했는지 확인

#### 관리자
1. 관리자 대시보드 확인
2. 광고주 관리에서 새 광고주 생성
3. 발주 내역에서 모든 발주 확인
4. 발주 상태 변경 (pending → working → done)

### 이미지 업로드 테스트

1. 인기게시물 또는 맘카페 작업 선택
2. 이미지 업로드
3. 이미지 미리보기 확인
4. 제출 후 발주 목록에서 이미지 확인

## 10. 문제 해결

### 로그인 오류

- 환경 변수가 올바르게 설정되었는지 확인
- JWT_SECRET이 설정되었는지 확인
- Supabase 연결이 정상인지 확인

### 이미지 업로드 오류

- Storage 버킷이 생성되었는지 확인
- Storage 정책이 올바르게 설정되었는지 확인
- `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인

### 데이터베이스 오류

- 스키마가 올바르게 생성되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성 상태인지 확인

## 다음 단계

- [ ] 프로덕션 환경 설정 (`DEPLOYMENT.md` 참고)
- [ ] 테스트 계정 비밀번호 변경
- [ ] 보안 설정 검토
- [ ] 모니터링 설정

