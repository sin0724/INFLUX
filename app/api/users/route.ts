import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

// GET: Get all users (admin only)
async function getUsers(req: NextRequest, user: any) {
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, companyName, role, totalQuota, remainingQuota, quota, contractStartDate, contractEndDate, isActive, createdAt')
    .order('createdAt', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: '사용자 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: data });
}

// POST: Create new user (admin only)
async function createUser(req: NextRequest, user: any) {
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { username, password, role, quota, contractStartDate, contractEndDate, companyName } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (role === 'client' && !quota) {
      return NextResponse.json(
        { error: '광고주 계정은 작업별 할당량(quota)이 필요합니다.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // 총 quota 계산 (하위 호환성을 위해)
    const totalQuota = role === 'client' && quota 
      ? (quota.follower?.total || 0) + (quota.like?.total || 0) + (quota.hotpost?.total || 0) + (quota.momcafe?.total || 0)
      : null;
    const remainingQuota = totalQuota;

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

    return NextResponse.json({ user: userData }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: `사용자 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUsers, ['admin']);
export const POST = withAuth(createUser, ['admin']);

