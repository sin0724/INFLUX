# 프로젝트 구조

이 문서는 INFLUX 캠페인 발주 시스템의 전체 프로젝트 구조를 설명합니다.

## 폴더 구조

```
INFLUX/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── auth/                # 인증 관련 API
│   │   │   ├── login/          # 로그인 API
│   │   │   ├── logout/         # 로그아웃 API
│   │   │   └── me/             # 현재 사용자 정보 API
│   │   ├── orders/             # 주문 관련 API
│   │   │   ├── route.ts        # 주문 목록 조회/생성
│   │   │   └── [id]/          # 주문 상세 조회/수정
│   │   ├── upload/             # 이미지 업로드 API
│   │   └── users/              # 사용자 관리 API
│   ├── admin/                   # 관리자 페이지
│   │   ├── page.tsx            # 관리자 대시보드
│   │   ├── clients/            # 광고주 관리
│   │   └── orders/             # 발주 내역 관리
│   ├── client/                  # 광고주 페이지
│   │   ├── page.tsx            # 광고주 대시보드
│   │   ├── order/              # 작업 신청
│   │   │   ├── page.tsx        # 작업 신청 폼
│   │   │   └── success/        # 신청 완료 페이지
│   │   ├── orders/             # 발주 목록
│   │   ├── guide/              # 가이드
│   │   └── settings/           # 계정 설정
│   ├── login/                   # 로그인 페이지
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 페이지 (리다이렉트)
│   └── globals.css             # 글로벌 스타일
├── components/                  # React 컴포넌트
│   ├── AdminDashboard.tsx      # 관리자 대시보드
│   ├── ClientDashboard.tsx     # 광고주 대시보드
│   ├── ClientsManagement.tsx   # 광고주 관리 컴포넌트
│   ├── ClientOrdersList.tsx    # 광고주 발주 목록
│   ├── ClientSettings.tsx      # 광고주 설정
│   ├── ImageUpload.tsx         # 이미지 업로드 컴포넌트
│   ├── LogoutButton.tsx        # 로그아웃 버튼
│   └── OrderForm.tsx           # 작업 신청 폼
├── lib/                         # 유틸리티 함수
│   ├── auth.ts                 # 인증 관련 함수
│   ├── middleware.ts           # API 미들웨어
│   ├── supabase.ts             # Supabase 클라이언트
│   └── utils.ts                # 유틸리티 함수
├── supabase/                    # Supabase 설정
│   ├── schema.sql              # 데이터베이스 스키마
│   ├── seed.sql                # 시드 데이터 (참고용)
│   └── storage-setup.sql       # Storage 설정
├── scripts/                     # 스크립트
│   └── create-test-accounts.js # 테스트 계정 생성
├── .env.example                # 환경 변수 예시
├── .gitignore                  # Git 무시 파일
├── DEPLOYMENT.md               # 배포 가이드
├── next.config.js              # Next.js 설정
├── package.json                # 프로젝트 의존성
├── postcss.config.mjs          # PostCSS 설정
├── PROJECT_STRUCTURE.md        # 이 파일
├── README.md                   # 프로젝트 README
├── tailwind.config.ts          # TailwindCSS 설정
└── tsconfig.json               # TypeScript 설정
```

## 주요 파일 설명

### API Routes

#### `/app/api/auth/login/route.ts`
- POST: 사용자 로그인
- 아이디/비밀번호 검증 후 JWT 토큰 생성

#### `/app/api/auth/logout/route.ts`
- POST: 사용자 로그아웃
- 쿠키에서 토큰 제거

#### `/app/api/auth/me/route.ts`
- GET: 현재 로그인한 사용자 정보 조회

#### `/app/api/orders/route.ts`
- GET: 주문 목록 조회 (필터링 지원)
- POST: 새 주문 생성 및 remainingQuota 차감

#### `/app/api/orders/[id]/route.ts`
- GET: 주문 상세 조회
- PATCH: 주문 상태 변경 (관리자만)

#### `/app/api/users/route.ts`
- GET: 사용자 목록 조회 (관리자만)
- POST: 새 사용자 생성 (관리자만)

#### `/app/api/upload/route.ts`
- POST: 이미지 업로드 (Supabase Storage)

### 페이지

#### 광고주 페이지

- `/app/client/page.tsx` - 광고주 대시보드
  - 남은 작업 갯수 표시
  - 신청하기 버튼
  - 메뉴 (발주 목록, 가이드, 계정 설정)

- `/app/client/order/page.tsx` - 작업 신청
  - 작업 종류 선택
  - 내용 입력
  - 이미지 업로드 (필요시)

- `/app/client/orders/page.tsx` - 발주 목록
  - 자신의 모든 발주 내역 조회
  - 발주 상세 보기

- `/app/client/guide/page.tsx` - 가이드
  - 작업 신청 방법 안내
  - 작업 종류별 설명

- `/app/client/settings/page.tsx` - 계정 설정
  - 계정 정보 확인
  - 남은 작업 갯수 확인

#### 관리자 페이지

- `/app/admin/page.tsx` - 관리자 대시보드
  - 통계 정보 (전체 광고주, 전체 발주, 대기중, 진행중)
  - 메뉴 (광고주 관리, 발주 내역 관리)

