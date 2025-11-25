import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await login(username, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '로그인에 실패했습니다.' },
        { status: 401 }
      );
    }

    // Set HTTP-only cookie (모바일 호환성 고려)
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 모바일 브라우저에서도 쿠키가 제대로 설정되도록 명시적 설정
    cookieStore.set('auth-token', result.token!, {
      httpOnly: true,
      secure: isProduction, // HTTPS에서만 secure 쿠키 전송
      sameSite: 'lax', // 모바일 호환성을 위해 lax 사용 (strict는 크로스 사이트 요청에서 문제 발생 가능)
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // 모든 경로에서 쿠키 사용 가능
    });

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

