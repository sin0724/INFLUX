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
    const { clientId, blogLinks, receiptLinks } = await req.json();

    // 하위 호환성을 위해 단일 링크도 배열로 변환
    const blogLinksArray = blogLinks 
      ? (Array.isArray(blogLinks) ? blogLinks : [blogLinks])
      : [];
    const receiptLinksArray = receiptLinks 
      ? (Array.isArray(receiptLinks) ? receiptLinks : [receiptLinks])
      : [];

    // 빈 링크 제거
    const validBlogLinks = blogLinksArray.filter((link: string) => link?.trim());
    const validReceiptLinks = receiptLinksArray.filter((link: string) => link?.trim());

    if (!clientId) {
      return NextResponse.json(
        { error: '광고주를 선택해주세요.' },
        { status: 400 }
      );
    }

    if (validBlogLinks.length === 0 && validReceiptLinks.length === 0) {
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
    const blogResults = {
      success: [] as string[],
      failed: [] as Array<{ link: string; error: string }>,
    };

    if (validBlogLinks.length > 0) {
      // Quota 확인
      if (!quota.blog || quota.blog.remaining < validBlogLinks.length) {
        return NextResponse.json(
          { error: `블로그 리뷰 남은 개수가 부족합니다. (필요: ${validBlogLinks.length}개, 남은 개수: ${quota.blog?.remaining || 0}개)` },
          { status: 400 }
        );
      }

      // 각 링크마다 주문 생성
      for (const blogLink of validBlogLinks) {
        try {
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
            blogResults.failed.push({
              link: blogLink,
              error: blogOrderError?.message || '주문 생성 실패',
            });
          } else {
            blogResults.success.push(blogLink);
            // Quota 차감
            quota.blog.remaining -= 1;
          }
        } catch (error: any) {
          blogResults.failed.push({
            link: blogLink,
            error: error.message || '알 수 없는 오류',
          });
        }
      }
    }

    // 영수증 리뷰 처리
    const receiptResults = {
      success: [] as string[],
      failed: [] as Array<{ link: string; error: string }>,
    };

    if (validReceiptLinks.length > 0) {
      // Quota 확인
      if (!quota.receipt || quota.receipt.remaining < validReceiptLinks.length) {
        return NextResponse.json(
          { error: `영수증 리뷰 남은 개수가 부족합니다. (필요: ${validReceiptLinks.length}개, 남은 개수: ${quota.receipt?.remaining || 0}개)` },
          { status: 400 }
        );
      }

      // 각 링크마다 주문 생성
      for (const receiptLink of validReceiptLinks) {
        try {
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
            receiptResults.failed.push({
              link: receiptLink,
              error: receiptOrderError?.message || '주문 생성 실패',
            });
          } else {
            receiptResults.success.push(receiptLink);
            // Quota 차감
            quota.receipt.remaining -= 1;
          }
        } catch (error: any) {
          receiptResults.failed.push({
            link: receiptLink,
            error: error.message || '알 수 없는 오류',
          });
        }
      }
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
      results: {
        blogSuccessCount: blogResults.success.length,
        blogFailedCount: blogResults.failed.length,
        blogResults: blogResults,
        receiptSuccessCount: receiptResults.success.length,
        receiptFailedCount: receiptResults.failed.length,
        receiptResults: receiptResults,
      },
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

