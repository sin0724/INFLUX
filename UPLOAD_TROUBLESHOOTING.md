# 이미지 업로드 문제 해결 가이드

## 현재 적용된 수정사항

1. ✅ 업로드 API에서 `supabaseAdmin` (Service Role Key) 사용으로 변경
2. ✅ 더 자세한 에러 메시지 추가
3. ✅ 파일 타입, 크기 검증 개선

## 문제 진단 방법

### 1. 브라우저 콘솔 확인
1. 브라우저에서 `F12` 또는 `Ctrl+Shift+I`로 개발자 도구 열기
2. **Console** 탭 확인
3. 이미지 업로드 시도 후 에러 메시지 확인

### 2. 네트워크 탭 확인
1. 개발자 도구에서 **Network** 탭 열기
2. 이미지 업로드 시도
3. `/api/upload` 요청 클릭
4. **Response** 탭에서 에러 메시지 확인

## 확인해야 할 사항

### 1. Supabase Storage 버킷 확인
- Supabase 대시보드 → Storage
- `order-images` 버킷이 존재하는지 확인
- 버킷이 **Public**으로 설정되어 있는지 확인

### 2. Storage 권한 정책 확인
SQL Editor에서 다음 정책이 설정되어 있는지 확인:

```sql
-- 확인용 쿼리
SELECT * FROM storage.policies WHERE bucket_id = 'order-images';
```

필요한 정책:
- Public 읽기 권한
- 인증된 사용자 업로드 권한

### 3. 환경 변수 확인
`.env.local` 파일에서 다음이 올바르게 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qpspzclporwtewabcwct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. 서버 재시작
환경 변수를 변경했다면 개발 서버를 재시작:

```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

## 일반적인 문제와 해결책

### 문제 1: "파일 업로드에 실패했습니다"
**원인**: Storage 버킷 권한 문제
**해결**: Storage 정책 재설정

```sql
-- Supabase SQL Editor에서 실행
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-images');
```

### 문제 2: "인증이 필요합니다"
**원인**: 로그인 세션 만료
**해결**: 다시 로그인

### 문제 3: "유효하지 않은 파일 형식입니다"
**원인**: 지원하지 않는 이미지 형식
**해결**: JPEG, JPG, PNG, WebP 형식만 지원

### 문제 4: "파일 크기는 5MB를 초과할 수 없습니다"
**원인**: 파일이 너무 큼
**해결**: 이미지 크기 축소 또는 다른 이미지 사용

## Storage 정책 재설정

문제가 계속되면 다음 SQL을 실행하세요:

```sql
-- 기존 정책 삭제 (선택사항)
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- 새 정책 생성
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-images');

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 디버깅 모드 활성화

더 자세한 에러 정보를 보려면:

1. 개발 서버 터미널에서 에러 로그 확인
2. 브라우저 콘솔에서 네트워크 에러 확인
3. Supabase 대시보드 → Logs에서 Storage 에러 확인

## 테스트 방법

간단한 테스트 이미지를 업로드해보세요:
1. 작은 크기의 JPEG 또는 PNG 이미지 준비
2. 작업 신청 페이지에서 업로드 시도
3. 에러 메시지 확인

