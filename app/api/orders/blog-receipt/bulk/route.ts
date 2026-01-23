import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

interface ExcelRow {
  순번?: number | string;
  상호명: string;
  링크: string;
  [key: string]: any;
}

// URL 정규화 함수 - 완전히 동일한 URL만 중복으로 판단
// 정규화 없이 원본 그대로 비교 (공백 제거만)
function normalizeUrl(url: string): string {
  // 공백만 제거
  return String(url).trim();
}

// POST: 엑셀 파일 데이터를 받아서 일괄 등록
async function bulkCreateBlogReceiptLink(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { rows, linkType } = await req.json(); // linkType: 'blog' | 'receipt'

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: '등록할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    if (!linkType || (linkType !== 'blog' && linkType !== 'receipt')) {
      return NextResponse.json(
        { error: '링크 타입이 올바르지 않습니다. (blog 또는 receipt)' },
        { status: 400 }
      );
    }

    // 모든 클라이언트 정보 가져오기 (상호명 매칭을 위해)
    const { data: allClients, error: clientsError } = await supabaseAdmin
      .from('users')
      .select('id, username, companyName')
      .eq('role', 'client');

    if (clientsError || !allClients) {
      return NextResponse.json(
        { error: '클라이언트 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 클라이언트 매칭을 위한 맵 생성 (상호명 또는 username으로 매칭)
    // 띄어쓰기를 제거한 버전도 저장하여 유연한 매칭 지원
    const clientMap = new Map<string, typeof allClients[0]>();
    allClients.forEach((client) => {
      // companyName으로 매칭
      if (client.companyName) {
        const normalizedName = client.companyName.trim().toLowerCase();
        clientMap.set(normalizedName, client);
        // 띄어쓰기 제거한 버전도 추가
        const nameWithoutSpaces = normalizedName.replace(/\s+/g, '');
        if (nameWithoutSpaces !== normalizedName) {
          clientMap.set(nameWithoutSpaces, client);
        }
      }
      // username으로도 매칭
      const normalizedUsername = client.username.trim().toLowerCase();
      clientMap.set(normalizedUsername, client);
      // 띄어쓰기 제거한 버전도 추가
      const usernameWithoutSpaces = normalizedUsername.replace(/\s+/g, '');
      if (usernameWithoutSpaces !== normalizedUsername) {
        clientMap.set(usernameWithoutSpaces, client);
      }
    });

    const results = {
      success: [] as Array<{ row: ExcelRow; clientId: string; clientName: string }>,
      failed: [] as Array<{ row: ExcelRow; error: string }>,
    };

    // 클라이언트별로 그룹화 (같은 클라이언트의 링크들을 한 번에 처리)
    const clientLinksMap = new Map<string, { client: typeof allClients[0]; links: string[] }>();

    // 각 행 처리
    for (const row of rows) {
      const companyName = String(row.상호명 || '').trim();
      const link = String(row.링크 || '').trim();

      if (!companyName) {
        results.failed.push({
          row,
          error: '상호명이 없습니다.',
        });
        continue;
      }

      if (!link) {
        results.failed.push({
          row,
          error: '링크가 없습니다.',
        });
        continue;
      }

      // URL 형식 검증
      try {
        new URL(link);
      } catch {
        results.failed.push({
          row,
          error: '유효하지 않은 링크 형식입니다.',
        });
        continue;
      }

      // 클라이언트 찾기 (대소문자 무시, 띄어쓰기 제거)
      const normalizedCompanyName = companyName.trim().toLowerCase();
      // 먼저 원본으로 검색
      let client = clientMap.get(normalizedCompanyName);
      // 없으면 띄어쓰기 제거한 버전으로 검색
      if (!client) {
        const nameWithoutSpaces = normalizedCompanyName.replace(/\s+/g, '');
        client = clientMap.get(nameWithoutSpaces);
      }

      if (!client) {
        results.failed.push({
          row,
          error: `상호명 "${companyName}"에 해당하는 광고주를 찾을 수 없습니다.`,
        });
        continue;
      }

      // 클라이언트별로 링크 그룹화
      if (!clientLinksMap.has(client.id)) {
        clientLinksMap.set(client.id, { client, links: [] });
      }
      clientLinksMap.get(client.id)!.links.push(link);
    }

    // 각 클라이언트별로 링크 등록
    for (const [clientId, { client, links }] of clientLinksMap.entries()) {
      try {
        // 클라이언트의 현재 quota 조회
        const { data: clientData, error: clientError } = await supabaseAdmin
          .from('users')
          .select('quota, remainingQuota')
          .eq('id', clientId)
          .single();

        if (clientError || !clientData) {
          // 각 링크를 실패로 기록
          for (const link of links) {
            const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
            results.failed.push({
              row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
              error: '클라이언트 정보를 찾을 수 없습니다.',
            });
          }
          continue;
        }

        const quota = { ...(clientData.quota || {}) } as any;
        const quotaType = linkType === 'blog' ? 'blog' : 'receipt';

        // Quota 확인
        if (!quota[quotaType] || quota[quotaType].remaining < links.length) {
          // 각 링크를 실패로 기록
          for (const link of links) {
            const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
            results.failed.push({
              row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
              error: `${linkType === 'blog' ? '블로그' : '영수증'} 리뷰 남은 개수가 부족합니다. (필요: ${links.length}개, 남은 개수: ${quota[quotaType]?.remaining || 0}개)`,
            });
          }
          continue;
        }

        // 해당 광고주의 기존 링크만 가져오기 (중복 체크용)
        // blog와 blog_review, receipt와 receipt_review 모두 체크 (같은 링크가 두 가지 taskType으로 들어가는 것 방지)
        // status와 관계없이 completedLink가 있는 모든 주문을 체크
        const taskTypeGroup = linkType === 'blog' ? ['blog', 'blog_review'] : ['receipt', 'receipt_review'];
        const { data: existingOrders, error: fetchError } = await supabaseAdmin
          .from('orders')
          .select('id, clientId, taskType, status, completedLink')
          .eq('clientId', clientId)
          .in('taskType', taskTypeGroup)  // blog/blog_review 또는 receipt/receipt_review 모두 체크
          .not('completedLink', 'is', null);  // status 조건 제거: 모든 상태의 링크 체크

        if (fetchError) {
          console.error(`[ERROR] Failed to fetch existing ${linkType} links for client ${clientId}:`, fetchError);
        }

        // 해당 광고주의 기존 링크들을 정규화된 버전으로 변환하여 Set에 저장
        // 정규화된 링크 -> 주문 ID 배열 매핑 (같은 정규화된 링크를 가진 여러 주문이 있을 수 있음)
        const normalizedExistingLinks = new Set<string>();
        const normalizedLinksToOrderIds = new Map<string, string[]>(); // 정규화된 링크 -> 주문 ID 배열 매핑
        
        if (existingOrders && existingOrders.length > 0) {
          console.log(`[DEBUG] 광고주 ${clientId} (${client.companyName || client.username})의 기존 ${linkType} 주문 개수: ${existingOrders.length}`);
          existingOrders.forEach((order: any) => {
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
          console.log(`[DEBUG] 광고주 ${clientId} (${client.companyName || client.username})의 기존 ${linkType} 링크 없음`);
        }

        console.log(`[DEBUG] 최종 기존 링크 개수: ${normalizedExistingLinks.size}`);
        if (normalizedExistingLinks.size > 0) {
          console.log(`[DEBUG] 기존 링크 목록:`, Array.from(normalizedExistingLinks));
        }

        // 각 링크마다 주문 생성
        const successLinks: string[] = [];
        const failedLinks: Array<{ link: string; error: string }> = [];

        for (const link of links) {
          try {
            const trimmedLink = String(link).trim();
            const normalizedLink = normalizeUrl(trimmedLink);
            
            console.log(`[DEBUG] ========== 체크 시작 ==========`);
            console.log(`[DEBUG] 체크 중인 링크 - 원본: "${link}"`);
            console.log(`[DEBUG] 체크 중인 링크 - trim: "${trimmedLink}"`);
            console.log(`[DEBUG] 체크 중인 링크 - 정규화: "${normalizedLink}"`);
            console.log(`[DEBUG] 기존 링크 Set에 존재 여부: ${normalizedExistingLinks.has(normalizedLink)}`);
            
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
                  failedLinks.push({
                    link,
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

            const { data: order, error: orderError } = await supabaseAdmin
              .from('orders')
              .insert({
                clientId,
                taskType: linkType === 'blog' ? 'blog_review' : 'receipt_review',
                caption: linkType === 'blog' ? '블로그 리뷰' : '영수증 리뷰',
                imageUrls: [],
                status: 'published',
                completedLink: trimmedLink,
              })
              .select()
              .single();

            if (orderError || !order) {
              console.error(`Failed to create ${linkType} order:`, orderError);
              failedLinks.push({
                link,
                error: orderError?.message || '주문 생성 실패',
              });
            } else {
              successLinks.push(link);
              quota[quotaType].remaining -= 1;
            }
          } catch (error: any) {
            failedLinks.push({
              link,
              error: error.message || '알 수 없는 오류',
            });
          }
        }

        // 성공한 링크들 기록
        for (const link of successLinks) {
          const successRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
          results.success.push({
            row: successRow || { 상호명: client.companyName || client.username, 링크: link },
            clientId: client.id,
            clientName: client.companyName || client.username,
          });
        }

        // 실패한 링크들 기록
        for (const { link, error } of failedLinks) {
          const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
          results.failed.push({
            row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
            error,
          });
        }

        // Quota 업데이트 (성공한 링크만 반영)
        if (successLinks.length > 0) {
          const totalRemaining = (quota.follower?.remaining || 0) + 
                                 (quota.like?.remaining || 0) + 
                                 (quota.hotpost?.remaining || 0) + 
                                 (quota.momcafe?.remaining || 0) +
                                 (quota.powerblog?.remaining || 0) +
                                 (quota.clip?.remaining || 0) +
                                 (quota.blog?.remaining || 0) +
                                 (quota.receipt?.remaining || 0) +
                                 (quota.myexpense?.remaining || 0);

          const { error: quotaError } = await supabaseAdmin
            .from('users')
            .update({
              quota,
              remainingQuota: totalRemaining,
            })
            .eq('id', clientId);

          if (quotaError) {
            console.error('Failed to update quota:', quotaError);
          }
        }
      } catch (error: any) {
        // 각 링크를 실패로 기록
        for (const link of links) {
          const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
          results.failed.push({
            row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
            error: error.message || '알 수 없는 오류',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${results.success.length}개의 링크가 성공적으로 추가되었습니다.`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk create blog/receipt link error:', error);
    return NextResponse.json(
      { error: '일괄 등록 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(bulkCreateBlogReceiptLink, ['admin', 'superadmin']);

