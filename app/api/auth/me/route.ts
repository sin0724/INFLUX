import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  // 계약 만료 체크 (클라이언트에게 최신 상태 전달)
  return NextResponse.json({ user: session.user });
}

