-- ============================================
-- 블로그/영수증 리뷰 신청 기능 완전 마이그레이션
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요
-- ============================================

-- 1. orders 테이블 taskType에 blog_review, receipt_review 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_taskType_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_taskType_check 
CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn', 'experience', 'myexpense', 'blog_review', 'receipt_review'));

-- 2. orders 테이블에 리뷰 신청 워크플로우 필드 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "guideFileUrl" TEXT; -- 업로드한 가이드 파일 URL
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "guideText" TEXT; -- 고정 가이드 텍스트 (저장된 가이드 사용 시)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "useFixedGuide" BOOLEAN DEFAULT false; -- 고정 가이드 사용 여부
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "videoUrl" TEXT; -- 동영상 URL (블로그 리뷰용)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "draftText" TEXT; -- 원고 텍스트 (관리자가 업로드)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "revisionRequest" TEXT; -- 수정 요청 내용 (광고주가 입력)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "revisionText" TEXT; -- 수정된 원고 텍스트 (광고주가 직접 수정한 경우)

-- 인덱스 추가 (필요시)
CREATE INDEX IF NOT EXISTS idx_orders_guide_file_url ON orders("guideFileUrl") WHERE "guideFileUrl" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_video_url ON orders("videoUrl") WHERE "videoUrl" IS NOT NULL;

-- 3. users 테이블에 고정 가이드 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS "blogGuide" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "receiptGuide" TEXT;

-- 4. orders 테이블의 status CHECK constraint에 리뷰 워크플로우 상태 추가
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'working', 'done', 'draft_uploaded', 'revision_requested', 'draft_revised', 'client_approved', 'published'));

-- 완료 메시지
SELECT '✅ 블로그/영수증 리뷰 신청 기능을 위한 데이터베이스 변경이 완료되었습니다!' AS message;

