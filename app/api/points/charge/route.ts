import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

async function createChargeRequest(req: NextRequest, user: any) {
  try {
    const { points } = await req.json();

    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: '올바른 포인트를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (points < 1000) {
      return NextResponse.json(
        { error: '최소 1,000 포인트부터 충전 가능합니다.' },
        { status: 400 }
      );
    }

    // 부가세 10% 포함 금액 계산
    const amount = Math.round(points * 1.1);

    // 포인트 충전 신청 생성
    const { data: chargeRequest, error } = await supabase
      .from('point_charges')
      .insert({
        clientId: user.id,
        clientUsername: user.username,
        companyName: user.companyName || null,
        points,
        amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create charge request:', error);
      return NextResponse.json(
        { error: '포인트 충전 신청에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chargeRequest,
    });
  } catch (error) {
    console.error('Charge request error:', error);
    return NextResponse.json(
      { error: '포인트 충전 신청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createChargeRequest, ['client']);

