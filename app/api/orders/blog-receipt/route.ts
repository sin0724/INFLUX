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

      // 해당 광고주의 블로그 링크만 가져오기 (중복 체크용)
      // blog와 blog_review 모두 체크 (같은 링크가 두 가지 taskType으로 들어가는 것 방지)
      // status와 관계없이 completedLink가 있는 모든 주문을 체크
      const { data: existingBlogOrders, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id, clientId, taskType, status, completedLink')
        .eq('clientId', clientId)
        .in('taskType', ['blog', 'blog_review'])  // blog와 blog_review 모두 체크
        .not('completedLink', 'is', null);  // status 조건 제거: 모든 상태의 링크 체크

      if (fetchError) {
        console.error('[ERROR] Failed to fetch existing blog links:', fetchError);
      }

      // 해당 광고주의 기존 링크들을 정규화된 버전으로 변환하여 Set에 저장
      // 정규화된 링크 -> 주문 ID 배열 매핑 (같은 정규화된 링크를 가진 여러 주문이 있을 수 있음)
      const normalizedExistingLinks = new Set<string>();
      const normalizedLinksToOrderIds = new Map<string, string[]>(); // 정규화된 링크 -> 주문 ID 배열 매핑
      
      if (existingBlogOrders && existingBlogOrders.length > 0) {
        console.log(`[DEBUG] 광고주 ${clientId}의 기존 블로그 주문 개수: ${existingBlogOrders.length}`);
        existingBlogOrders.forEach((order: any) => {
          if (order.completedLink) {
            const originalLink = String(order.completedLink).trim();
            const normalized = normalizeUrl(originalLink);
            normalizedExistingLinks.add(normalized);
            
            // 정규화된 링크에 해당하는 주문 ID들을 배열로 저장
            if (!normalizedLinksToOrderIds.has(normalized)) {
              normalizedLinksToOrderIds.set(normalized, []);
            }
            normalizedLinksToOrderIds.get(normalized)!.push(order.id);
            console.log(`[DEBUG] 기존 링크 추가 - 주문ID: ${order.id}, 원본: "${originalLink}", 정규화: "${normalized}"`);
          }
        });
      } else {
        console.log(`[DEBUG] 광고주 ${clientId}의 기존 블로그 링크 없음`);
      }

      console.log(`[DEBUG] 최종 기존 링크 개수: ${normalizedExistingLinks.size}`);
      if (normalizedExistingLinks.size > 0) {
        console.log(`[DEBUG] 기존 링크 목록:`, Array.from(normalizedExistingLinks));
      }

      // 각 링크마다 주문 생성
      for (const blogLink of validBlogLinks) {
        try {
          const trimmedLink = String(blogLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          
          console.log(`[DEBUG] ========== 체크 시작 ==========`);
          console.log(`[DEBUG] 체크 중인 링크 - 원본: "${blogLink}"`);
          console.log(`[DEBUG] 체크 중인 링크 - trim: "${trimmedLink}"`);
          console.log(`[DEBUG] 체크 중인 링크 - 정규화: "${normalizedLink}"`);
          console.log(`[DEBUG] 기존 링크 Set에 존재 여부: ${normalizedExistingLinks.has(normalizedLink)}`);
          
          // 정확한 문자열 비교도 수행
          let exactMatch = false;
          let matchedLink = '';
          normalizedExistingLinks.forEach(existingLink => {
            if (existingLink === normalizedLink) {
              exactMatch = true;
              matchedLink = existingLink;
              console.log(`[DEBUG] 정확한 매칭 발견! 기존 링크: "${existingLink}"`);
            }
          });
          
          // 해당 광고주의 기존 링크와 중복 체크
          if (normalizedExistingLinks.has(normalizedLink)) {
            const duplicateOrderIds = normalizedLinksToOrderIds.get(normalizedLink) || [];
            console.log(`[DEBUG] ⚠️ 중복 감지! 정규화된 링크: "${normalizedLink}", 중복 주문 ID: [${duplicateOrderIds.join(', ')}]`);
            
            if (duplicateOrderIds.length > 0) {
              // 정규화된 링크가 일치하는 주문들만 정확히 삭제 (주문 ID로 정확히 매칭)
              const { error: deleteError } = await supabaseAdmin
                .from('orders')
                .update({ completedLink: null })
                .in('id', duplicateOrderIds); // 정규화된 링크가 일치하는 주문 ID들만 삭제
              
              if (deleteError) {
                console.error('[ERROR] Failed to delete existing link:', deleteError);
                blogResults.failed.push({
                  link: blogLink,
                  error: `기존 링크 삭제에 실패했습니다: ${deleteError.message}`,
                });
                continue;
              }
              
              console.log(`[DEBUG] ✅ 기존 링크 삭제 완료 (${duplicateOrderIds.length}개 주문), 새 링크 등록 진행`);
            } else {
              console.log(`[DEBUG] ⚠️ 중복 감지되었지만 삭제할 주문 ID를 찾을 수 없음`);
            }
          } else {
            console.log(`[DEBUG] ✅ 중복 없음, 등록 진행`);
          }

          console.log(`[DEBUG] ========== 체크 완료 ==========`);

          // Set에 추가하여 같은 배치 내 중복 방지
          normalizedExistingLinks.add(normalizedLink);

          const { data: blogOrder, error: blogOrderError } = await supabaseAdmin
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

          if (blogOrderError || !blogOrder) {
            console.error('Failed to create blog order:', {
              link: trimmedLink,
              error: blogOrderError,
              details: blogOrderError?.details,
              hint: blogOrderError?.hint,
              code: blogOrderError?.code,
            });
            
            // 더 자세한 오류 메시지 생성
            let errorMessage = '주문 생성 실패';
            if (blogOrderError) {
              if (blogOrderError.message) {
                errorMessage = blogOrderError.message;
              }
              if (blogOrderError.details) {
                errorMessage += `: ${blogOrderError.details}`;
              }
              if (blogOrderError.hint) {
                errorMessage += ` (${blogOrderError.hint})`;
              }
            }
            
            blogResults.failed.push({
              link: blogLink,
              error: errorMessage,
            });
          } else {
            blogResults.success.push(blogLink);
            // Quota 차감
            quota.blog.remaining -= 1;
            // 성공한 링크도 Set에 추가하여 같은 배치 내 중복 방지 (이미 추가됨)
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

      // 해당 광고주의 영수증 링크만 가져오기 (중복 체크용)
      // receipt와 receipt_review 모두 체크 (같은 링크가 두 가지 taskType으로 들어가는 것 방지)
      // status와 관계없이 completedLink가 있는 모든 주문을 체크
      const { data: existingReceiptOrders, error: fetchReceiptError } = await supabaseAdmin
        .from('orders')
        .select('id, clientId, taskType, status, completedLink')
        .eq('clientId', clientId)
        .in('taskType', ['receipt', 'receipt_review'])  // receipt와 receipt_review 모두 체크
        .not('completedLink', 'is', null);  // status 조건 제거: 모든 상태의 링크 체크

      if (fetchReceiptError) {
        console.error('[ERROR] Failed to fetch existing receipt links:', fetchReceiptError);
      }

      // 해당 광고주의 기존 링크들을 정규화된 버전으로 변환하여 Set에 저장
      // 정규화된 링크 -> 주문 ID 배열 매핑 (같은 정규화된 링크를 가진 여러 주문이 있을 수 있음)
      const normalizedExistingReceiptLinks = new Set<string>();
      const normalizedReceiptLinksToOrderIds = new Map<string, string[]>(); // 정규화된 링크 -> 주문 ID 배열 매핑
      
      if (existingReceiptOrders && existingReceiptOrders.length > 0) {
        console.log(`[DEBUG] 광고주 ${clientId}의 기존 영수증 주문 개수: ${existingReceiptOrders.length}`);
            existingReceiptOrders.forEach((order: any) => {
              if (order.completedLink) {
                const originalLink = String(order.completedLink).trim();
                const normalized = normalizeUrl(originalLink);
                normalizedExistingReceiptLinks.add(normalized);
                
                // 정규화된 링크에 해당하는 주문 ID들을 배열로 저장
                if (!normalizedReceiptLinksToOrderIds.has(normalized)) {
                  normalizedReceiptLinksToOrderIds.set(normalized, []);
                }
                normalizedReceiptLinksToOrderIds.get(normalized)!.push(order.id);
                console.log(`[DEBUG] 기존 링크 추가 - 주문ID: ${order.id}, 상태: ${order.status}, 원본: "${originalLink}", 정규화: "${normalized}"`);
              }
            });
      } else {
        console.log(`[DEBUG] 광고주 ${clientId}의 기존 영수증 링크 없음`);
      }

      console.log(`[DEBUG] 최종 기존 링크 개수: ${normalizedExistingReceiptLinks.size}`);
      if (normalizedExistingReceiptLinks.size > 0) {
        console.log(`[DEBUG] 기존 링크 목록:`, Array.from(normalizedExistingReceiptLinks));
      }

      // 각 링크마다 주문 생성
      for (const receiptLink of validReceiptLinks) {
        try {
          const trimmedLink = String(receiptLink).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          
          console.log(`[DEBUG] ========== 체크 시작 ==========`);
          console.log(`[DEBUG] 체크 중인 링크 - 원본: "${receiptLink}"`);
          console.log(`[DEBUG] 체크 중인 링크 - trim: "${trimmedLink}"`);
          console.log(`[DEBUG] 체크 중인 링크 - 정규화: "${normalizedLink}"`);
          console.log(`[DEBUG] 기존 링크 Set에 존재 여부: ${normalizedExistingReceiptLinks.has(normalizedLink)}`);
          
          // 해당 광고주의 기존 링크와 중복 체크
          if (normalizedExistingReceiptLinks.has(normalizedLink)) {
            const duplicateOrderIds = normalizedReceiptLinksToOrderIds.get(normalizedLink) || [];
            console.log(`[DEBUG] ⚠️ 중복 감지! 정규화된 링크: "${normalizedLink}", 중복 주문 ID: [${duplicateOrderIds.join(', ')}]`);
            
            if (duplicateOrderIds.length > 0) {
              // 정규화된 링크가 일치하는 주문들만 정확히 삭제 (주문 ID로 정확히 매칭)
              const { error: deleteError } = await supabaseAdmin
                .from('orders')
                .update({ completedLink: null })
                .in('id', duplicateOrderIds); // 정규화된 링크가 일치하는 주문 ID들만 삭제
              
              if (deleteError) {
                console.error('[ERROR] Failed to delete existing link:', deleteError);
                receiptResults.failed.push({
                  link: receiptLink,
                  error: `기존 링크 삭제에 실패했습니다: ${deleteError.message}`,
                });
                continue;
              }
              
              console.log(`[DEBUG] ✅ 기존 링크 삭제 완료 (${duplicateOrderIds.length}개 주문), 새 링크 등록 진행`);
            } else {
              console.log(`[DEBUG] ⚠️ 중복 감지되었지만 삭제할 주문 ID를 찾을 수 없음`);
            }
          } else {
            console.log(`[DEBUG] ✅ 중복 없음, 등록 진행`);
          }

          console.log(`[DEBUG] ========== 체크 완료 ==========`);

          const { data: receiptOrder, error: receiptOrderError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: 'receipt_review',
              caption: '영수증 리뷰',
              imageUrls: [],
              status: 'published',
              completedLink: trimmedLink,
            })
            .select()
            .single();

          if (receiptOrderError || !receiptOrder) {
            console.error('Failed to create receipt order:', {
              link: trimmedLink,
              error: receiptOrderError,
              details: receiptOrderError?.details,
              hint: receiptOrderError?.hint,
              code: receiptOrderError?.code,
            });
            
            // 더 자세한 오류 메시지 생성
            let errorMessage = '주문 생성 실패';
            if (receiptOrderError) {
              if (receiptOrderError.message) {
                errorMessage = receiptOrderError.message;
              }
              if (receiptOrderError.details) {
                errorMessage += `: ${receiptOrderError.details}`;
              }
              if (receiptOrderError.hint) {
                errorMessage += ` (${receiptOrderError.hint})`;
              }
            }
            
            receiptResults.failed.push({
              link: receiptLink,
              error: errorMessage,
            });
          } else {
            receiptResults.success.push(receiptLink);
            // Quota 차감
            quota.receipt.remaining -= 1;
            // 성공한 링크도 Set에 추가하여 같은 배치 내 중복 방지 (이미 추가됨)
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

