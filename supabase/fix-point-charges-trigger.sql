-- point_charges 테이블 트리거 수정
-- Supabase SQL Editor에서 실행하세요

-- point_charges 전용 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_point_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS update_point_charges_updated_at ON point_charges;

CREATE TRIGGER update_point_charges_updated_at 
BEFORE UPDATE ON point_charges
FOR EACH ROW 
EXECUTE FUNCTION update_point_charges_updated_at();