- `/app/admin/clients/page.tsx` - 광고주 관리
  - 광고주 목록 조회
  - 광고주 계정 생성
  - 광고주 검색

- `/app/admin/orders/page.tsx` - 발주 내역 관리
  - 전체 발주 내역 조회
  - 필터링 (날짜, 광고주, 작업 종류, 상태)
  - 발주 상태 변경
  - 발주 상세 보기

### 컴포넌트

#### `components/ClientDashboard.tsx`
광고주 대시보드 컴포넌트
- 남은 작업 갯수 표시
- 신청하기 버튼
- 메뉴 네비게이션

#### `components/OrderForm.tsx`
작업 신청 폼 컴포넌트
- 작업 종류 선택
- 내용 입력
- 이미지 업로드 (조건부)

#### `components/ImageUpload.tsx`
이미지 업로드 컴포넌트
- 다중 이미지 업로드
- 이미지 미리보기
- 이미지 삭제

#### `components/OrdersManagement.tsx`
관리자 발주 관리 컴포넌트
- 발주 목록 표시
- 필터링 UI
- 발주 상태 변경
- 발주 상세 모달

#### `components/ClientsManagement.tsx`
광고주 관리 컴포넌트
- 광고주 목록 표시
- 광고주 생성 폼
- 광고주 검색

### 라이브러리

#### `lib/auth.ts`
인증 관련 함수
- `hashPassword()` - 비밀번호 해싱
- `verifyPassword()` - 비밀번호 검증
- `generateToken()` - JWT 토큰 생성
- `verifyToken()` - JWT 토큰 검증
- `getSession()` - 세션 정보 가져오기
- `login()` - 로그인 처리

#### `lib/middleware.ts`
API 미들웨어
- `withAuth()` - 인증 및 권한 검사 미들웨어

#### `lib/supabase.ts`
Supabase 클라이언트
- `supabase` - 클라이언트용 Supabase 인스턴스
- `supabaseAdmin` - 서버용 Supabase 인스턴스 (Service Role Key 사용)

#### `lib/utils.ts`
유틸리티 함수
- `cn()` - className 병합 (clsx + tailwind-merge)
- `formatDate()` - 날짜 포맷팅
- `formatDateTime()` - 날짜/시간 포맷팅

## 데이터베이스 스키마

### users 테이블
- `id` (UUID, PK) - 사용자 ID
- `username` (TEXT, UNIQUE) - 사용자명
- `password` (TEXT) - 해싱된 비밀번호
- `role` (TEXT) - 역할 ('admin' | 'client')
- `totalQuota` (INTEGER) - 총 작업 가능 갯수 (광고주만)
- `remainingQuota` (INTEGER) - 남은 작업 갯수 (광고주만)
- `createdAt` (TIMESTAMP) - 생성일시

### orders 테이블
- `id` (UUID, PK) - 주문 ID
- `clientId` (UUID, FK) - 광고주 ID
- `taskType` (TEXT) - 작업 종류
- `caption` (TEXT) - 추가 내용
- `imageUrls` (TEXT[]) - 이미지 URL 배열
- `status` (TEXT) - 상태 ('pending' | 'working' | 'done')
- `createdAt` (TIMESTAMP) - 생성일시

## 인증 흐름

1. 사용자가 로그인 폼 제출
2. `/api/auth/login`으로 POST 요청
3. 아이디/비밀번호 검증
4. JWT 토큰 생성 및 HTTP-only 쿠키에 저장
5. 클라이언트에서도 쿠키에 토큰 저장 (js-cookie)
6. 이후 모든 API 요청 시 쿠키의 토큰으로 인증
7. 서버 컴포넌트에서 `getSession()`으로 세션 확인

## 이미지 업로드 흐름

1. 사용자가 이미지 파일 선택
2. `ImageUpload` 컴포넌트가 `/api/upload`로 POST 요청
3. 서버에서 Supabase Storage에 업로드
4. Public URL 반환
5. URL을 `imageUrls` 배열에 추가
6. 주문 생성 시 `imageUrls` 배열과 함께 저장

## 작업 신청 흐름

1. 광고주가 작업 종류 선택
2. 필요시 내용 입력 및 이미지 업로드
3. `/api/orders`로 POST 요청
4. 서버에서 주문 생성 및 `remainingQuota` 차감
5. 성공 페이지로 리다이렉트

## 역할 기반 접근 제어

- **관리자 (`admin`)**: 모든 기능 접근 가능
- **광고주 (`client`)**: 자신의 주문만 조회/생성 가능
- API Routes에서 `withAuth` 미들웨어로 권한 검사
- 서버 컴포넌트에서 `getSession()`으로 역할 확인 후 리다이렉트

## 스타일링

- TailwindCSS 사용
- 모바일 우선 (Mobile-first) 디자인
- PC 화면은 최대 560px (광고주) / 7xl (관리자) 중앙 고정
- 반응형 그리드 및 레이아웃

## 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key
- `JWT_SECRET` - JWT 토큰 서명 키
- `NODE_ENV` - 환경 (development | production)

