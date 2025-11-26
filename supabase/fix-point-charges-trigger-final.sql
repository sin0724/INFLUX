-- point_charges 테이블 트리거 완전 수정
-- Supabase SQL Editor에서 실행하세요
-- 이 SQL은 기존 트리거를 모두 삭제하고 올바른 트리거를 생성합니다.

-- 1. 기존 트리거 모두 삭제 (혹시 모를 충돌 방지)
DROP TRIGGER IF EXISTS update_point_charges_updated_at ON point_charges;
DROP TRIGGER IF EXISTS update_point_charges_updated_at_trigger ON point_charges;

-- 2. point_charges 전용 트리거 함수 생성 (updatedAt 사용)
CREATE OR REPLACE FUNCTION update_point_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 새로운 트리거 생성
CREATE TRIGGER update_point_charges_updated_at_trigger
BEFORE UPDATE ON point_charges
FOR EACH ROW
EXECUTE FUNCTION update_point_charges_updated_at();

-- 확인 메시지
SELECT 'point_charges 테이블 트리거가 성공적으로 생성되었습니다.' AS message;

