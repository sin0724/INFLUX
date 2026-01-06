import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

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
      const newLink = completedLink || null;
      updateData.completedLink = newLink;
      
      // 새 링크가 있고, 다른 주문에 중복된 링크가 있으면 삭제
      if (newLink && newLink.trim()) {
        const trimmedLink = newLink.trim();
        // 중복된 링크만 정확히 삭제 (중복되지 않은 다른 링크는 유지)
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .neq('id', orderId)
          .eq('completedLink', trimmedLink); // 정확히 중복된 링크만 찾기
        
        if (existingOrders && existingOrders.length > 0) {
          console.log(`[DEBUG] ⚠️ completedLink 중복 감지! 중복된 링크만 삭제: "${trimmedLink}"`);
          await supabase
            .from('orders')
            .update({ completedLink: null })
            .neq('id', orderId)
            .eq('completedLink', trimmedLink); // 정확히 중복된 링크만 삭제
        }
      }
    }
    
    if (completedLink2 !== undefined) {
      const newLink2 = completedLink2 || null;
      updateData.completedLink2 = newLink2;
      
      // 새 링크가 있고, 다른 주문에 중복된 링크가 있으면 삭제
      if (newLink2 && newLink2.trim()) {
        const trimmedLink2 = newLink2.trim();
        // 중복된 링크만 정확히 삭제 (중복되지 않은 다른 링크는 유지)
        const { data: existingOrders2 } = await supabase
          .from('orders')
          .select('id')
          .neq('id', orderId)
          .eq('completedLink2', trimmedLink2); // 정확히 중복된 링크만 찾기
        
        if (existingOrders2 && existingOrders2.length > 0) {
          console.log(`[DEBUG] ⚠️ completedLink2 중복 감지! 중복된 링크만 삭제: "${trimmedLink2}"`);
          await supabase
            .from('orders')
            .update({ completedLink2: null })
            .neq('id', orderId)
            .eq('completedLink2', trimmedLink2); // 정확히 중복된 링크만 삭제
        }
      }
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

    // 관리자만 로그 기록 (client는 기록하지 않음)
    if ((user.role === 'admin' || user.role === 'superadmin') && data.client) {
      const logDetails: any = {
        orderId: orderId,
        clientId: data.clientId,
        username: data.client.username,
      };

      // 상태 변경 로그
      if (status !== undefined) {
        logDetails.status = status;
        logDetails.oldStatus = body.oldStatus || 'unknown';
        await logAdminActivity({
          adminId: user.id,
          adminUsername: user.username,
          action: AdminActions.UPDATE_ORDER_STATUS,
          target_type: 'order',
          targetId: orderId,
          details: logDetails,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        });
      }

      // 완료 링크 추가 로그
      if (completedLink !== undefined && completedLink) {
        logDetails.completedLink = completedLink;
        if (completedLink2) logDetails.completedLink2 = completedLink2;
        if (reviewerName) logDetails.reviewerName = reviewerName;
        await logAdminActivity({
          adminId: user.id,
          adminUsername: user.username,
          action: AdminActions.ADD_COMPLETED_LINK,
          target_type: 'order',
          targetId: orderId,
          details: logDetails,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        });
      }

      // 발주 수정 로그 (caption, imageUrls 변경)
      if ((caption !== undefined || imageUrls !== undefined) && !completedLink) {
        if (caption !== undefined) logDetails.caption = caption;
        if (imageUrls !== undefined) logDetails.imageUrls = imageUrls;
        await logAdminActivity({
          adminId: user.id,
          adminUsername: user.username,
          action: AdminActions.EDIT_ORDER,
          target_type: 'order',
          targetId: orderId,
          details: logDetails,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        });
      }
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

// DELETE: Delete order (admin 또는 본인 주문의 경우 client도 가능)
async function deleteOrder(
  req: NextRequest,
  user: any,
  orderId: string
) {
  // 권한 확인: admin이거나, client인 경우 본인 주문만 삭제 가능
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'client') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  // client인 경우 본인 주문인지 확인
  if (user.role === 'client') {
    const { data: orderCheck } = await supabase
      .from('orders')
      .select('clientId')
      .eq('id', orderId)
      .single();

    if (!orderCheck || orderCheck.clientId !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }
  }

  try {
    // 주문 정보 먼저 가져오기 (quota 복구용 및 로그용)
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select(`
        clientId, 
        taskType, 
        status, 
        caption,
        client:users!orders_clientId_fkey(id, username, companyName)
      `)
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
        
        // 리뷰 신청의 경우 quotaKey 매핑 (blog_review -> blog, receipt_review -> receipt)
        let quotaKey = taskType;
        if (taskType === 'blog_review') {
          quotaKey = 'blog';
        } else if (taskType === 'receipt_review') {
          quotaKey = 'receipt';
        }
        
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
        
        if (quota[quotaKey] && quota[quotaKey].remaining !== undefined) {
          quota[quotaKey].remaining += countToRestore;
          
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

    // 관리자만 로그 기록
    if ((user.role === 'admin' || user.role === 'superadmin') && orderData.client) {
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: AdminActions.DELETE_ORDER,
        target_type: 'order',
        targetId: orderId,
        details: {
          orderId: orderId,
          clientId: orderData.clientId,
          username: (orderData.client as any).username,
          companyName: (orderData.client as any).companyName,
          taskType: orderData.taskType,
          status: orderData.status,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
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
  return withAuth((r, u) => updateOrder(r, u, id), ['superadmin', 'admin', 'client'])(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth((r, u) => deleteOrder(r, u, id), ['superadmin', 'admin', 'client'])(req);
}

