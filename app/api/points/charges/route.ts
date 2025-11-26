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

  let query = supabaseAdmin
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

  // 상호명이 없는 경우 users 테이블에서 가져오기
  const chargeRequests = await Promise.all(
    (data || []).map(async (charge: any) => {
      if (!charge.companyName) {
        try {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('companyName')
            .eq('id', charge.clientId)
            .single();
          
          if (userData?.companyName) {
            charge.companyName = userData.companyName;
          }
        } catch (err) {
          console.error('Failed to fetch company name:', err);
        }
      }
      return charge;
    })
  );

  return NextResponse.json({ chargeRequests });
}

export const GET = withAuth(getChargeRequests, ['admin', 'superadmin']);

