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

// PATCH: Update order (admin 또는 본인 주문의 경우 client도 가능)
async function updateOrder(
  req: NextRequest,
  user: any,
  orderId: string
) {
  // 권한 확인: admin이거나, client인 경우 본인 주문만 수정 가능
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'client') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  // client인 경우 본인 주문인지 확인
  if (user.role === 'client') {
    const { data: orderData } = await supabase
      .from('orders')
      .select('clientId')
      .eq('id', orderId)
      .single();

    if (!orderData || orderData.clientId !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await req.json();
    const { 
      status, 
      caption, 
      imageUrls, 
      completedLink, 
      completedLink2, 
      reviewerName,
      draftText,
      revisionRequest,
      revisionText,
    } = body;

    const updateData: any = {};
    
    // 상태는 문자열로 자유롭게 저장 (기존 pending/working/done과 리뷰 신청 상태 모두 지원)
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (caption !== undefined) {
      updateData.caption = caption;
    }
    
    if (imageUrls !== undefined) {
      updateData.imageUrls = imageUrls;
    }
    
    if (completedLink !== undefined) {
      updateData.completedLink = completedLink || null;
    }
    
    if (completedLink2 !== undefined) {
      updateData.completedLink2 = completedLink2 || null;
    }
    
    if (reviewerName !== undefined) {
      updateData.reviewerName = reviewerName || null;
    }

    // 리뷰 신청 관련 필드
    if (draftText !== undefined) {
      updateData.draftText = draftText || null;
    }

    if (revisionRequest !== undefined) {
      updateData.revisionRequest = revisionRequest || null;
    }

    if (revisionText !== undefined) {
      updateData.revisionText = revisionText || null;
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

    if (error) {
      console.error('Supabase update error:', error);
      console.error('Update data:', JSON.stringify(updateData, null, 2));
      return NextResponse.json(
        { error: `주문 업데이트에 실패했습니다: ${error.message || error.details || '알 수 없는 오류'}` },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('No data returned from update');
      return NextResponse.json(
        { error: '주문 업데이트 후 데이터를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: `주문 업데이트 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
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

    // pending 또는 done 상태일 때 quota 복구 (완료된 링크 삭제 시에도 복구)
    if (orderData.status === 'pending' || orderData.status === 'done') {
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
                                 (quota.momcafe?.remaining || 0) +
                                 (quota.powerblog?.remaining || 0) +
                                 (quota.clip?.remaining || 0) +
                                 (quota.blog?.remaining || 0) +
                                 (quota.receipt?.remaining || 0) +
                                 (quota.myexpense?.remaining || 0);
          
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

