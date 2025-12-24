import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH: Update user's guide settings
async function updateGuides(req: NextRequest, user: any) {
  if (user.role !== 'client') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { blogGuide, receiptGuide } = await req.json();

    const updateData: any = {};
    if (blogGuide !== undefined) {
      updateData.blogGuide = blogGuide;
    }
    if (receiptGuide !== undefined) {
      updateData.receiptGuide = receiptGuide;
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Guide update error:', updateError);
      return NextResponse.json(
        { error: `가이드 저장에 실패했습니다: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '가이드가 성공적으로 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('Update guides error:', error);
    return NextResponse.json(
      { error: `가이드 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(updateGuides, ['client']);

