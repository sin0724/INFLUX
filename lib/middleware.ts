import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>,
  allowedRoles: ('superadmin' | 'admin' | 'client')[] = ['superadmin', 'admin', 'client']
) {
  return async (req: NextRequest) => {
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // superadmin은 모든 역할 허용
    const isAuthorized = allowedRoles.includes(user.role) || 
                        (user.role === 'superadmin' && (allowedRoles.includes('admin') || allowedRoles.includes('client')));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

// 권한 체크 헬퍼 함수
export function hasPermission(user: any, requiredRole: 'superadmin' | 'admin' | 'client'): boolean {
  if (user.role === 'superadmin') return true;
  if (requiredRole === 'admin' && user.role === 'admin') return true;
  if (requiredRole === 'client' && (user.role === 'admin' || user.role === 'client')) return true;
  return user.role === requiredRole;
}

// superadmin만 허용
export function requireSuperadmin(user: any): boolean {
  return user.role === 'superadmin';
}

// superadmin 또는 admin 허용
export function requireAdmin(user: any): boolean {
  return user.role === 'superadmin' || user.role === 'admin';
}

