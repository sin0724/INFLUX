'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';

interface PointCharge {
  id: string;
  clientId: string;
  clientUsername: string;
  companyName?: string;
  points: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  adminId?: string;
  adminUsername?: string;
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
}

interface User {
  points?: number;
}

export default function PointChargeHistoryClient() {
  const router = useRouter();
  const [charges, setCharges] = useState<PointCharge[]>([]);
  const [user, setUser] = useState<User>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchUserData();
    fetchCharges();
  }, [filterStatus]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || {});
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/points/charges/my?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCharges(data.chargeRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCharges = charges.filter((c) => c.status === 'pending');
  const approvedCharges = charges.filter((c) => c.status === 'approved');
  const rejectedCharges = charges.filter((c) => c.status === 'rejected');

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            포인트 충전 내역
          </h1>

          {/* 현재 포인트 잔액 */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-primary-700 mb-1">현재 포인트</div>
            <div className="text-3xl font-bold text-primary-900">
              {(user.points || 0).toLocaleString()}P
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              전체 ({charges.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                filterStatus === 'pending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              대기중 ({pendingCharges.length})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                filterStatus === 'approved'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              승인됨 ({approvedCharges.length})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                filterStatus === 'rejected'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              거절됨 ({rejectedCharges.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : charges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">
              {filterStatus === 'all'
                ? '포인트 충전 내역이 없습니다.'
                : '해당 상태의 충전 내역이 없습니다.'}
            </div>
            <button
              onClick={() => router.push('/client/points/charge')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              포인트 충전 신청하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {charges.map((charge) => (
              <div
                key={charge.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  charge.status === 'pending'
                    ? 'border-yellow-300 bg-yellow-50'
                    : charge.status === 'approved'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-lg font-bold text-gray-900 mb-2">
                      {charge.points.toLocaleString()} 포인트
                    </div>
                    <div className="text-sm text-gray-600">
                      신청일: {formatDateTime(charge.createdAt)}
                    </div>
                    {charge.approvedAt && (
                      <div className="text-sm text-gray-600">
                        승인일: {formatDateTime(charge.approvedAt)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        charge.status === 'pending'
                          ? 'bg-yellow-200 text-yellow-800'
                          : charge.status === 'approved'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {charge.status === 'pending'
                        ? '대기중'
                        : charge.status === 'approved'
                        ? '승인됨'
                        : '거절됨'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">입금 금액</div>
                    <div className="text-lg font-bold text-gray-900">
                      {charge.amount.toLocaleString()}원
                    </div>
                  </div>
                </div>

                {charge.adminNote && (
                  <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      관리자 메모
                    </div>
                    <div className="text-sm text-gray-600">
                      {charge.adminNote}
                    </div>
                  </div>
                )}

                {charge.status === 'pending' && (
                  <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                    ⏳ 관리자 승인 대기 중입니다.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

