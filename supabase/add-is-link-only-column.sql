-- orders 테이블에 '링크만 등록'(전산 미신청) 구분용 컬럼 추가
-- true: 관리자가 완료된 링크 모아보기에서 링크만 넣어서 생성한 주문
-- false/null: 광고주가 전산으로 신청한 후 진행된 주문
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_link_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN orders.is_link_only IS 'true = 관리자 링크만 등록(전산 미신청), false = 전산 신청 후 완료';
