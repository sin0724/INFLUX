# INFLUX 캠페인 발주 시스템

광고주 캠페인 발주 관리 시스템입니다. Next.js 14와 Supabase를 기반으로 구축되었으며, 모바일 우선(Mobile-first) 디자인으로 제작되었습니다.

## 주요 기능

### 광고주 기능
- 작업 신청 (인스타그램 팔로워, 좋아요, 인기게시물, 맘카페)
- 발주 목록 조회
- 남은 작업 갯수 확인
- 이미지 업로드 (인기게시물, 맘카페)
- 가이드 및 계정 설정

### 관리자 기능
- 광고주 계정 생성 및 관리
- 전체 발주 내역 조회 및 상태 관리
- 발주 필터링 (날짜, 광고주, 작업 종류, 상태)
- 통계 대시보드

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: JWT 기반 커스텀 인증
- **Styling**: TailwindCSS
- **Language**: TypeScript

## 프로젝트 구조

```
INFLUX/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # 인증 API
│   │   ├── orders/       # 주문 API
│   │   └── users/        # 사용자 API
│   ├── admin/            # 관리자 페이지
│   ├── client/           # 광고주 페이지
│   └── login/            # 로그인 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 함수
├── supabase/             # Supabase 스키마
└── public/               # 정적 파일
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행합니다.
3. Storage에서 `order-images` 버킷을 생성하고 공개 읽기 권한을 설정합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 테스트 계정

### 관리자
- 아이디: `admin1`
- 비밀번호: `1234`

### 광고주
- 아이디: `testclient`
- 비밀번호: `1234`

**주의**: 테스트 계정은 프로덕션 환경에서는 삭제하거나 비밀번호를 변경해야 합니다.

## 데이터베이스 스키마

### users 테이블
- `id`: UUID (Primary Key)
- `username`: TEXT (Unique)
- `password`: TEXT (Hashed)
- `role`: TEXT ('admin' | 'client')
- `totalQuota`: INTEGER
- `remainingQuota`: INTEGER
- `createdAt`: TIMESTAMP

### orders 테이블
- `id`: UUID (Primary Key)
- `clientId`: UUID (Foreign Key → users.id)
- `taskType`: TEXT ('follower' | 'like' | 'hotpost' | 'momcafe' | 'powerblog' | 'clip')
- `caption`: TEXT
- `imageUrls`: TEXT[]
- `status`: TEXT ('pending' | 'working' | 'done')
- `createdAt`: TIMESTAMP

## 배포

### Railway 배포

1. [Railway](https://railway.app)에 GitHub 저장소를 연결합니다.
2. 환경 변수를 설정합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NODE_ENV=production`
3. 빌드 명령어: `npm run build`
4. 시작 명령어: `npm start`

### Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 저장소를 연결합니다.
2. 환경 변수를 설정합니다 (Railway와 동일).
3. Vercel이 자동으로 빌드 및 배포합니다.

## 주요 페이지

### 광고주 페이지
- `/client` - 대시보드
- `/client/order` - 작업 신청
- `/client/orders` - 발주 목록
- `/client/guide` - 가이드
- `/client/settings` - 계정 설정

### 관리자 페이지
- `/admin` - 관리자 대시보드
- `/admin/clients` - 광고주 관리
- `/admin/orders` - 발주 내역 관리

## 보안 고려사항

- 비밀번호는 bcrypt로 해싱되어 저장됩니다.
- JWT 토큰은 HTTP-only 쿠키에 저장됩니다.
- API Routes는 역할 기반 접근 제어를 구현합니다.
- Row Level Security (RLS) 정책이 적용됩니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

