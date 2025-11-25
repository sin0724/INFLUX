'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  totalQuota?: number;
  remainingQuota?: number;
}

interface ClientSettingsProps {
  user: User;
}

export default function ClientSettings({ user: initialUser }: ClientSettingsProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">계정 설정</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">아이디</div>
            <div className="font-medium text-gray-900">{user.username}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">총 작업 가능 갯수</div>
            <div className="font-medium text-gray-900">
              {user.totalQuota || 0}건
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">남은 작업 갯수</div>
            <div className="font-medium text-gray-900 text-2xl text-primary-600">
              {user.remainingQuota || 0}건
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              작업 갯수 추가나 계정 정보 변경은 관리자에게 문의해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

