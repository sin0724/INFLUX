-- point_charges 테이블 트리거 긴급 수정
-- Supabase SQL Editor에서 즉시 실행하세요
-- 이 SQL은 모든 기존 트리거를 삭제하고 올바른 트리거를 생성합니다.

-- 1. 기존 트리거 모두 삭제 (모든 가능한 이름 확인)
DROP TRIGGER IF EXISTS update_point_charges_updated_at ON point_charges;
DROP TRIGGER IF EXISTS update_point_charges_updated_at_trigger ON point_charges;
DROP TRIGGER IF EXISTS update_point_charges_updatedAt ON point_charges;

-- 2. 기존 함수 삭제 (충돌 방지)
DROP FUNCTION IF EXISTS update_point_charges_updated_at() CASCADE;

-- 3. point_charges 전용 트리거 함수 생성 (updatedAt 필드 사용)
CREATE OR REPLACE FUNCTION update_point_charges_updatedAt_function()
RETURNS TRIGGER AS $$
BEGIN
    -- updatedAt 필드가 존재하는지 확인하고 업데이트
    IF TG_TABLE_NAME = 'point_charges' THEN
        NEW."updatedAt" = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 새로운 트리거 생성
CREATE TRIGGER trigger_update_point_charges_updatedAt
BEFORE UPDATE ON point_charges
FOR EACH ROW
EXECUTE FUNCTION update_point_charges_updatedAt_function();

-- 확인: 트리거가 생성되었는지 확인
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'point_charges';

-- 성공 메시지
SELECT 'point_charges 테이블 트리거가 성공적으로 생성되었습니다.' AS result;

