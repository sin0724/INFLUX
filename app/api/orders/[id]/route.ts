import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// GET: Get single order
async function getOrder(
  req: NextRequest,
  user: any,
  orderId: string
) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      client:users!orders_clientId_fkey(id, username, companyName)
    `)
    .eq('id', orderId)
    .single();

  const { data, error } = await query;

  if (error || !data) {
    return NextResponse.json(
      { error: '주문을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // Check permission
  if (user.role === 'client' && data.clientId !== user.id) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ order: data });
}

// PATCH: Update order (admin only)
async function updateOrder(
  req: NextRequest,
  user: any,
  orderId: string
) {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { status, caption, imageUrls } = body;

    const updateData: any = {};
    
    if (status && ['pending', 'working', 'done'].includes(status)) {
      updateData.status = status;
    }
    
    if (caption !== undefined) {
      updateData.caption = caption;
    }
    
    if (imageUrls !== undefined) {
      updateData.imageUrls = imageUrls;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        client:users!orders_clientId_fkey(id, username)
      `)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '주문 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: '주문 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete order (admin only)
async function deleteOrder(
  req: NextRequest,
  user: any,
  orderId: string
) {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    // 주문 정보 먼저 가져오기 (quota 복구용)
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('clientId, taskType, status, caption')
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 주문 삭제
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      return NextResponse.json(
        { error: '주문 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    // pending 상태였던 경우만 quota 복구
    if (orderData.status === 'pending') {
      const { data: userData } = await supabase
        .from('users')
        .select('quota')
        .eq('id', orderData.clientId)
        .single();

      if (userData && userData.quota) {
        const quota = { ...userData.quota } as any;
        const taskType = orderData.taskType;
        
        // 삭제할 개수 계산 (caption에서 추출)
        let countToRestore = 1; // 기본값: hotpost, momcafe는 1개
        if (taskType === 'follower' || taskType === 'like') {
          // caption에서 개수 추출
          const caption = orderData.caption || '';
          if (taskType === 'follower') {
            const match = caption.match(/팔로워 갯수:\s*(\d+)/);
            if (match) {
              countToRestore = parseInt(match[1]) || 1;
            }
          } else if (taskType === 'like') {
            const match = caption.match(/좋아요 갯수:\s*(\d+)/);
            if (match) {
              countToRestore = parseInt(match[1]) || 1;
            }
          }
        }
        
        if (quota[taskType] && quota[taskType].remaining !== undefined) {
          quota[taskType].remaining += countToRestore;
          
          // 총 remainingQuota 계산
          const totalRemaining = (quota.follower?.remaining || 0) + 
                                 (quota.like?.remaining || 0) + 
                                 (quota.hotpost?.remaining || 0) + 
                                 (quota.momcafe?.remaining || 0);
          
          await supabase
            .from('users')
            .update({ 
              quota,
              remainingQuota: totalRemaining
            })
            .eq('id', orderData.clientId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json(
      { error: '주문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => getOrder(r, u, id), ['admin', 'client'])(req);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => updateOrder(r, u, id), ['superadmin', 'admin'])(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => deleteOrder(r, u, id), ['superadmin', 'admin'])(req);
}

