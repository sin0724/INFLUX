import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

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
      .select('quota, remainingQuota, username, companyName')
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

    // 중복 링크 체크 및 기존 링크 삭제
    const trimmedCompletedLink = completedLink.trim();
    const trimmedCompletedLink2 = completedLink2.trim();

    // completedLink 중복 체크 및 삭제
    const { data: existingOrders1, error: fetchError1 } = await supabaseAdmin
      .from('orders')
      .select('id, completedLink')
      .eq('clientId', clientId)
      .eq('taskType', 'myexpense')
      .eq('completedLink', trimmedCompletedLink);

    if (fetchError1) {
      console.error('[ERROR] Failed to check existing completedLink:', fetchError1);
    } else if (existingOrders1 && existingOrders1.length > 0) {
      console.log(`[DEBUG] ⚠️ completedLink 중복 감지! 중복된 링크만 삭제: "${trimmedCompletedLink}"`);
      // 중복된 링크만 정확히 삭제 (중복되지 않은 다른 링크는 유지)
      await supabaseAdmin
        .from('orders')
        .update({ completedLink: null })
        .eq('clientId', clientId)
        .eq('taskType', 'myexpense')
        .eq('completedLink', trimmedCompletedLink); // 정확히 중복된 링크만 삭제
    }

    // completedLink2 중복 체크 및 삭제
    const { data: existingOrders2, error: fetchError2 } = await supabaseAdmin
      .from('orders')
      .select('id, completedLink2')
      .eq('clientId', clientId)
      .eq('taskType', 'myexpense')
      .eq('completedLink2', trimmedCompletedLink2);

    if (fetchError2) {
      console.error('[ERROR] Failed to check existing completedLink2:', fetchError2);
    } else if (existingOrders2 && existingOrders2.length > 0) {
      console.log(`[DEBUG] ⚠️ completedLink2 중복 감지! 중복된 링크만 삭제: "${trimmedCompletedLink2}"`);
      // 중복된 링크만 정확히 삭제 (중복되지 않은 다른 링크는 유지)
      await supabaseAdmin
        .from('orders')
        .update({ completedLink2: null })
        .eq('clientId', clientId)
        .eq('taskType', 'myexpense')
        .eq('completedLink2', trimmedCompletedLink2); // 정확히 중복된 링크만 삭제
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

    // 로그 기록
    if (order && clientData) {
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: AdminActions.ADD_MYEXPENSE_LINK,
        target_type: 'order',
        targetId: order.id,
        details: {
          orderId: order.id,
          clientId: clientId,
          username: clientData.username,
          companyName: clientData.companyName || '',
          completedLink: completedLink.trim(),
          completedLink2: completedLink2.trim(),
          reviewerName: reviewerName.trim(),
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
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

