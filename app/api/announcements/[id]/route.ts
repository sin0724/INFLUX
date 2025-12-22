import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH: Update announcement (관리자만)
async function updateAnnouncement(
  req: NextRequest,
  user: any,
  announcementId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { title, content, is_active, priority, expires_at } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (is_active !== undefined) updateData.is_active = is_active;
    if (priority !== undefined) updateData.priority = priority;
    if (expires_at !== undefined) updateData.expires_at = expires_at || null;

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update announcement:', error);
      return NextResponse.json(
        { error: '공지사항 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ announcement: data });
  } catch (error) {
    console.error('Update announcement error:', error);
    return NextResponse.json(
      { error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete announcement (관리자만)
async function deleteAnnouncement(
  req: NextRequest,
  user: any,
  announcementId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) {
      console.error('Failed to delete announcement:', error);
      return NextResponse.json(
        { error: '공지사항 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    (req, user) => updateAnnouncement(req, user, params.id),
    ['admin', 'superadmin']
  )(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(
    (req, user) => deleteAnnouncement(req, user, params.id),
    ['admin', 'superadmin']
  )(req);
}

