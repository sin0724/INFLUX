import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { logAdminActivity, AdminActions } from '@/lib/admin-logs';

// GET: Get all users (admin/superadmin only)
async function getUsers(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  // superadmin은 모든 사용자 조회, admin은 client와 admin만 조회
  let query = supabase
    .from('users')
    .select('id, username, companyName, role, totalQuota, remainingQuota, quota, contractStartDate, contractEndDate, isActive, notes, "naverId", "naverPassword", "placeLink", "businessType", optimization, reservation, reviewing, createdAt')
    .order('createdAt', { ascending: false });

  if (user.role !== 'superadmin') {
    // 일반 admin은 superadmin 제외
    query = query.neq('role', 'superadmin');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: '사용자 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }

  // 네이버 정보 접근 로깅
  if (data && data.length > 0) {
    const hasNaverInfo = data.some((u: any) => u.naverId || u.naverPassword);
    if (hasNaverInfo) {
      await logAdminActivity({
        adminId: user.id,
        adminUsername: user.username,
        action: 'view_naver_credentials',
        target_type: 'client',
        details: {
          viewedClients: data.filter((u: any) => u.naverId || u.naverPassword).map((u: any) => ({
            id: u.id,
            username: u.username,
            companyName: u.companyName,
          })),
          totalClients: data.length,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    }
  }

  // 네이버 비밀번호 복호화 (관리자에게만 표시)
  if (data) {
    const { decrypt } = await import('@/lib/encryption');
    
    // 각 클라이언트의 최근 주문 날짜 조회
    const clientIds = data.filter((u: any) => u.role === 'client').map((u: any) => u.id);
    
    let lastOrderDates: Record<string, string | null> = {};
    
    if (clientIds.length > 0) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('clientId, createdAt')
        .in('clientId', clientIds)
        .order('createdAt', { ascending: false });

      if (!ordersError && ordersData) {
        // 각 클라이언트별 최근 주문 날짜 저장
        const orderMap = new Map<string, string>();
        ordersData.forEach((order: any) => {
          if (!orderMap.has(order.clientId)) {
            orderMap.set(order.clientId, order.createdAt);
          }
        });
        
        clientIds.forEach((id: string) => {
          lastOrderDates[id] = orderMap.get(id) || null;
        });
      }
    }
    
    const decryptedData = data.map((user: any) => {
      const userData: any = {
        ...user,
        lastOrderDate: lastOrderDates[user.id] || null,
      };
      
      if (user.naverPassword) {
        userData.naverPassword = decrypt(user.naverPassword);
      }
      
      return userData;
    });

    return NextResponse.json({ users: decryptedData });
  }

  return NextResponse.json({ users: data || [] });
}

// POST: Create new user
// superadmin: admin, client 생성 가능
// admin: client만 생성 가능
async function createUser(req: NextRequest, user: any) {
  if (!requireAdmin(user)) {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { username, password, role, quota, contractStartDate, contractEndDate, companyName, notes, naverId, naverPassword, placeLink, businessType } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 권한 체크: superadmin은 admin/client 생성 가능, admin은 client만 생성 가능
    if (user.role === 'admin' && role !== 'client') {
      return NextResponse.json(
        { error: '일반 관리자는 광고주 계정만 생성할 수 있습니다.' },
        { status: 403 }
      );
    }

    // superadmin 계정 생성 방지
    if (role === 'superadmin' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: '최고관리자 계정은 생성할 수 없습니다.' },
        { status: 403 }
      );
    }

    if (role === 'client' && !quota) {
      return NextResponse.json(
        { error: '광고주 계정은 작업별 할당량(quota)이 필요합니다.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // 총 quota 계산 (하위 호환성을 위해) - 모든 작업 타입 포함
    let totalQuota: number | null = null;
    let remainingQuota: number | null = null;
    
    if (role === 'client' && quota) {
      totalQuota = (quota.follower?.total || 0) + 
                    (quota.like?.total || 0) + 
                    (quota.hotpost?.total || 0) + 
                    (quota.momcafe?.total || 0) +
                    (quota.powerblog?.total || 0) +
                    (quota.clip?.total || 0) +
                    (quota.blog?.total || 0) +
                    (quota.receipt?.total || 0) +
                    (quota.daangn?.total || 0) +
                    (quota.experience?.total || 0) +
                    (quota.myexpense?.total || 0);
      
      remainingQuota = (quota.follower?.remaining || 0) + 
                       (quota.like?.remaining || 0) + 
                       (quota.hotpost?.remaining || 0) + 
                       (quota.momcafe?.remaining || 0) +
                       (quota.powerblog?.remaining || 0) +
                       (quota.clip?.remaining || 0) +
                       (quota.blog?.remaining || 0) +
                       (quota.receipt?.remaining || 0) +
                       (quota.daangn?.remaining || 0) +
                       (quota.experience?.remaining || 0) +
                       (quota.myexpense?.remaining || 0);
    }

    // Insert data - 컬럼이 없을 경우를 대비해 조건부로 추가
    const insertData: any = {
      username,
      password: hashedPassword,
      role,
      totalQuota,
      remainingQuota,
    };

    // 상호명 추가 (클라이언트인 경우)
    if (role === 'client' && companyName) {
      insertData.companyName = companyName;
    }

    // quota 컬럼이 있는 경우만 추가
    if (role === 'client' && quota) {
      insertData.quota = quota;
    }

    // 계약 관련 컬럼이 있는 경우만 추가 (마이그레이션 후)
    if (contractStartDate) {
      insertData.contractStartDate = contractStartDate;
    }
    if (contractEndDate) {
      insertData.contractEndDate = contractEndDate;
    }
    if (role === 'client') {
      insertData.isActive = true;
    }

    // 추가 필드 (비고, 네이버 아이디/비밀번호, 플레이스 링크, 업종)
    if (notes !== undefined && notes !== '') {
      insertData.notes = notes;
    }
    if (naverId !== undefined && naverId !== '') {
      insertData.naverId = naverId;
    }
    if (naverPassword !== undefined && naverPassword !== '') {
      // 네이버 비밀번호 암호화
      const { encrypt } = await import('@/lib/encryption');
      insertData.naverPassword = encrypt(naverPassword);
    }
    if (placeLink !== undefined && placeLink !== '') {
      insertData.placeLink = placeLink;
    }
    if (businessType !== undefined && businessType !== '') {
      insertData.businessType = businessType;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 존재하는 사용자명입니다.' },
          { status: 400 }
        );
      }
      // 상세한 에러 메시지 전달
      return NextResponse.json(
        { error: `사용자 생성에 실패했습니다: ${error.message || error.details || '알 수 없는 오류'}` },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password: _, ...userData } = data;

    // 활동 로그 기록
    const logAction = role === 'admin' ? AdminActions.CREATE_ADMIN : AdminActions.CREATE_USER;
    const targetType = role === 'admin' ? 'admin' : role === 'client' ? 'client' : 'user';
    
    await logAdminActivity(
      user.id,
      user.username,
      logAction,
      targetType,
      data.id,
      {
        createdUsername: username,
        createdRole: role,
        quota: role === 'client' ? quota : undefined,
        companyName: companyName || undefined,
      },
      req
    );

    return NextResponse.json({ user: userData }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: `사용자 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUsers, ['superadmin', 'admin']);
export const POST = withAuth(createUser, ['superadmin', 'admin']);

