import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// PATCH: 체크리스트 아이템 수정
async function updateChecklistItem(
  req: NextRequest,
  user: any,
  itemId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { title, companyName, description, isCompleted, priority } = body;

    const updateData: any = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: '제목을 입력해주세요.' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (companyName !== undefined) {
      updateData.company_name = companyName?.trim() || null;
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (priority !== undefined) {
      updateData.priority = priority || 'medium';
    }

    // 완료 상태 변경
    if (isCompleted !== undefined) {
      updateData.is_completed = isCompleted;
      if (isCompleted) {
        updateData.completed_by = user.id;
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_by = null;
        updateData.completed_at = null;
      }
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .update(updateData)
      .eq('id', itemId)
      .select(`
        *,
        admin:users!checklist_items_admin_id_fkey(id, username),
        completedByUser:users!checklist_items_completed_by_fkey(id, username)
      `)
      .single();

    if (error) {
      console.error('Failed to update checklist item:', error);
      return NextResponse.json(
        { error: '체크리스트를 수정하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Update checklist item error:', error);
    return NextResponse.json(
      { error: '체크리스트를 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 체크리스트 아이템 삭제
async function deleteChecklistItem(
  req: NextRequest,
  user: any,
  itemId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Failed to delete checklist item:', error);
      return NextResponse.json(
        { error: '체크리스트를 삭제하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    return NextResponse.json(
      { error: '체크리스트를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => updateChecklistItem(r, u, id), ['admin', 'superadmin'])(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => deleteChecklistItem(r, u, id), ['admin', 'superadmin'])(req);
}
