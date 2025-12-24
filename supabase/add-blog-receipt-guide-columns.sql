-- 블로그/영수증 가이드 컬럼 추가
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요

-- users 테이블에 고정 가이드 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS "blogGuide" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "receiptGuide" TEXT;

-- 완료 메시지
SELECT '✅ 블로그/영수증 가이드 컬럼이 성공적으로 추가되었습니다!' AS message;

