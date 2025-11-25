# 🔐 관리자 시스템 개선 가이드

## 완료된 기능

### 1. 최고관리자(superadmin) 역할 추가
- 데이터베이스에 `superadmin` 역할 추가
- 최고관리자만 하위 관리자 계정 생성 가능

### 2. 하위 관리자 생성 기능
- 최고관리자가 일반 관리자(admin) 계정 생성 가능
- 일반 관리자는 광고주(client) 계정만 생성 가능

### 3. 관리자 활동 로그
- 모든 중요한 관리 작업 자동 기록
- 로그 조회 기능

---

## 📋 설정 단계

### 1단계: 데이터베이스 마이그레이션

Supabase SQL Editor에서 실행:

```sql
-- 파일: supabase/admin-system-migration.sql 실행
```

이 마이그레이션은:
- `users` 테이블의 role에 `superadmin` 추가
- `admin_activity_logs` 테이블 생성

### 2단계: 최고관리자 계정 생성

Supabase SQL Editor에서 실행:

```sql
-- 파일: CREATE_SUPERADMIN.sql 실행
-- 또는 아래 SQL 사용:

INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin',
  '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6',  -- 비밀번호: 1234
  'superadmin',
  0,
  0,
  true
)
ON CONFLICT (username) DO UPDATE
SET 
  role = 'superadmin',
  "isActive" = true,
  password = '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6';
```

**최고관리자 계정:**
- 아이디: `admin`
- 비밀번호: `1234`

### 3단계: 로그인 테스트

1. 배포된 사이트 접속
2. 로그인:
   - 아이디: `admin`
   - 비밀번호: `1234`
3. 관리자 대시보드에서 "관리자 관리" 메뉴 확인

---

## 🎯 기능 사용법

### 최고관리자 기능

1. **하위 관리자 생성**
   - 관리자 대시보드 → "관리자 관리" 클릭
   - "+ 관리자 추가" 버튼으로 새 관리자 계정 생성
   - 아이디와 비밀번호 입력

2. **활동 로그 조회**
   - 관리자 대시보드 → "활동 로그" 클릭
   - 모든 관리자의 활동 내역 조회
   - 필터링 가능 (액션, 대상, 날짜)

### 일반 관리자 기능

1. **광고주 계정 생성**
   - 관리자 대시보드 → "광고주 관리"
   - 광고주 계정만 생성 가능

2. **내 활동 로그 조회**
   - 관리자 대시보드 → "내 활동 로그"
   - 자신의 활동 내역만 조회

---

## 📊 기록되는 활동

다음 활동들이 자동으로 로그에 기록됩니다:

- ✅ 사용자 생성 (create_user, create_admin)
- ✅ 사용자 수정 (update_user)
- ✅ 사용자 삭제 (delete_user)
- ✅ 계정 차단/활성화 (block_user, activate_user)
- ✅ 계약 연장/재계약 (extend_contract, renew_contract)
- ✅ 발주 상태 변경 (update_order_status)
- ✅ 발주 삭제 (delete_order)
- ✅ 발주 수정 (edit_order)

---

## 🔒 권한 구조

```
superadmin (최고관리자)
  ├─ admin 계정 생성 가능
  ├─ client 계정 생성 가능
  └─ 모든 로그 조회 가능

admin (일반 관리자)
  ├─ client 계정만 생성 가능
  └─ 자신의 로그만 조회 가능

client (광고주)
  └─ 발주만 가능
```

---

## ✅ 확인 체크리스트

- [ ] 데이터베이스 마이그레이션 완료
- [ ] 최고관리자 계정 생성 완료
- [ ] 최고관리자 로그인 테스트
- [ ] 하위 관리자 계정 생성 테스트
- [ ] 활동 로그 조회 테스트
- [ ] 권한 체크 확인

---

## 📝 파일 위치

- **마이그레이션 SQL**: `supabase/admin-system-migration.sql`
- **최고관리자 생성 SQL**: `CREATE_SUPERADMIN.sql`
- **관리자 관리 UI**: `components/AdminsManagement.tsx`
- **활동 로그 UI**: `components/AdminActivityLogs.tsx`
- **로그 API**: `app/api/admin/logs/route.ts`
- **로그 유틸리티**: `lib/admin-logs.ts`

---

모든 설정이 완료되면 시스템이 준비되었습니다! 🎉

