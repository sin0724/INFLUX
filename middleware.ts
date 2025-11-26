import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // HTTPS 강제 리다이렉트 (프로덕션 환경에서만)
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (request.url.startsWith('https://') ? 'https' : 'http');
    
    // HTTP로 접근한 경우 HTTPS로 리다이렉트
    if (protocol === 'http') {
      const url = request.nextUrl.clone();
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
