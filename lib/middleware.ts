import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>,
  allowedRoles: ('admin' | 'client')[] = ['admin', 'client']
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

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

