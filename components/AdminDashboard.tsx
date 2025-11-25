'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { formatDate } from '@/lib/utils';

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
    totalOrders: 0,
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
          totalOrders: orders.length,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">전체 광고주</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalClients}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">전체 발주</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalOrders}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200 bg-yellow-50">
            <div className="text-sm text-yellow-700">대기중</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {stats.pendingOrders}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200 bg-blue-50">
            <div className="text-sm text-blue-700">진행중</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {stats.workingOrders}
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/admin/clients')}
            className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900 text-lg mb-2">
              광고주 관리
            </div>
            <div className="text-sm text-gray-600">
              광고주 계정 생성 및 관리
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/orders')}
            className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900 text-lg mb-2">
              발주 내역 관리
            </div>
            <div className="text-sm text-gray-600">
              전체 작업 요청 리스트 및 상태 관리
            </div>
          </button>

          {/* 최고관리자 전용 메뉴 */}
          {user.role === 'superadmin' && (
            <>
              <button
                onClick={() => router.push('/admin/admins')}
                className="bg-white border border-purple-200 rounded-lg p-6 text-left hover:border-purple-300 hover:bg-purple-50 transition"
              >
                <div className="font-medium text-gray-900 text-lg mb-2">
                  관리자 관리
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    최고관리자
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  하위 관리자 계정 생성 및 관리
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/logs')}
                className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-primary-300 hover:bg-primary-50 transition"
              >
                <div className="font-medium text-gray-900 text-lg mb-2">
                  활동 로그
                </div>
                <div className="text-sm text-gray-600">
                  관리자 활동 로그 조회
                </div>
              </button>
            </>
          )}

          {/* 일반 관리자용 활동 로그 */}
          {user.role === 'admin' && (
            <button
              onClick={() => router.push('/admin/logs')}
              className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-primary-300 hover:bg-primary-50 transition"
            >
              <div className="font-medium text-gray-900 text-lg mb-2">
                내 활동 로그
              </div>
              <div className="text-sm text-gray-600">
                내 활동 내역 조회
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

