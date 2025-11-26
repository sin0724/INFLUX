import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// GET: Get all point charge requests (admin only)
async function getChargeRequests(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('point_charges')
    .select('*')
    .order('createdAt', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch charge requests:', error);
    return NextResponse.json(
      { error: '포인트 충전 신청 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ chargeRequests: data || [] });
}

export const GET = withAuth(getChargeRequests, ['admin', 'superadmin']);

