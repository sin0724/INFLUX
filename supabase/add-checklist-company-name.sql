-- 체크리스트 테이블에 상호명 필드 추가

ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 마감일 필드는 유지 (나중에 필요할 수 있으므로)
-- 제거하려면: ALTER TABLE checklist_items DROP COLUMN IF EXISTS due_date;
