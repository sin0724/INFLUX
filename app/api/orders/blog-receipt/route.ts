import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// URL 정규화 함수 - 완전히 동일한 URL만 중복으로 판단
function normalizeUrl(url: string): string {
  return String(url).trim();
}

// 완료된 링크 모아보기 전용: 전산 미신청 건만 관리. 기존 주문(배포중 등)은 건드리지 않고 항상 새 주문 생성 + 쿼터 차감
async function createBlogReceiptLink(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { clientId, blogLinks, receiptLinks } = await req.json();

    const blogLinksArray = blogLinks 
      ? (Array.isArray(blogLinks) ? blogLinks : [blogLinks])
      : [];
    const receiptLinksArray = receiptLinks 
      ? (Array.isArray(receiptLinks) ? receiptLinks : [receiptLinks])
      : [];

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

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('users')
      .select('id, username, companyName, quota, remainingQuota')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      return NextResponse.json(
        { error: '광고주 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const quota = JSON.parse(JSON.stringify(clientData.quota || {})) as any;

    const blogResults = {
      success: [] as string[],
      failed: [] as Array<{ link: string; error: string }>,
    };

    // 블로그: 기존 주문 매칭 없이 링크당 새 주문만 생성 (전산 미신청 전용)
    if (validBlogLinks.length > 0) {
      const needCount = validBlogLinks.length;
      if (!quota.blog || (quota.blog.remaining ?? 0) < needCount) {
        for (const link of validBlogLinks) {
          blogResults.failed.push({
            link,
            error: `블로그 리뷰 남은 개수 부족 (필요: ${needCount}건, 남음: ${quota.blog?.remaining ?? 0}건).`,
          });
        }
      } else {
        const seen = new Set<string>();
        for (const blogLink of validBlogLinks) {
          const trimmedLink = String(blogLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (seen.has(normalizedLink)) {
            blogResults.failed.push({ link: blogLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          seen.add(normalizedLink);
          const { error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: 'blog_review',
              caption: '블로그 리뷰',
              imageUrls: [],
              status: 'published',
              completedLink: trimmedLink,
              is_link_only: true,
            });
          if (insertError) {
            blogResults.failed.push({ link: blogLink, error: insertError.message || '주문 생성 실패' });
          } else {
            blogResults.success.push(blogLink);
            if (quota.blog && quota.blog.remaining !== undefined) {
              quota.blog.remaining = Math.max(0, (quota.blog.remaining || 0) - 1);
            }
          }
        }
      }
    }

    const receiptResults = {
      success: [] as string[],
      failed: [] as Array<{ link: string; error: string }>,
    };

    // 영수증: 기존 주문 매칭 없이 링크당 새 주문만 생성 (전산 미신청 전용)
    if (validReceiptLinks.length > 0) {
      const needCount = validReceiptLinks.length;
      if (!quota.receipt || (quota.receipt.remaining ?? 0) < needCount) {
        for (const link of validReceiptLinks) {
          receiptResults.failed.push({
            link,
            error: `영수증 리뷰 남은 개수 부족 (필요: ${needCount}건, 남음: ${quota.receipt?.remaining ?? 0}건).`,
          });
        }
      } else {
        const seen = new Set<string>();
        for (const receiptLink of validReceiptLinks) {
          const trimmedLink = String(receiptLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (seen.has(normalizedLink)) {
            receiptResults.failed.push({ link: receiptLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          seen.add(normalizedLink);
          const { error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: 'receipt_review',
              caption: '영수증 리뷰',
              imageUrls: [],
              status: 'done',
              completedLink: trimmedLink,
              is_link_only: true,
            });
          if (insertError) {
            receiptResults.failed.push({ link: receiptLink, error: insertError.message || '주문 생성 실패' });
          } else {
            receiptResults.success.push(receiptLink);
            if (quota.receipt && quota.receipt.remaining !== undefined) {
              quota.receipt.remaining = Math.max(0, (quota.receipt.remaining || 0) - 1);
            }
          }
        }
      }
    }

    const totalRemaining = (quota.follower?.remaining || 0) + (quota.like?.remaining || 0) + (quota.hotpost?.remaining || 0) +
      (quota.momcafe?.remaining || 0) + (quota.powerblog?.remaining || 0) + (quota.clip?.remaining || 0) +
      (quota.blog?.remaining || 0) + (quota.receipt?.remaining || 0) + (quota.daangn?.remaining || 0) +
      (quota.experience?.remaining || 0) + (quota.myexpense?.remaining || 0);

    const quotaForDb = JSON.parse(JSON.stringify(quota));
    const { error: quotaError } = await supabaseAdmin
      .from('users')
      .update({ quota: quotaForDb, remainingQuota: totalRemaining })
      .eq('id', clientId);

    if (quotaError) {
      console.error('Failed to update quota:', quotaError);
    }

    const totalSuccessCount = blogResults.success.length + receiptResults.success.length;
    if (totalSuccessCount > 0 && clientData) {
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: AdminActions.ADD_BLOG_RECEIPT_LINK,
        target_type: 'client',
        targetId: clientId,
        details: {
          clientId: clientId,
          username: clientData.username,
          companyName: clientData.companyName || '',
          blogLinksCount: blogResults.success.length,
          receiptLinksCount: receiptResults.success.length,
          blogLinks: blogResults.success.slice(0, 5),
          receiptLinks: receiptResults.success.slice(0, 5),
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    }

    return NextResponse.json({
      success: true,
      message: '링크가 성공적으로 추가되었습니다. (전산 미신청 전용 · 배포중 건은 리뷰 발주 내역에서 별도 관리)',
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
