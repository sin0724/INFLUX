import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';

// GET: Get announcements
// 클라이언트: 활성화된 공지사항만 조회
// 관리자: 모든 공지사항 조회
async function getAnnouncements(req: NextRequest, user: any) {
  try {
    let query = supabaseAdmin
      .from('announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // 클라이언트는 활성화된 공지사항만 조회
    if (user.role === 'client') {
      query = query.eq('is_active', true);
      // 만료일 체크 (만료일이 있고 지났으면 제외)
      const now = new Date().toISOString();
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch announcements:', error);
      return NextResponse.json(
        { error: '공지사항을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcements: data || [] });
  } catch (error) {
    console.error('Get announcements error:', error);
    return NextResponse.json(
      { error: '공지사항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: Create announcement (관리자만)
async function createAnnouncement(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { title, content, is_active, priority, expires_at } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title: title.trim(),
        content: content.trim(),
        is_active: is_active !== undefined ? is_active : true,
        priority: priority || 'normal',
        created_by: user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create announcement:', error);
      return NextResponse.json(
        { error: '공지사항 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement: data }, { status: 201 });
  } catch (error) {
    console.error('Create announcement error:', error);
    return NextResponse.json(
      { error: '공지사항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAnnouncements, ['admin', 'client', 'superadmin']);
export const POST = withAuth(createAnnouncement, ['admin', 'superadmin']);

