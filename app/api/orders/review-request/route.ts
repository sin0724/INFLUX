import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// POST: Create blog/receipt review request
async function createReviewRequest(req: NextRequest, user: any) {
  if (user.role !== 'client') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { taskType, imageUrls, videoUrl, guideFileUrl, guideText, useSavedGuide, customGuide } = await req.json();

    if (!taskType || (taskType !== 'blog_review' && taskType !== 'receipt_review')) {
      return NextResponse.json(
        { error: '유효하지 않은 작업 종류입니다.' },
        { status: 400 }
      );
    }

    // Get client's current quota and saved guide
    if (!user || !user.id) {
      console.error('Invalid user object:', user);
      return NextResponse.json(
        { error: '사용자 정보가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // Get client's current quota and saved guide
    // blogGuide와 receiptGuide는 선택적으로 조회 (컬럼이 없을 수 있음)
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, quota')
      .eq('id', user.id)
      .single();

    if (clientError) {
      console.error('Client data fetch error:', {
        error: clientError,
        userId: user.id,
        code: clientError.code,
        message: clientError.message,
        details: clientError.details,
        hint: clientError.hint
      });
      return NextResponse.json(
        { error: `사용자 정보를 찾을 수 없습니다. (${clientError.message || '알 수 없는 오류'})` },
        { status: 404 }
      );
    }

    if (!clientData) {
      console.error('Client data is null for user ID:', user.id);
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const quota = { ...(clientData.quota || {}) } as any;
    const quotaKey = taskType === 'blog_review' ? 'blog' : 'receipt';
    const taskQuota = quota[quotaKey];

    // Quota 확인 (1개월 플랜은 체크 우회)
    const isOneMonthPlan = !quota || (
      (quota.follower?.total || 0) === 0 &&
      (quota.like?.total || 0) === 0 &&
      (quota.hotpost?.total || 0) === 0 &&
      (quota.momcafe?.total || 0) === 0 &&
      (quota.blog?.total || 0) === 0 &&
      (quota.receipt?.total || 0) === 0 &&
      (quota.daangn?.total || 0) === 0 &&
      (quota.experience?.total || 0) === 0 &&
      (quota.powerblog?.total || 0) === 0 &&
      (quota.myexpense?.total || 0) === 0
    );

    if (!isOneMonthPlan && taskQuota && taskQuota.remaining < 1) {
      const taskNames: Record<string, string> = {
        blog_review: '블로그 리뷰',
        receipt_review: '영수증 리뷰',
      };
      return NextResponse.json(
        { error: `${taskNames[taskType]} 신청의 남은 개수가 부족합니다. (남은 개수: ${taskQuota.remaining}개)` },
        { status: 400 }
      );
    }

    // 가이드 처리
    let finalGuideFileUrl: string | null = null;
    let finalGuideText: string | null = null;
    
    if (useSavedGuide) {
      // 저장된 가이드 사용 (텍스트로 저장되어 있음)
      // blogGuide/receiptGuide 컬럼이 있을 경우에만 조회 시도
      try {
        const guideColumn = taskType === 'blog_review' ? 'blogGuide' : 'receiptGuide';
        const { data: guideData, error: guideError } = await supabase
          .from('users')
          .select(guideColumn)
          .eq('id', user.id)
          .single();
        
        if (!guideError && guideData) {
          finalGuideText = (guideData as any)[guideColumn] || null;
        }
      } catch (err) {
        // 컬럼이 없을 경우 에러를 무시하고 계속 진행
        console.warn('Guide column may not exist:', err);
        finalGuideText = null;
      }
    } else if (guideText) {
      // 텍스트로 가이드가 전달된 경우
      finalGuideText = guideText;
    } else {
      // 파일로 가이드가 전달된 경우
      finalGuideFileUrl = guideFileUrl || null;
    }

    // 블로그 리뷰는 1건씩, 영수증 리뷰는 여러건 가능
    const count = taskType === 'receipt_review' ? 1 : 1; // 영수증은 여러건이지만 API는 1건씩 호출

    // Create order
    const orderData: any = {
      clientId: user.id,
      taskType,
      imageUrls: imageUrls || [],
      status: 'pending',
      guideFileUrl: finalGuideFileUrl,
      guideText: finalGuideText,
    };

    if (taskType === 'blog_review' && videoUrl) {
      orderData.videoUrl = videoUrl;
    }

    if (customGuide && !useSavedGuide) {
      // 임시 가이드가 텍스트로 전달된 경우 처리 (필요시)
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: `주문 생성에 실패했습니다: ${orderError.message}` },
        { status: 500 }
      );
    }

    // Quota 차감 (1개월 플랜이 아닌 경우)
    if (!isOneMonthPlan && taskQuota && taskQuota.remaining > 0) {
      const newQuota = { ...quota };
      newQuota[quotaKey] = {
        ...taskQuota,
        remaining: Math.max(0, taskQuota.remaining - 1),
      };

      const { error: quotaError } = await supabase
        .from('users')
        .update({ quota: newQuota })
        .eq('id', user.id);

      if (quotaError) {
        console.error('Quota update error:', quotaError);
        // 주문은 생성되었지만 quota 차감 실패 - 로그만 남기고 계속 진행
      }
    }

    return NextResponse.json({
      order,
      message: '리뷰 신청이 완료되었습니다.',
    });
  } catch (error: any) {
    console.error('Review request creation error:', error);
    return NextResponse.json(
      { error: `리뷰 신청 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createReviewRequest, ['client']);

