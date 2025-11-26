-- 네이버 비밀번호 암호화 마이그레이션
-- 주의: 이 스크립트는 Node.js에서 실행되어야 합니다 (암호화 함수 사용)
-- SQL만으로는 암호화할 수 없으므로 별도 마이그레이션 스크립트 필요

-- 이 파일은 참고용입니다.
-- 실제 마이그레이션은 scripts/migrate-naver-passwords.js를 사용하세요.

-- 기존 평문 데이터를 확인하는 쿼리
-- SELECT id, username, "naverPassword" 
-- FROM users 
-- WHERE "naverPassword" IS NOT NULL 
-- AND "naverPassword" NOT LIKE '%:%:%';

-- 암호화된 데이터 확인 (IV:Tag:Encrypted 형식)
-- SELECT id, username, "naverPassword" 
-- FROM users 
-- WHERE "naverPassword" IS NOT NULL 
-- AND "naverPassword" LIKE '%:%:%';
