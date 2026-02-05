import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

interface ExcelRow {
  순번?: number | string;
  상호명: string;
  링크: string;
  [key: string]: any;
}

function normalizeUrl(url: string): string {
  return String(url).trim();
}

// 완료된 링크 모아보기 전용: 전산 미신청 건만 관리. 기존 주문(배포중 등)은 건드리지 않고 링크당 새 주문만 생성 + 쿼터 차감
async function bulkCreateBlogReceiptLink(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { rows, linkType } = await req.json();

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

    const clientMap = new Map<string, typeof allClients[0]>();
    allClients.forEach((client) => {
      if (client.companyName) {
        const normalizedName = client.companyName.trim().toLowerCase();
        clientMap.set(normalizedName, client);
        const nameWithoutSpaces = normalizedName.replace(/\s+/g, '');
        if (nameWithoutSpaces !== normalizedName) {
          clientMap.set(nameWithoutSpaces, client);
        }
      }
      const normalizedUsername = client.username.trim().toLowerCase();
      clientMap.set(normalizedUsername, client);
      const usernameWithoutSpaces = normalizedUsername.replace(/\s+/g, '');
      if (usernameWithoutSpaces !== normalizedUsername) {
        clientMap.set(usernameWithoutSpaces, client);
      }
    });

    const results = {
      success: [] as Array<{ row: ExcelRow; clientId: string; clientName: string }>,
      failed: [] as Array<{ row: ExcelRow; error: string }>,
    };

    const clientLinksMap = new Map<string, { client: typeof allClients[0]; links: string[] }>();

    for (const row of rows) {
      const companyName = String(row.상호명 || '').trim();
      const link = String(row.링크 || '').trim();

      if (!companyName) {
        results.failed.push({ row, error: '상호명이 없습니다.' });
        continue;
      }
      if (!link) {
        results.failed.push({ row, error: '링크가 없습니다.' });
        continue;
      }
      try {
        new URL(link);
      } catch {
        results.failed.push({ row, error: '유효하지 않은 링크 형식입니다.' });
        continue;
      }

      const normalizedCompanyName = companyName.trim().toLowerCase();
      let client = clientMap.get(normalizedCompanyName);
      if (!client) {
        client = clientMap.get(normalizedCompanyName.replace(/\s+/g, ''));
      }
      if (!client) {
        results.failed.push({
          row,
          error: `상호명 "${companyName}"에 해당하는 광고주를 찾을 수 없습니다.`,
        });
        continue;
      }

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
        const quota = JSON.parse(JSON.stringify((client as any).quota || {})) as any;
        const needNew = links.length;
        const remaining = quota[quotaType]?.remaining ?? 0;

        if (remaining < needNew) {
          for (const link of links) {
            const failedRow = rows.find((r: ExcelRow) => String(r.링크 || '').trim() === link);
            results.failed.push({
              row: failedRow || { 상호명: client.companyName || client.username, 링크: link },
              error: `${linkType === 'blog' ? '블로그' : '영수증'} 리뷰 남은 개수 부족 (필요: ${needNew}건, 남음: ${remaining}건)`,
            });
          }
          continue;
        }

        const successLinks: string[] = [];
        const failedLinks: Array<{ link: string; error: string }> = [];
        const seenNormalized = new Set<string>();

        for (const link of links) {
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
              is_link_only: true,
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
      message: `총 ${results.success.length}개의 링크가 성공적으로 추가되었습니다. (전산 미신청 전용)`,
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
