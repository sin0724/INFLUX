import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireSuperadmin, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Get admin activity logs
// superadmin: 모든 로그 조회 가능
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
    } else if (adminId) {
      // superadmin은 특정 관리자의 로그 조회 가능
      query = query.eq('adminId', adminId);
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

