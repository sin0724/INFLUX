'use client';

import { useState, useEffect } from 'react';
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

export default export default function PointChargesPageClient() {
  const [charges, setCharges] = useState<PointCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCharge, setSelectedCharge] = useState<PointCharge | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCharges();
  }, [filterStatus]);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/points/charges?${params.toString()}`);
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

  const handleApprove = async (charge: PointCharge) => {
    if (!confirm(`${charge.points.toLocaleString()} 포인트를 승인하시겠습니까?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/points/charges/${charge.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          adminNote: adminNote || null,
        }),
      });

      if (response.ok) {
        await fetchCharges();
        setSelectedCharge(null);
        setAdminNote('');
        alert('포인트 충전이 승인되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '승인 처리에 실패했습니다.');
      }
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (charge: PointCharge) => {
    if (!adminNote.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    if (!confirm(`${charge.points.toLocaleString()} 포인트 충전을 거절하시겠습니까?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/points/charges/${charge.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          adminNote,
        }),
      });

      if (response.ok) {
        await fetchCharges();
        setSelectedCharge(null);
        setAdminNote('');
        alert('포인트 충전이 거절되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '거절 처리에 실패했습니다.');
      }
    } catch (error) {
      alert('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCharges = charges.filter((c) => c.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            포인트 충전 신청 관리
          </h1>

          {/* 필터 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              전체 ({charges.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              대기중 ({pendingCharges.length})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'approved'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              승인됨 ({charges.filter((c) => c.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'rejected'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              거절됨 ({charges.filter((c) => c.status === 'rejected').length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : charges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">포인트 충전 신청이 없습니다.</div>
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-gray-900">
                        {charge.clientUsername}
                      </span>
                      {charge.companyName && (
                        <span className="text-sm text-gray-600">
                          ({charge.companyName})
                        </span>
                      )}
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
                    <div className="text-sm text-gray-600">충전 포인트</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {charge.points.toLocaleString()}P
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">입금 금액</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {charge.amount.toLocaleString()}원
                    </div>
                  </div>
                </div>

                {charge.adminNote && (
                  <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      관리자 메모
                    </div>
                    <div className="text-sm text-gray-600">{charge.adminNote}</div>
                  </div>
                )}

                {charge.adminUsername && (
                  <div className="text-xs text-gray-500 mb-4">
                    처리 관리자: {charge.adminUsername}
                  </div>
                )}

                {charge.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCharge(charge)}
                      className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition"
                    >
                      처리하기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 처리 모달 */}
        {selectedCharge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                포인트 충전 처리
              </h2>

              <div className="mb-4 space-y-2">
                <div>
                  <span className="text-sm text-gray-600">광고주:</span>{' '}
                  <span className="font-medium">
                    {selectedCharge.clientUsername}
                    {selectedCharge.companyName && ` (${selectedCharge.companyName})`}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">포인트:</span>{' '}
                  <span className="font-bold text-lg">
                    {selectedCharge.points.toLocaleString()}P
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">입금 금액:</span>{' '}
                  <span className="font-bold text-lg text-blue-900">
                    {selectedCharge.amount.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관리자 메모 (선택사항)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="승인/거절 사유를 입력하세요"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCharge(null);
                    setAdminNote('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={() => handleReject(selectedCharge)}
                  disabled={processing}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  거절
                </button>
                <button
                  onClick={() => handleApprove(selectedCharge)}
                  disabled={processing}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {processing ? '처리 중...' : '승인'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

