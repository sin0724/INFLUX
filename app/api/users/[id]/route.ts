import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// PATCH: Update user (admin/superadmin only)
async function updateUser(
  req: NextRequest,
  user: any,
  userId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { isActive, contractEndDate, contractStartDate, quota, username, companyName } = body;

    const updateData: any = {};
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    if (contractEndDate) {
      updateData.contractEndDate = contractEndDate;
    }
    
    if (contractStartDate) {
      updateData.contractStartDate = contractStartDate;
    }
    
    if (username !== undefined) {
      updateData.username = username;
    }
    
    if (companyName !== undefined) {
      updateData.companyName = companyName;
    }
    
    if (quota) {
      updateData.quota = quota;
      // totalQuota와 remainingQuota도 계산해서 업데이트
      const totalQuota = (quota.follower?.total || 0) + 
                         (quota.like?.total || 0) + 
                         (quota.hotpost?.total || 0) + 
                         (quota.momcafe?.total || 0);
      const remainingQuota = (quota.follower?.remaining || 0) + 
                             (quota.like?.remaining || 0) + 
                             (quota.hotpost?.remaining || 0) + 
                             (quota.momcafe?.remaining || 0);
      updateData.totalQuota = totalQuota;
      updateData.remainingQuota = remainingQuota;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, companyName, role, quota, contractStartDate, contractEndDate, isActive, createdAt')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '사용자 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 활동 로그 기록
    const targetType = data.role === 'admin' ? 'admin' : data.role === 'client' ? 'client' : 'user';
    let logAction: string = AdminActions.UPDATE_USER;
    
    if (isActive === false) {
      logAction = AdminActions.BLOCK_USER;
    } else if (isActive === true && updateData.hasOwnProperty('isActive')) {
      logAction = AdminActions.ACTIVATE_USER;
    }
    
    await logAdminActivity(
      user.id,
      user.username,
      logAction,
      targetType,
      userId,
      {
        updatedFields: Object.keys(updateData),
        previousStatus: data.isActive,
        ...updateData,
      },
      req
    );

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: '사용자 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete user (admin only)
async function deleteUser(
  req: NextRequest,
  user: any,
  userId: string
) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    // 삭제 전 사용자 정보 가져오기 (로그용)
    const { data: userData } = await supabase
      .from('users')
      .select('role, username')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      return NextResponse.json(
        { error: '사용자 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 활동 로그 기록
    if (userData) {
      const targetType = userData.role === 'admin' ? 'admin' : userData.role === 'client' ? 'client' : 'user';
      const logAction = userData.role === 'admin' ? AdminActions.DELETE_ADMIN : AdminActions.DELETE_USER;
      
      await logAdminActivity(
        user.id,
        user.username,
        logAction,
        targetType,
        userId,
        {
          deletedUsername: userData.username,
          deletedRole: userData.role,
        },
        req
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => updateUser(r, u, id), ['superadmin', 'admin'])(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => deleteUser(r, u, id), ['superadmin', 'admin'])(req);
}

