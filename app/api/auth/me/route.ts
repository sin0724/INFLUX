import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// 광고주 쿼터 등이 DB에서 갱신된 뒤 항상 최신 값 반환
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  // 계약 만료 체크 (클라이언트에게 최신 상태 전달)
  // 캐시 방지 헤더 추가
  return NextResponse.json(
    { user: session.user },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

