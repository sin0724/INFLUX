import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// POST: 일괄 등록
async function bulkCreateUsers(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { clients } = body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { error: '등록할 광고주 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const results = {
      success: [] as any[],
      failed: [] as Array<{ row: number; username: string; error: string }>,
    };

    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i];
      const rowNumber = i + 2; // 엑셀 행 번호 (헤더 제외, 1-based)

      try {
        const { username, password, companyName, planType, contractStartDate, notes, naverId, naverPassword, businessType, optimization, reservation } = clientData;

        // 필수 필드 검증
        if (!username || !password) {
          results.failed.push({
            row: rowNumber,
            username: username || '(없음)',
            error: '아이디와 비밀번호는 필수입니다.',
          });
          continue;
        }

        // 플랜별 quota 계산
        const getQuotaByPlan = (plan: string) => {
          switch (plan) {
            case '1':
              return {
                follower: { total: 0, remaining: 0 },
                like: { total: 0, remaining: 0 },
                hotpost: { total: 3, remaining: 3 },
                momcafe: { total: 3, remaining: 3 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 10, remaining: 10 },
                receipt: { total: 20, remaining: 20 },
              };
            case '3':
              return {
                follower: { total: 0, remaining: 0 },
                like: { total: 0, remaining: 0 },
                hotpost: { total: 9, remaining: 9 },
                momcafe: { total: 9, remaining: 9 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 30, remaining: 30 },
                receipt: { total: 60, remaining: 60 },
              };
            case '6':
              return {
                follower: { total: 0, remaining: 0 },
                like: { total: 0, remaining: 0 },
                hotpost: { total: 18, remaining: 18 },
                momcafe: { total: 18, remaining: 18 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 60, remaining: 60 },
                receipt: { total: 120, remaining: 120 },
              };
            default:
              return {
                follower: { total: 0, remaining: 0 },
                like: { total: 0, remaining: 0 },
                hotpost: { total: 0, remaining: 0 },
                momcafe: { total: 0, remaining: 0 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 0, remaining: 0 },
                receipt: { total: 0, remaining: 0 },
              };
          }
        };

        const quota = getQuotaByPlan(planType || '1');
        const totalQuota = quota.hotpost.total + quota.momcafe.total;
        const remainingQuota = totalQuota;

        // 계약 종료일 계산
        let startDate: Date;
        if (contractStartDate) {
          const parsedDate = new Date(contractStartDate);
          if (isNaN(parsedDate.getTime())) {
            results.failed.push({
              row: rowNumber,
              username,
              error: '계약시작일 형식이 올바르지 않습니다. (YYYY-MM-DD 형식)',
            });
            continue;
          }
          startDate = parsedDate;
        } else {
          startDate = new Date();
        }

        // 계약 종료일 계산 - 안전한 방법
        const months = parseInt(String(planType || '1'), 10);
        if (isNaN(months) || months < 1 || months > 12) {
          results.failed.push({
            row: rowNumber,
            username,
            error: '이용기간은 1-12 사이의 숫자여야 합니다.',
          });
          continue;
        }
        
        // 안전한 날짜 계산
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        
        // 유효한 날짜인지 확인
        if (isNaN(endDate.getTime())) {
          results.failed.push({
            row: rowNumber,
            username,
            error: '계약 종료일 계산에 실패했습니다.',
          });
          continue;
        }

        const hashedPassword = await hashPassword(password);

        // 날짜 포맷팅 (YYYY-MM-DD)
        const formatDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const insertData: any = {
          username,
          password: hashedPassword,
          role: 'client',
          totalQuota,
          remainingQuota,
          quota,
          contractStartDate: formatDate(startDate),
          contractEndDate: formatDate(endDate),
          isActive: true,
        };

        if (companyName) {
          insertData.companyName = companyName;
        }
        if (notes) {
          insertData.notes = notes;
        }
        if (naverId) {
          insertData.naverId = naverId;
        }
        if (naverPassword) {
          const { encrypt } = await import('@/lib/encryption');
          insertData.naverPassword = encrypt(naverPassword);
        }
        if (businessType) {
          insertData.businessType = businessType;
        }
        if (optimization !== undefined) {
          insertData.optimization = Boolean(optimization);
        }
        if (reservation !== undefined) {
          insertData.reservation = Boolean(reservation);
        }

        const { data, error } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            results.failed.push({
              row: rowNumber,
              username,
              error: '이미 존재하는 사용자명입니다.',
            });
          } else {
            results.failed.push({
              row: rowNumber,
              username,
              error: error.message || '등록에 실패했습니다.',
            });
          }
          continue;
        }

        // 활동 로그 기록
        await logAdminActivity(
          user.id,
          user.username,
          AdminActions.CREATE_USER,
          'client',
          data.id,
          {
            createdUsername: username,
            createdRole: 'client',
            quota,
            companyName: companyName || undefined,
            bulkImport: true,
          },
          req
        );

        results.success.push({
          row: rowNumber,
          username,
          id: data.id,
        });
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          username: clientData.username || '(없음)',
          error: error.message || '등록 중 오류가 발생했습니다.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: clients.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed,
      },
    });
  } catch (error: any) {
    console.error('Bulk create users error:', error);
    return NextResponse.json(
      { error: `일괄 등록 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(bulkCreateUsers, ['superadmin', 'admin']);

