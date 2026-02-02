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

// 상태 우선순위: 진행된 건부터 링크 배정 (숫자 작을수록 우선)
const statusPriority: Record<string, number> = {
  deploying: 1,
  client_approved: 2,
  draft_revised: 3,
  draft_uploaded: 4,
  revision_requested: 5,
  working: 6,
  pending: 7,
  done: 8,
};

// POST: 엑셀 일괄 등록 — 기존 미완료 발주에 링크 넣기(quota 유지), 남는 링크는 새 주문 생성 + quota 차감
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

    // 모든 클라이언트 정보 가져오기 (상호명 매칭 + quota용)
    const { data: allClients, error: clientsError } = await supabaseAdmin
      .from('users')
      .select('id, username, companyName, quota, remainingQuota')
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

    const taskTypeValue = linkType === 'blog' ? 'blog_review' : 'receipt_review';
    const completedStatus = linkType === 'blog' ? 'published' : 'done';
    const quotaType = linkType === 'blog' ? 'blog' : 'receipt';

    for (const [clientId, { client, links }] of clientLinksMap.entries()) {
      try {
        const quota = { ...((client as any).quota || {}) } as any;

        const { data: openOrders, error: fetchOpenError } = await supabaseAdmin
          .from('orders')
          .select('id, status, createdAt')
          .eq('clientId', clientId)
          .eq('taskType', taskTypeValue)
          .is('completedLink', null)
          .order('createdAt', { ascending: true });

        if (fetchOpenError) {
          for (const link of links) {
            const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
            results.failed.push({
              row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
              error: '주문 목록 조회에 실패했습니다.',
            });
          }
          continue;
        }

        const sorted = (openOrders || []).slice().sort((a: any, b: any) => {
          const pa = statusPriority[a.status] ?? 99;
          const pb = statusPriority[b.status] ?? 99;
          return pa - pb || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const successLinks: string[] = [];
        const failedLinks: Array<{ link: string; error: string }> = [];

        const linksToExisting = links.slice(0, sorted.length);
        const linksForNew = links.slice(sorted.length);
        const needNew = linksForNew.length;

        if (needNew > 0) {
          const remaining = quota[quotaType]?.remaining ?? 0;
          if (remaining < needNew) {
            for (let i = sorted.length; i < links.length; i++) {
              failedLinks.push({
                link: links[i],
                error: `${linkType === 'blog' ? '블로그' : '영수증'} 리뷰 남은 개수 부족 (필요: ${needNew}건, 남음: ${remaining}건)`,
              });
            }
            linksForNew.length = 0;
          }
        }

        const seenNormalized = new Set<string>();

        for (let i = 0; i < linksToExisting.length; i++) {
          const link = linksToExisting[i];
          const trimmedLink = String(link).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (seenNormalized.has(normalizedLink)) {
            failedLinks.push({ link, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          seenNormalized.add(normalizedLink);
          const orderId = sorted[i].id;
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ completedLink: trimmedLink, status: completedStatus })
            .eq('id', orderId);
          if (updateError) {
            failedLinks.push({ link, error: updateError.message || '링크 반영 실패' });
          } else {
            successLinks.push(link);
          }
        }

        for (const link of linksForNew) {
          const trimmedLink = String(link).trim();
          const normalizedLink = normalizeUrl(trimmedLink);
          if (seenNormalized.has(normalizedLink)) {
            failedLinks.push({ link, error: '같은 링크가 중복 입력되었습니다.' });
            continue;
          }
          seenNormalized.add(normalizedLink);
          const { error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              clientId,
              taskType: taskTypeValue,
              caption: linkType === 'blog' ? '블로그 리뷰' : '영수증 리뷰',
              imageUrls: [],
              status: completedStatus,
              completedLink: trimmedLink,
            });
          if (insertError) {
            failedLinks.push({ link, error: insertError.message || '주문 생성 실패' });
          } else {
            successLinks.push(link);
            if (quota[quotaType] && quota[quotaType].remaining !== undefined) {
              quota[quotaType].remaining = Math.max(0, (quota[quotaType].remaining || 0) - 1);
            }
          }
        }

        for (const link of successLinks) {
          const successRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
          results.success.push({
            row: successRow || { 상호명: client.companyName || client.username, 링크: link },
            clientId: client.id,
            clientName: client.companyName || client.username,
          });
        }

        for (const { link, error } of failedLinks) {
          const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
          results.failed.push({
            row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
            error,
          });
        }

        if (successLinks.length > 0 && quota) {
          const totalRemaining = (quota.follower?.remaining || 0) + (quota.like?.remaining || 0) +
            (quota.hotpost?.remaining || 0) + (quota.momcafe?.remaining || 0) + (quota.powerblog?.remaining || 0) +
            (quota.clip?.remaining || 0) + (quota.blog?.remaining || 0) + (quota.receipt?.remaining || 0) +
            (quota.daangn?.remaining || 0) + (quota.experience?.remaining || 0) + (quota.myexpense?.remaining || 0);
          // DB에 반영: 링크 추가로 차감된 쿼터 저장 (광고주 화면 갯수 카운팅 반영)
          const quotaForDb = JSON.parse(JSON.stringify(quota));
          await supabaseAdmin
            .from('users')
            .update({ quota: quotaForDb, remainingQuota: totalRemaining })
            .eq('id', clientId);
        }
      } catch (error: any) {
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

