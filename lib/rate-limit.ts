/**
 * Rate Limiting 유틸리티
 * 로그인 시도 제한 (관대한 설정)
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
  blockedUntil?: number;
}

// 메모리 기반 저장 (서버 재시작 시 초기화됨)
// 프로덕션에서는 Redis 등을 사용하는 것이 좋음
const rateLimitStore = new Map<string, RateLimitEntry>();

// 설정 (관대한 설정)
const MAX_ATTEMPTS = 10; // 최대 시도 횟수
const WINDOW_MS = 15 * 60 * 1000; // 15분
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30분 차단

/**
 * IP 주소 또는 사용자명 기반 Rate Limit 체크
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  resetAt?: number;
  blockedUntil?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // 차단된 경우
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: entry.blockedUntil,
    };
  }

  // 차단 시간이 지났으면 초기화
  if (entry?.blockedUntil && now >= entry.blockedUntil) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // 윈도우가 지났으면 초기화
  if (entry && now > entry.resetAt) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // 기존 엔트리가 있는 경우
  if (entry) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      // 차단 시작
      const blockedUntil = now + BLOCK_DURATION_MS;
      rateLimitStore.set(identifier, {
        ...entry,
        blockedUntil,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil,
      };
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - entry.attempts,
      resetAt: entry.resetAt,
    };
  }

  // 새로운 엔트리
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS,
  };
}

/**
 * 실패한 로그인 시도 기록
 */
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (entry && now < entry.resetAt) {
    // 기존 윈도우 내에서 시도 증가
    entry.attempts += 1;
  } else {
    // 새로운 윈도우 시작
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetAt: now + WINDOW_MS,
    });
  }
}

/**
 * 성공한 로그인 시도 리셋
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * IP 주소 추출 (프록시 고려)
 */
export function getClientIp(req: Request): string {
  // X-Forwarded-For 헤더 확인 (Railway 등에서 설정)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // 첫 번째 IP가 실제 클라이언트 IP
    return forwarded.split(',')[0].trim();
  }

  // X-Real-IP 헤더 확인
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // 기본값
  return 'unknown';
}
