import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// GET: Get orders
async function getOrders(req: NextRequest, user: any) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const taskType = searchParams.get('taskType');
  const clientId = searchParams.get('clientId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let query = supabase.from('orders').select(`
    *,
    client:users!orders_clientId_fkey(id, username, companyName)
  `);

  // If client, only show their orders
  if (user.role === 'client') {
    query = query.eq('clientId', user.id);
  } else if (clientId) {
    query = query.eq('clientId', clientId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (taskType) {
    query = query.eq('taskType', taskType);
  }

  if (startDate) {
    query = query.gte('createdAt', startDate);
  }

  if (endDate) {
    query = query.lte('createdAt', endDate);
  }

  query = query.order('createdAt', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: '주문 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders: data });
}

// POST: Create new order
async function createOrder(req: NextRequest, user: any) {
  try {
    const { taskType, caption, imageUrls, requestCount } = await req.json();

    if (!taskType) {
      return NextResponse.json(
        { error: '작업 종류를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 신청 개수 설정 (follower, like는 신청 개수, hotpost, momcafe는 1개)
    const countToDeduct = (taskType === 'follower' || taskType === 'like') 
      ? (requestCount || 1) 
      : 1;

    // Check if client has remaining quota for this task type
    if (user.role === 'client') {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('quota, remainingQuota')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: '사용자 정보를 가져오는데 실패했습니다.' },
          { status: 500 }
        );
      }

      // 작업별 quota 체크 (새 시스템)
      if (userData.quota) {
        const quota = userData.quota as any;
        
        // 인스타그램 팔로워/좋아요 통합 쿼터 체크
        if (taskType === 'follower' || taskType === 'like') {
          const totalInstagram = (quota.follower?.remaining || 0) + (quota.like?.remaining || 0);
          if (totalInstagram < countToDeduct) {
            return NextResponse.json(
              { error: `인스타그램 작업의 남은 개수가 부족합니다. (신청: ${countToDeduct}개, 남은: ${totalInstagram}개)` },
              { status: 400 }
            );
          }
        } else {
          const taskQuota = quota[taskType];
          
          if (!taskQuota) {
            const taskNames: Record<string, string> = {
              follower: '인스타그램 팔로워',
              like: '인스타그램 좋아요',
              hotpost: '인기게시물',
              momcafe: '맘카페',
              daangn: '당근마켓',
            };
            return NextResponse.json(
              { error: `${taskNames[taskType] || taskType} 작업이 설정되지 않았습니다.` },
              { status: 400 }
            );
          }

          // 신청 개수만큼 남은 개수 체크
          if (taskQuota.remaining < countToDeduct) {
            const taskNames: Record<string, string> = {
              follower: '인스타그램 팔로워',
              like: '인스타그램 좋아요',
              hotpost: '인기게시물',
              momcafe: '맘카페',
              daangn: '당근마켓',
            };
            return NextResponse.json(
              { error: `${taskNames[taskType] || taskType} 작업의 남은 개수가 부족합니다. (신청: ${countToDeduct}개, 남은: ${taskQuota.remaining}개)` },
              { status: 400 }
            );
          }
        }
      } else {
        // 기존 시스템 (하위 호환성)
        if (userData.remainingQuota < countToDeduct) {
          return NextResponse.json(
            { error: `남은 작업 가능 갯수가 부족합니다. (신청: ${countToDeduct}개, 남은: ${userData.remainingQuota}개)` },
            { status: 400 }
          );
        }
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        clientId: user.id,
        taskType,
        caption: caption || null,
        imageUrls: imageUrls || [],
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: `주문 생성에 실패했습니다: ${orderError.message || '알 수 없는 오류'}` },
        { status: 500 }
      );
    }

    // Decrease remaining quota for client
    if (user.role === 'client') {
      // Get current quota
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('quota, remainingQuota')
        .eq('id', user.id)
        .single();

      if (!fetchError && currentUser) {
        if (currentUser.quota) {
          // 작업별 quota 차감 (새 시스템)
          const quota = { ...currentUser.quota } as any;
          
          // 인스타그램 팔로워/좋아요 통합 쿼터 차감
          if (taskType === 'follower' || taskType === 'like') {
            const totalInstagram = (quota.follower?.remaining || 0) + (quota.like?.remaining || 0);
            const maxInstagram = totalInstagram;
            
            if (maxInstagram >= countToDeduct) {
              // 실제 taskType에 따라 차감
              if (!quota[taskType]) {
                quota[taskType] = { total: 0, remaining: 0 };
              }
              
              // 먼저 자신의 쿼터에서 차감 시도
              if (quota[taskType].remaining >= countToDeduct) {
                quota[taskType].remaining -= countToDeduct;
              } else {
                // 부족한 만큼 다른 쪽에서 빌려오기
                const otherType = taskType === 'follower' ? 'like' : 'follower';
                const needBorrow = countToDeduct - (quota[taskType].remaining || 0);
                const availableFromOther = quota[otherType]?.remaining || 0;
                
                quota[taskType].remaining = 0;
                quota[otherType] = quota[otherType] || { total: 0, remaining: 0 };
                quota[otherType].remaining = Math.max(0, availableFromOther - needBorrow);
              }
            } else {
              console.error(`Insufficient Instagram quota: requested ${countToDeduct}, available ${maxInstagram}`);
              return NextResponse.json(
                { error: `인스타그램 작업의 남은 개수가 부족합니다. (신청: ${countToDeduct}개, 남은: ${maxInstagram}개)` },
                { status: 400 }
              );
            }
          } else if (quota[taskType] && quota[taskType].remaining >= countToDeduct) {
            // 신청 개수만큼 차감
            quota[taskType].remaining -= countToDeduct;
          } else {
            console.error(`Insufficient quota for ${taskType}: requested ${countToDeduct}, available ${quota[taskType]?.remaining || 0}`);
            return NextResponse.json(
              { error: '쿼터 차감 중 오류가 발생했습니다.' },
              { status: 500 }
            );
          }
          
          // 총 remainingQuota 계산 (하위 호환성)
          const totalRemaining = (quota.follower?.remaining || 0) + 
                                 (quota.like?.remaining || 0) + 
                                 (quota.hotpost?.remaining || 0) + 
                                 (quota.momcafe?.remaining || 0) +
                                 (quota.powerblog?.remaining || 0) +
                                 (quota.clip?.remaining || 0) +
                                 (quota.blog?.remaining || 0) +
                                 (quota.receipt?.remaining || 0) +
                                 (quota.daangn?.remaining || 0);
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              quota,
              remainingQuota: totalRemaining
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update quota:', updateError);
          }
        } else {
          // 기존 시스템 (하위 호환성)
          const { error: updateError } = await supabase
            .from('users')
            .update({ remainingQuota: Math.max(0, currentUser.remainingQuota - countToDeduct) })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update quota:', updateError);
          }
        }
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: '주문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getOrders, ['admin', 'client']);
export const POST = withAuth(createOrder, ['client']);

