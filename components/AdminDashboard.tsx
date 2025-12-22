'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { formatDate, formatNumber } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingOrders: 0,
    workingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/orders'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const clients = usersData.users.filter(
          (u: any) => u.role === 'client'
        );
        setStats((prev) => ({ ...prev, totalClients: clients.length }));
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const orders = ordersData.orders || [];
        setStats((prev) => ({
          ...prev,
          pendingOrders: orders.filter((o: any) => o.status === 'pending')
            .length,
          workingOrders: orders.filter((o: any) => o.status === 'working')
            .length,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">관리자 패널</h1>
              <p className="text-sm text-gray-600">{formatDate(today)}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">전체 광고주</div>
                <div className="text-4xl font-bold text-blue-900">
                  {formatNumber(stats.totalClients)}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-yellow-700 mb-1">대기중 작업</div>
                <div className="text-4xl font-bold text-yellow-900">
                  {formatNumber(stats.pendingOrders)}
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-700 mb-1">진행중 작업</div>
                <div className="text-4xl font-bold text-green-900">
                  {formatNumber(stats.workingOrders)}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/admin/clients')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  광고주 관리
                </div>
                <div className="text-sm text-gray-500">
                  광고주 계정 생성 및 관리
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/orders')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-purple-400 hover:bg-purple-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  발주 내역 관리
                </div>
                <div className="text-sm text-gray-500">
                  전체 작업 요청 리스트 및 상태 관리
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/completed-links')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-green-400 hover:bg-green-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  완료된 링크 모아보기
                </div>
                <div className="text-sm text-gray-500">
                  광고주별 완료된 작업 링크 확인
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/points/charges')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-400 hover:bg-orange-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  포인트 충전 관리
                </div>
                <div className="text-sm text-gray-500">
                  포인트 충전 신청 승인 및 관리
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/checklist')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  체크리스트
                </div>
                <div className="text-sm text-gray-500">
                  작업 체크리스트 관리 및 스케줄링
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/announcements')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-cyan-400 hover:bg-cyan-50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-1">
                  광고주 공지사항
                </div>
                <div className="text-sm text-gray-500">
                  광고주에게 표시할 공지사항 작성 및 관리
                </div>
              </div>
            </div>
          </button>

          {/* 최고관리자 전용 메뉴 */}
          {user.role === 'superadmin' && (
            <>
              <button
                onClick={() => router.push('/admin/admins')}
                className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-6 text-left hover:border-purple-400 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center group-hover:bg-purple-300 transition">
                    <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 text-xl mb-1 flex items-center gap-2">
                      관리자 관리
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-semibold">
                        최고관리자
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      하위 관리자 계정 생성 및 관리
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/logs')}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-gray-400 hover:bg-gray-50 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 text-xl mb-1">
                      활동 로그
                    </div>
                    <div className="text-sm text-gray-500">
                      관리자 활동 로그 조회
                    </div>
                  </div>
                </div>
              </button>
            </>
          )}

          {/* 일반 관리자용 활동 로그 */}
          {user.role === 'admin' && (
            <button
              onClick={() => router.push('/admin/logs')}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-gray-400 hover:bg-gray-50 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-xl mb-1">
                    내 활동 로그
                  </div>
                  <div className="text-sm text-gray-500">
                    내 활동 내역 조회
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

