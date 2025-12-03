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
        const { username, password, companyName, planType, contractStartDate, contractEndDate, isActive, notes, naverId, naverPassword, businessType, optimization, reservation, reviewing, quota: customQuota } = clientData;

        // 필수 필드 검증
        if (!username || !password) {
          results.failed.push({
            row: rowNumber,
            username: username || '(없음)',
            error: '아이디와 비밀번호는 필수입니다.',
          });
          continue;
        }

        // 플랜별 quota 계산 (일반 등록과 동일하게)
        const getQuotaByPlan = (plan: string) => {
          switch (plan) {
            case '1':
              // 1개월: 기획상품 - 자동 입력 없이 모두 수기로 입력
              return {
                follower: { total: 0, remaining: 0 },
                like: { total: 0, remaining: 0 },
                hotpost: { total: 0, remaining: 0 },
                momcafe: { total: 0, remaining: 0 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 0, remaining: 0 },
                receipt: { total: 0, remaining: 0 },
                daangn: { total: 0, remaining: 0 },
                experience: { total: 0, remaining: 0 },
                myexpense: { total: 0, remaining: 0 },
              };
            case '3':
              // 3개월: 블로그 리뷰 30개, 영수증 리뷰 60개, 인기게시물 3개, 맘카페 3개, 당근마켓 3개, 인스타팔로워/좋아요 통합 1000개, 체험단 1회
              return {
                follower: { total: 500, remaining: 500 }, // 통합 1000개 중 500개 (팔로워/좋아요 자유 선택 가능)
                like: { total: 500, remaining: 500 }, // 통합 1000개 중 500개 (팔로워/좋아요 자유 선택 가능)
                hotpost: { total: 3, remaining: 3 },
                momcafe: { total: 3, remaining: 3 },
                powerblog: { total: 0, remaining: 0 },
                clip: { total: 0, remaining: 0 },
                blog: { total: 30, remaining: 30 },
                receipt: { total: 60, remaining: 60 },
                daangn: { total: 3, remaining: 3 },
                experience: { total: 1, remaining: 1 },
                myexpense: { total: 0, remaining: 0 },
              };
            case '6':
              // 6개월: 블로그 리뷰 60개, 영수증 리뷰 120개, 인기게시물 6개, 맘카페 6개, 당근마켓 6개, 인스타팔로워/좋아요 통합 2000개, 파워블로그 2회, 체험단 2회
              return {
                follower: { total: 1000, remaining: 1000 }, // 통합 2000개 중 1000개 (팔로워/좋아요 자유 선택 가능)
                like: { total: 1000, remaining: 1000 }, // 통합 2000개 중 1000개 (팔로워/좋아요 자유 선택 가능)
                hotpost: { total: 6, remaining: 6 },
                momcafe: { total: 6, remaining: 6 },
                powerblog: { total: 2, remaining: 2 }, // 6개월 플랜만 파워블로그 2회
                clip: { total: 0, remaining: 0 },
                blog: { total: 60, remaining: 60 }, // 블로그 리뷰 60개
                receipt: { total: 120, remaining: 120 },
                daangn: { total: 6, remaining: 6 },
                experience: { total: 2, remaining: 2 },
                myexpense: { total: 0, remaining: 0 },
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
                daangn: { total: 0, remaining: 0 },
                experience: { total: 0, remaining: 0 },
                myexpense: { total: 0, remaining: 0 },
              };
          }
        };

        // 엑셀에서 제공된 quota가 있으면 사용, 없으면 플랜별 기본값 사용
        let quota = customQuota && Object.keys(customQuota).length > 0 ? customQuota : getQuotaByPlan(planType || '1');
        
        // quota 객체를 완전한 형태로 보장 (모든 필드가 total/remaining 구조를 가지도록)
        const ensureQuotaStructure = (q: any) => {
          const defaultQuota = getQuotaByPlan(planType || '1');
          const result: any = {};
          
          // 모든 quota 타입에 대해 처리
          const quotaTypes: Array<keyof typeof defaultQuota> = ['follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip', 'blog', 'receipt', 'daangn', 'experience', 'myexpense'];
          quotaTypes.forEach(type => {
            if (q[type] && typeof q[type] === 'object' && q[type].total !== undefined) {
              result[type] = {
                total: Number(q[type].total) || 0,
                remaining: Number(q[type].remaining) !== undefined ? Number(q[type].remaining) : Number(q[type].total) || 0,
              };
            } else if (defaultQuota[type]) {
              result[type] = defaultQuota[type];
            } else {
              result[type] = { total: 0, remaining: 0 };
            }
          });
          
          return result;
        };
        
        quota = ensureQuotaStructure(quota);
        
        // totalQuota는 모든 작업 타입의 합계 (호환성을 위해)
        const totalQuota = quota.follower.total + quota.like.total + quota.hotpost.total + quota.momcafe.total + quota.powerblog.total + quota.clip.total + quota.blog.total + quota.receipt.total + (quota.daangn?.total || 0) + (quota.experience?.total || 0) + (quota.myexpense?.total || 0);
        const remainingQuota = quota.follower.remaining + quota.like.remaining + quota.hotpost.remaining + quota.momcafe.remaining + quota.powerblog.remaining + quota.clip.remaining + quota.blog.remaining + quota.receipt.remaining + (quota.daangn?.remaining || 0) + (quota.experience?.remaining || 0) + (quota.myexpense?.remaining || 0);

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

        // 계약 종료일 처리: 엑셀에서 제공된 값이 있으면 사용, 없으면 자동 계산
        let endDate: Date;
        if (contractEndDate) {
          const parsedEndDate = new Date(contractEndDate);
          if (isNaN(parsedEndDate.getTime())) {
            results.failed.push({
              row: rowNumber,
              username,
              error: '계약종료일 형식이 올바르지 않습니다. (YYYY-MM-DD 형식)',
            });
            continue;
          }
          endDate = parsedEndDate;
        } else {
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
          endDate = new Date(startDate);
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
          isActive: isActive !== undefined ? Boolean(isActive) : true,
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
        if (reviewing !== undefined) {
          insertData.reviewing = Boolean(reviewing);
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

// PATCH: 일괄 수정
async function bulkUpdateUsers(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { ids, data: updateData } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '수정할 광고주 ID가 없습니다.' },
        { status: 400 }
      );
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    // 업데이트할 데이터 준비
    const updatePayload: any = {};
    if (updateData.businessType !== undefined) {
      updatePayload.businessType = updateData.businessType || null;
    }
    if (updateData.optimization !== undefined) {
      updatePayload.optimization = Boolean(updateData.optimization);
    }
    if (updateData.reservation !== undefined) {
      updatePayload.reservation = Boolean(updateData.reservation);
    }
    if (updateData.reviewing !== undefined) {
      updatePayload.reviewing = Boolean(updateData.reviewing);
    }
    if (updateData.isActive !== undefined) {
      updatePayload.isActive = Boolean(updateData.isActive);
    }

    // 일괄 업데이트 실행
    const { data: updatedUsers, error } = await supabase
      .from('users')
      .update(updatePayload)
      .in('id', ids)
      .select('id, username, role');

    if (error) {
      return NextResponse.json(
        { error: `일괄 수정에 실패했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    // 성공한 항목들 기록
    if (updatedUsers) {
      results.success = updatedUsers.map(u => u.id);
    }

    // 활동 로그 기록
    for (const updatedUser of updatedUsers || []) {
      await logAdminActivity(
        user.id,
        user.username,
        AdminActions.UPDATE_USER,
        updatedUser.role === 'admin' ? 'admin' : 'client',
        updatedUser.id,
        {
          updatedUsername: updatedUser.username,
          updateData: updatePayload,
          bulkUpdate: true,
        },
        req
      );
    }

    return NextResponse.json({
      success: true,
      results: {
        total: ids.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed,
      },
    });
  } catch (error: any) {
    console.error('Bulk update users error:', error);
    return NextResponse.json(
      { error: `일괄 수정 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

// DELETE: 일괄 삭제
async function bulkDeleteUsers(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '삭제할 광고주 ID가 없습니다.' },
        { status: 400 }
      );
    }

    // 삭제 전 사용자 정보 가져오기 (로그용)
    const { data: usersToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id, username, role')
      .in('id', ids);

    if (fetchError) {
      return NextResponse.json(
        { error: `사용자 정보 조회에 실패했습니다: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // 일괄 삭제 실행
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', ids);

    if (deleteError) {
      return NextResponse.json(
        { error: `일괄 삭제에 실패했습니다: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // 활동 로그 기록
    for (const deletedUser of usersToDelete || []) {
      const targetType = deletedUser.role === 'admin' ? 'admin' : deletedUser.role === 'client' ? 'client' : 'user';
      const logAction = deletedUser.role === 'admin' ? AdminActions.DELETE_ADMIN : AdminActions.DELETE_USER;
      
      await logAdminActivity(
        user.id,
        user.username,
        logAction,
        targetType,
        deletedUser.id,
        {
          deletedUsername: deletedUser.username,
          deletedRole: deletedUser.role,
          bulkDelete: true,
        },
        req
      );
    }

    return NextResponse.json({
      success: true,
      results: {
        total: ids.length,
        successCount: usersToDelete?.length || 0,
        failedCount: 0,
      },
    });
  } catch (error: any) {
    console.error('Bulk delete users error:', error);
    return NextResponse.json(
      { error: `일괄 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(bulkCreateUsers, ['superadmin', 'admin']);
export const PATCH = withAuth(bulkUpdateUsers, ['superadmin', 'admin']);
export const DELETE = withAuth(bulkDeleteUsers, ['superadmin', 'admin']);

