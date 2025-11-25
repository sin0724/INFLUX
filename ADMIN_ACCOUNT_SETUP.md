# 🔐 관리자 계정 생성 가이드

## ✅ 비밀번호 해시 생성 완료!

비밀번호 "1234"의 해시가 생성되었습니다:
```
$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6
```

---

## 🚀 Supabase SQL Editor에서 실행

### 1. Supabase 대시보드 접속
- https://supabase.com/dashboard
- 프로젝트 선택

### 2. SQL Editor 열기
- 좌측 메뉴에서 **"SQL Editor"** 클릭
- **"New query"** 클릭

### 3. 아래 SQL 복사하여 실행

```sql
-- 관리자 계정 생성
-- 비밀번호: 1234

INSERT INTO users (username, password, role, "totalQuota", "remainingQuota", "isActive")
VALUES (
  'admin1',
  '$2a$10$IVtiUrIAbb85wZUNd66AOu/WoxhdF/26IJVy33aQwSx0DASBQg8P6',
  'admin',
  0,
  0,
  true
)
ON CONFLICT (username) DO NOTHING;
```

### 4. 실행 확인
- **"Run"** 버튼 클릭
- "Success" 메시지 확인

### 5. 계정 확인 (선택사항)
```sql
-- 생성된 계정 확인
SELECT username, role, "isActive", "createdAt" 
FROM users 
WHERE username = 'admin1';
```

---

## ✅ 완료!

이제 배포된 사이트에서 로그인하세요:
- **URL**: Railway 배포 URL
- **아이디**: `admin1`
- **비밀번호**: `1234`

---

## 📝 참고

- `CREATE_ADMIN_ACCOUNT.sql` 파일에도 같은 SQL이 저장되어 있습니다.
- 파일을 열어서 복사해서 사용할 수 있습니다.

