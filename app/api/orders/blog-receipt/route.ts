import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// URL 정규화 함수 - 완전히 동일한 URL만 중복으로 판단
// 정규화 없이 원본 그대로 비교 (공백 제거만)
function normalizeUrl(url: string): string {
  // 공백만 제거
  return String(url).trim();
}

// 상태 우선순위: 배포중/승인완료 등 진행된 건부터 링크 배정 (숫자 작을수록 우선)
const blogReceiptStatusPriority: Record<string, number> = {
  deploying: 1,
  client_approved: 2,
  draft_revised: 3,
  draft_uploaded: 4,
  revision_requested: 5,
  working: 6,
  pending: 7,
};

// POST: 링크 추가 — 기존 미완료 발주에 링크 넣기(quota 유지), 남는 링크는 새 주문 생성 + quota 차감
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

    const quota = { ...(clientData.quota || {}) } as any;

    const blogResults = {
      success: [] as string[],
      failed: [] as Array<{ link: string; error: string }>,
    };

    if (validBlogLinks.length > 0) {
      const { data: openBlogOrders, error: fetchOpenError } = await supabaseAdmin
        .from('orders')
        .select('id, status, createdAt')
        .eq('clientId', clientId)
        .eq('taskType', 'blog_review')
        .is('completedLink', null)
        .order('createdAt', { ascending: true });

      if (fetchOpenError) {
        for (const link of validBlogLinks) {
          blogResults.failed.push({ link, error: '주문 목록 조회에 실패했습니다.' });
        }
      } else {
        const sorted = (openBlogOrders || []).slice().sort((a: any, b: any) => {
          const pa = blogReceiptStatusPriority[a.status] ?? 99;
          const pb = blogReceiptStatusPriority[b.status] ?? 99;
          return pa - pb || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const linksToExisting = validBlogLinks.slice(0, sorted.length);
        const linksForNew = validBlogLinks.slice(sorted.length);
        const needNewCount = linksForNew.length;

        if (needNewCount > 0) {
          if (!quota.blog || (quota.blog.remaining ?? 0) < needNewCount) {
            for (let i = sorted.length; i < validBlogLinks.length; i++) {
              blogResults.failed.push({
                link: validBlogLinks[i],
                error: `블로그 리뷰 남은 개수 부족 (필요: ${needNewCount}건, 남음: ${quota.blog?.remaining ?? 0}건). 전산 미신청 건은 링크 추가 시 1건당 1개 차감됩니다.`,
              });
            }
            linksForNew.length = 0;
          }
        }

        const existingNormalized = new Set<string>();

        for (let i = 0; i < linksToExisting.length; i++) {
          const blogLink = linksToExisting[i];
          const trimmedLink = String(blogLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (existingNormalized.has(normalizedLink)) {
            blogResults.failed.push({ link: blogLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          existingNormalized.add(normalizedLink);
          const orderId = sorted[i].id;
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ completedLink: trimmedLink, status: 'published' })
            .eq('id', orderId);
          if (updateError) {
            blogResults.failed.push({ link: blogLink, error: updateError.message || '링크 반영에 실패했습니다.' });
          } else {
            blogResults.success.push(blogLink);
          }
        }

        for (const blogLink of linksForNew) {
          const trimmedLink = String(blogLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (existingNormalized.has(normalizedLink)) {
            blogResults.failed.push({ link: blogLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          existingNormalized.add(normalizedLink);
          const { data: newOrder, error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: 'blog_review',
              caption: '블로그 리뷰',
              imageUrls: [],
              status: 'published',
              completedLink: trimmedLink,
            })
            .select()
            .single();
          if (insertError || !newOrder) {
            blogResults.failed.push({ link: blogLink, error: insertError?.message || '주문 생성 실패' });
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

    if (validReceiptLinks.length > 0) {
      const { data: openReceiptOrders, error: fetchReceiptOpenError } = await supabaseAdmin
        .from('orders')
        .select('id, status, createdAt')
        .eq('clientId', clientId)
        .eq('taskType', 'receipt_review')
        .is('completedLink', null)
        .order('createdAt', { ascending: true });

      if (fetchReceiptOpenError) {
        for (const link of validReceiptLinks) {
          receiptResults.failed.push({ link, error: '주문 목록 조회에 실패했습니다.' });
        }
      } else {
        const sortedReceipt = (openReceiptOrders || []).slice().sort((a: any, b: any) => {
          const pa = blogReceiptStatusPriority[a.status] ?? 99;
          const pb = blogReceiptStatusPriority[b.status] ?? 99;
          return pa - pb || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const receiptToExisting = validReceiptLinks.slice(0, sortedReceipt.length);
        const receiptForNew = validReceiptLinks.slice(sortedReceipt.length);
        const needNewReceipt = receiptForNew.length;

        if (needNewReceipt > 0) {
          if (!quota.receipt || (quota.receipt.remaining ?? 0) < needNewReceipt) {
            for (let i = sortedReceipt.length; i < validReceiptLinks.length; i++) {
              receiptResults.failed.push({
                link: validReceiptLinks[i],
                error: `영수증 리뷰 남은 개수 부족 (필요: ${needNewReceipt}건, 남음: ${quota.receipt?.remaining ?? 0}건). 전산 미신청 건은 링크 추가 시 1건당 1개 차감됩니다.`,
              });
            }
            receiptForNew.length = 0;
          }
        }

        const existingReceiptNormalized = new Set<string>();

        for (let i = 0; i < receiptToExisting.length; i++) {
          const receiptLink = receiptToExisting[i];
          const trimmedLink = String(receiptLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (existingReceiptNormalized.has(normalizedLink)) {
            receiptResults.failed.push({ link: receiptLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          existingReceiptNormalized.add(normalizedLink);
          const orderId = sortedReceipt[i].id;
          const { error: updateReceiptError } = await supabaseAdmin
            .from('orders')
            .update({ completedLink: trimmedLink, status: 'done' })
            .eq('id', orderId);
          if (updateReceiptError) {
            receiptResults.failed.push({ link: receiptLink, error: updateReceiptError.message || '링크 반영에 실패했습니다.' });
          } else {
            receiptResults.success.push(receiptLink);
          }
        }

        for (const receiptLink of receiptForNew) {
          const trimmedLink = String(receiptLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (existingReceiptNormalized.has(normalizedLink)) {
            receiptResults.failed.push({ link: receiptLink, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          existingReceiptNormalized.add(normalizedLink);
          const { data: newOrder, error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: 'receipt_review',
              caption: '영수증 리뷰',
              imageUrls: [],
              status: 'done',
              completedLink: trimmedLink,
            })
            .select()
            .single();
          if (insertError || !newOrder) {
            receiptResults.failed.push({ link: receiptLink, error: insertError?.message || '주문 생성 실패' });
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

    const { error: quotaError } = await supabaseAdmin
      .from('users')
      .update({ quota, remainingQuota: totalRemaining })
      .eq('id', clientId);

    if (quotaError) {
      console.error('Failed to update quota:', quotaError);
    }

    // 로그 기록
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
          blogLinks: blogResults.success.slice(0, 5), // 처음 5개만 기록
          receiptLinks: receiptResults.success.slice(0, 5), // 처음 5개만 기록
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
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

