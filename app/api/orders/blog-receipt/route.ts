import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// POST: Create blog/receipt review completed links and deduct quota
async function createBlogReceiptLink(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { clientId, blogLink, receiptLink } = await req.json();

    if (!clientId) {
      return NextResponse.json(
        { error: '광고주를 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!blogLink?.trim() && !receiptLink?.trim()) {
      return NextResponse.json(
        { error: '블로그 리뷰 또는 영수증 리뷰 링크 중 하나는 입력해주세요.' },
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

    // 블로그 리뷰 처리
    if (blogLink?.trim()) {
      if (!quota.blog || quota.blog.remaining <= 0) {
        return NextResponse.json(
          { error: '블로그 리뷰 남은 개수가 없습니다.' },
          { status: 400 }
        );
      }

      // 주문 생성
      const { data: blogOrder, error: blogOrderError } = await supabaseAdmin
        .from('orders')
        .insert({
          clientId,
          taskType: 'blog',
          caption: '블로그 리뷰',
          imageUrls: [],
          status: 'done',
          completedLink: blogLink.trim(),
        })
        .select()
        .single();

      if (blogOrderError || !blogOrder) {
        console.error('Failed to create blog order:', blogOrderError);
        return NextResponse.json(
          { error: '블로그 리뷰 주문 생성에 실패했습니다.' },
          { status: 500 }
        );
      }

      // Quota 차감
      quota.blog.remaining -= 1;
    }

    // 영수증 리뷰 처리
    if (receiptLink?.trim()) {
      if (!quota.receipt || quota.receipt.remaining <= 0) {
        return NextResponse.json(
          { error: '영수증 리뷰 남은 개수가 없습니다.' },
          { status: 400 }
        );
      }

      // 주문 생성
      const { data: receiptOrder, error: receiptOrderError } = await supabaseAdmin
        .from('orders')
        .insert({
          clientId,
          taskType: 'receipt',
          caption: '영수증 리뷰',
          imageUrls: [],
          status: 'done',
          completedLink: receiptLink.trim(),
        })
        .select()
        .single();

      if (receiptOrderError || !receiptOrder) {
        console.error('Failed to create receipt order:', receiptOrderError);
        return NextResponse.json(
          { error: '영수증 리뷰 주문 생성에 실패했습니다.' },
          { status: 500 }
        );
      }

      // Quota 차감
      quota.receipt.remaining -= 1;
    }

    // 총 remainingQuota 계산 (모든 작업 타입 포함)
    const totalRemaining = (quota.follower?.remaining || 0) + 
                           (quota.like?.remaining || 0) + 
                           (quota.hotpost?.remaining || 0) + 
                           (quota.momcafe?.remaining || 0) +
                           (quota.powerblog?.remaining || 0) +
                           (quota.clip?.remaining || 0) +
                           (quota.blog?.remaining || 0) +
                           (quota.receipt?.remaining || 0);

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
      message: '링크가 성공적으로 추가되었습니다.',
    });
  } catch (error) {
    console.error('Create blog/receipt link error:', error);
    return NextResponse.json(
      { error: '링크 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createBlogReceiptLink, ['admin', 'superadmin']);

