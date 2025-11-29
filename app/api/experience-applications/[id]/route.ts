import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// PATCH: 체험단 신청 수정 (관리자만)
async function updateExperienceApplication(
  req: NextRequest,
  user: any,
  applicationId: string
) {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { status, completedLink } = body;

    const updateData: any = {};
    
    if (status && ['pending', 'reviewing', 'approved', 'rejected', 'completed'].includes(status)) {
      updateData.status = status;
    }
    
    if (completedLink !== undefined) {
      updateData.completedLink = completedLink?.trim() || null;
      // 완료 링크가 있으면 상태를 completed로 변경
      if (completedLink?.trim()) {
        updateData.status = 'completed';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('experience_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (error || !data) {
      console.error('Update experience application error:', error);
      return NextResponse.json(
        { error: '체험단 신청 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    console.error('Update experience application error:', error);
    return NextResponse.json(
      { error: '체험단 신청 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth((r, u) => updateExperienceApplication(r, u, params.id), ['admin', 'superadmin'])(req);
}

