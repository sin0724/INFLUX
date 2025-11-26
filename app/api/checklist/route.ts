import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// GET: 체크리스트 목록 조회
async function getChecklistItems(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    // 모든 체크리스트 아이템 조회 (작성자 정보 포함)
    const { data: items, error } = await supabase
      .from('checklist_items')
      .select(`
        *,
        admin:users!checklist_items_admin_id_fkey(id, username),
        completedByUser:users!checklist_items_completed_by_fkey(id, username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch checklist items:', error);
      return NextResponse.json(
        { error: '체크리스트를 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Get checklist items error:', error);
    return NextResponse.json(
      { error: '체크리스트를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 체크리스트 아이템 생성
async function createChecklistItem(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { companyName, description, priority } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { error: '상호명을 입력해주세요.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        admin_id: user.id,
        title: companyName.trim(), // title 필드는 DB 스키마상 필요하므로 상호명으로 채움
        company_name: companyName.trim(),
        description: description?.trim() || null,
        priority: priority || 'medium',
      })
      .select(`
        *,
        admin:users!checklist_items_admin_id_fkey(id, username),
        completedByUser:users!checklist_items_completed_by_fkey(id, username)
      `)
      .single();

    if (error) {
      console.error('Failed to create checklist item:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // 테이블이 없는 경우
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: '체크리스트 테이블이 생성되지 않았습니다.',
            details: 'Supabase SQL Editor에서 checklist_items 테이블을 생성해주세요.'
          },
          { status: 500 }
        );
      }
      
      // 외래 키 오류
      if (error.code === '23503') {
        return NextResponse.json(
          { 
            error: '사용자 정보를 찾을 수 없습니다.',
            details: '관리자 계정이 올바르게 설정되어 있는지 확인해주세요.'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: '체크리스트를 생성하는데 실패했습니다.',
          details: error.message || error.details || '알 수 없는 오류가 발생했습니다.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Create checklist item error:', error);
    return NextResponse.json(
      { error: '체크리스트를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getChecklistItems, ['admin', 'superadmin']);
export const POST = withAuth(createChecklistItem, ['admin', 'superadmin']);
