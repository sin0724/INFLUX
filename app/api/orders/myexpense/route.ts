import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// POST: Create myexpense review completed links and deduct quota
async function createMyexpenseLink(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { clientId, completedLink, completedLink2, reviewerName } = await req.json();

    if (!clientId) {
      return NextResponse.json(
        { error: '광고주를 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!completedLink?.trim() || !completedLink2?.trim()) {
      return NextResponse.json(
        { error: '내돈내산 예약자 리뷰 링크와 블로그 리뷰 링크를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!reviewerName?.trim()) {
      return NextResponse.json(
        { error: '리뷰어 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Get client's current quota
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('users')
      .select('quota, remainingQuota')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      return NextResponse.json(
        { error: '광고주 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const quota = { ...(clientData.quota || {}) } as any;

    // 내돈내산 리뷰 quota 확인
    if (!quota.myexpense || quota.myexpense.remaining < 1) {
      return NextResponse.json(
        { error: `내돈내산 리뷰 남은 개수가 부족합니다. (필요: 1개, 남은 개수: ${quota.myexpense?.remaining || 0}개)` },
        { status: 400 }
      );
    }

    // 주문 생성
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        clientId,
        taskType: 'myexpense',
        caption: '내돈내산 리뷰',
        imageUrls: [],
        status: 'done',
        completedLink: completedLink.trim(),
        completedLink2: completedLink2.trim(),
        reviewerName: reviewerName.trim(),
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create myexpense order:', orderError);
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Quota 차감
    quota.myexpense.remaining -= 1;

    // 총 remainingQuota 계산 (모든 작업 타입 포함)
    const totalRemaining = (quota.follower?.remaining || 0) + 
                           (quota.like?.remaining || 0) + 
                           (quota.hotpost?.remaining || 0) + 
                           (quota.momcafe?.remaining || 0) +
                           (quota.powerblog?.remaining || 0) +
                           (quota.clip?.remaining || 0) +
                           (quota.blog?.remaining || 0) +
                           (quota.receipt?.remaining || 0) +
                           (quota.myexpense?.remaining || 0);

    // Quota 업데이트
    const { error: quotaError } = await supabaseAdmin
      .from('users')
      .update({
        quota,
        remainingQuota: totalRemaining,
      })
      .eq('id', clientId);

    if (quotaError) {
      console.error('Failed to update quota:', quotaError);
      return NextResponse.json(
        { error: 'Quota 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '내돈내산 리뷰 링크가 성공적으로 추가되었습니다.',
      order,
    });
  } catch (error) {
    console.error('Create myexpense link error:', error);
    return NextResponse.json(
      { error: '링크 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createMyexpenseLink, ['admin', 'superadmin']);

