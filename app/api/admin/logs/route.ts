import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireSuperadmin, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Get admin activity logs
// superadmin: admin 역할의 로그만 조회 (하위관리자 로그만)
// admin: 자신의 로그만 조회 가능
async function getAdminLogs(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const adminId = searchParams.get('adminId');
    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabaseAdmin
      .from('admin_activity_logs')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false });

    // superadmin이 아니면 자신의 로그만 조회
    if (user.role !== 'superadmin') {
      query = query.eq('adminId', user.id);
    } else {
      // superadmin은 admin 역할의 로그만 조회 (하위관리자 로그만)
      // admin_activity_logs 테이블에서 adminId로 users 테이블과 조인하여 role이 'admin'인 것만 필터링
      const { data: adminUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin');
      
      const adminIds = adminUsers?.map((u: any) => u.id) || [];
      
      if (adminIds.length > 0) {
        // 특정 admin의 로그를 조회하는 경우
        if (adminId) {
          // adminId가 실제 admin인지 확인
          if (adminIds.includes(adminId)) {
            query = query.eq('adminId', adminId);
          } else {
            // admin이 아니면 빈 결과
            query = query.eq('adminId', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // 모든 admin의 로그 조회
          query = query.in('adminId', adminIds);
        }
      } else {
        // admin이 없으면 빈 결과 반환
        query = query.eq('adminId', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    if (startDate) {
      query = query.gte('createdAt', startDate);
    }

    if (endDate) {
      query = query.lte('createdAt', endDate);
    }

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch admin logs:', error);
      return NextResponse.json(
        { error: '로그를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Get admin logs error:', error);
    return NextResponse.json(
      { error: `로그 조회 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAdminLogs, ['superadmin', 'admin']);

