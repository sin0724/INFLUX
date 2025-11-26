-- 체크리스트 테이블 생성

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_checklist_items_admin_id ON checklist_items(admin_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_completed_by ON checklist_items(completed_by);
CREATE INDEX IF NOT EXISTS idx_checklist_items_is_completed ON checklist_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_checklist_items_due_date ON checklist_items(due_date);
CREATE INDEX IF NOT EXISTS idx_checklist_items_created_at ON checklist_items(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklist_items_updated_at_trigger
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_items_updated_at();

-- RLS (Row Level Security) 정책
-- 커스텀 인증 사용으로 인해 API 레벨에서 권한 체크하므로 RLS는 비활성화
ALTER TABLE checklist_items DISABLE ROW LEVEL SECURITY;
