import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// PATCH: Update user (admin only)
async function updateUser(
  req: NextRequest,
  user: any,
  userId: string
) {
  if (user.role !== 'admin') {
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
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
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
  return withAuth((r, u) => updateUser(r, u, id), ['admin'])(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => deleteUser(r, u, id), ['admin'])(req);
}

