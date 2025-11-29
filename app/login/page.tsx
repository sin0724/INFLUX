'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rate Limiting 차단 시
        if (response.status === 429 && data.blockedUntil) {
          setBlockedUntil(data.blockedUntil);
          setError(data.error || '로그인 시도가 제한되었습니다.');
          setWarning('');
        } else {
          // 일반 로그인 실패
          setError(data.error || '로그인에 실패했습니다.');
          setWarning(data.warning || '');
          
          // 차단 시간이 있으면 설정
          if (data.blockedUntil) {
            setBlockedUntil(data.blockedUntil);
          } else {
            setBlockedUntil(null);
          }
        }
        setLoading(false);
        return;
      }

      // 계약 만료 체크
      if (data.user.role === 'client') {
        if (data.user.contractEndDate) {
          const endDate = new Date(data.user.contractEndDate);
          const now = new Date();
          if (endDate < now || data.user.isActive === false) {
            setError('계약이 만료되었거나 계정이 차단되었습니다. 관리자에게 문의해주세요.');
            setLoading(false);
            return;
          }
        }
      }

      // 서버에서 httpOnly 쿠키가 설정되었으므로 클라이언트 쿠키 설정 불필요
      // 모바일 환경에서 쿠키가 제대로 설정되도록 전체 페이지 리로드 사용
      const redirectPath = data.user.role === 'admin' || data.user.role === 'superadmin' 
        ? '/admin' 
        : '/client';
      
      // 모바일에서 쿠키가 확실히 적용되도록 window.location 사용
      window.location.href = redirectPath;
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            {/* 로고 영역 - 최적화된 이미지 표시 */}
            <div className="mb-6 flex justify-center items-center min-h-[80px]">
              <img 
                src="/logo.png" 
                alt="인플루언서컴퍼니 로고" 
                className="h-16 sm:h-20 w-auto max-w-[300px] object-contain"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  // 이미지가 없으면 숨김
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                인플루언서컴퍼니
              </h1>
              <div className="w-24 h-1 bg-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600">캠페인 발주 시스템</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="font-medium mb-1">{error}</div>
                {blockedUntil && (
                  <div className="text-xs mt-2">
                    차단 해제까지 남은 시간: {Math.ceil((blockedUntil - Date.now()) / (1000 * 60))}분
                  </div>
                )}
              </div>
            )}
            {warning && !error && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
                {warning}
              </div>
            )}
            {!error && !warning && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-xs">
                <strong>보안 안내:</strong> 로그인 실패가 10회 누적되면 30분간 접근이 제한됩니다.
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="아이디를 입력하세요"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

