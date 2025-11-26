import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// PATCH: Approve or reject point charge request (admin only)
async function updateChargeRequest(
  req: NextRequest,
  user: any,
  chargeId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { status, adminNote } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: '올바른 상태를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Get the charge request first
    const { data: chargeRequest, error: fetchError } = await supabase
      .from('point_charges')
      .select('*')
      .eq('id', chargeId)
      .single();

    if (fetchError || !chargeRequest) {
      return NextResponse.json(
        { error: '포인트 충전 신청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (chargeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 신청입니다.' },
        { status: 400 }
      );
    }

    // Update charge request
    const updateData: any = {
      status,
      adminId: user.id,
      adminUsername: user.username,
      adminNote: adminNote || null,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date().toISOString();
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('point_charges')
      .update(updateData)
      .eq('id', chargeId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update charge request:', updateError);
      return NextResponse.json(
        { error: '포인트 충전 신청 처리에 실패했습니다.' },
        { status: 500 }
      );
    }

    // If approved, add points to user
    if (status === 'approved') {
      const { data: clientUser, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('id', chargeRequest.clientId)
        .single();

      if (userError || !clientUser) {
        return NextResponse.json(
          { error: '사용자 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const newPoints = (clientUser.points || 0) + chargeRequest.points;

      const { error: pointsError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', chargeRequest.clientId);

      if (pointsError) {
        console.error('Failed to update user points:', pointsError);
        return NextResponse.json(
          { error: '포인트 충전에 실패했습니다.' },
          { status: 500 }
        );
      }

      // Log admin activity
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: AdminActions.APPROVE_POINT_CHARGE,
        target_type: 'point_charge',
        targetId: chargeId,
        details: {
          clientId: chargeRequest.clientId,
          clientUsername: chargeRequest.clientUsername,
          points: chargeRequest.points,
          amount: chargeRequest.amount,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    } else {
      // Log rejection
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: AdminActions.REJECT_POINT_CHARGE,
        target_type: 'point_charge',
        targetId: chargeId,
        details: {
          clientId: chargeRequest.clientId,
          clientUsername: chargeRequest.clientUsername,
          points: chargeRequest.points,
          amount: chargeRequest.amount,
          reason: adminNote,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    }

    return NextResponse.json({
      success: true,
      chargeRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Charge request update error:', error);
    return NextResponse.json(
      { error: '포인트 충전 신청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => updateChargeRequest(r, u, id), ['admin', 'superadmin'])(req);
}

