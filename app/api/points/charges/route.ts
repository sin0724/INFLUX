import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

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

  // 상호명이 없는 경우 users 테이블에서 조인하여 가져오기
  let query = supabaseAdmin
    .from('point_charges')
    .select(`
      *,
      client:users!point_charges_clientId_fkey(id, username, "companyName")
    `)
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

  // 상호명이 없는 경우 users 테이블에서 가져온 데이터로 보완
  const chargeRequests = (data || []).map((charge: any) => {
    if (!charge.companyName && charge.client?.companyName) {
      return {
        ...charge,
        companyName: charge.client.companyName,
      };
    }
    return charge;
  });

  return NextResponse.json({ chargeRequests });
}

export const GET = withAuth(getChargeRequests, ['admin', 'superadmin']);

