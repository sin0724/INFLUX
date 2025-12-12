import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { cookies } from 'next/headers';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // username과 password의 앞뒤 공백 제거
    const trimmedUsername = username?.trim() || '';
    const trimmedPassword = password?.trim() || '';

    if (!trimmedUsername || !trimmedPassword) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Rate Limiting 체크
    const clientIp = getClientIp(request);
    const identifier = trimmedUsername; // 사용자명 기반으로 제한
    const rateLimitCheck = checkRateLimit(identifier);

    if (!rateLimitCheck.allowed) {
      const blockedUntil = rateLimitCheck.blockedUntil!;
      const minutesLeft = Math.ceil((blockedUntil - Date.now()) / (1000 * 60));
      
      return NextResponse.json(
        { 
          error: `너무 많은 로그인 시도가 있었습니다. ${minutesLeft}분 후에 다시 시도해주세요.`,
          rateLimitExceeded: true,
          blockedUntil: blockedUntil,
        },
        { status: 429 }
      );
    }

    const result = await login(trimmedUsername, trimmedPassword);

    if (!result.success) {
      // 실패한 시도 기록
      recordFailedAttempt(identifier);
      
      // 남은 시도 횟수 포함
      const remainingCheck = checkRateLimit(identifier);
      const remainingAttempts = remainingCheck.remainingAttempts;
      
      return NextResponse.json(
        { 
          error: result.error || '로그인에 실패했습니다.',
          remainingAttempts: remainingAttempts,
          ...(remainingAttempts <= 3 && remainingAttempts > 0 ? {
            warning: `로그인 시도가 ${10 - remainingAttempts}회 실패했습니다. ${remainingAttempts}회 더 실패하면 30분간 차단됩니다.`
          } : {})
        },
        { status: 401 }
      );
    }

    // 성공 시 Rate Limit 리셋
    resetRateLimit(identifier);

    // Set HTTP-only cookie (모바일 호환성 고려)
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 모바일 브라우저에서도 쿠키가 제대로 설정되도록 명시적 설정
    // 자동로그인: 만료 시간을 30일로 연장
    cookieStore.set('auth-token', result.token!, {
      httpOnly: true,
      secure: isProduction, // HTTPS에서만 secure 쿠키 전송
      sameSite: 'lax', // 모바일 호환성을 위해 lax 사용 (strict는 크로스 사이트 요청에서 문제 발생 가능)
      maxAge: 60 * 60 * 24 * 30, // 30 days (자동로그인)
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

