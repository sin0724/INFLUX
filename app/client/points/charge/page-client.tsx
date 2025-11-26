'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

export default function PointChargePageClient() {
  const router = useRouter();
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 포인트를 원화로 변환 (부가세 10% 포함)
  const calculateAmount = (pointValue: number) => {
    return Math.round(pointValue * 1.1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const pointValue = parseInt(points);
    if (!points || isNaN(pointValue) || pointValue <= 0) {
      setError('올바른 포인트를 입력해주세요.');
      return;
    }

    if (pointValue < 1000) {
      setError('최소 1,000 포인트부터 충전 가능합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/points/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: pointValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '포인트 충전 신청에 실패했습니다.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setPoints('');
      // 3초 후 대시보드로 이동
      setTimeout(() => {
        router.push('/client');
      }, 3000);
    } catch (err) {
      setError('포인트 충전 신청 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const pointValue = parseInt(points) || 0;
  const amount = calculateAmount(pointValue);

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
          <h1 className="text-2xl font-bold text-gray-900">포인트 충전 신청</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              포인트 충전 신청이 완료되었습니다. 관리자 승인 후 포인트가 충전됩니다.
              잠시 후 자동으로 이동합니다...
            </div>
          )}

          {/* 포인트 입력 */}
          <div>
            <label
              htmlFor="points"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              충전할 포인트 <span className="text-red-500">*</span>
            </label>
            <input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min="1000"
              step="1000"
              required
              disabled={loading || success}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-lg"
              placeholder="예: 300000"
            />
            <p className="text-xs text-gray-500 mt-1">
              최소 1,000 포인트부터 충전 가능합니다.
            </p>
          </div>

          {/* 결제 안내 */}
          {pointValue > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">
                💳 입금 안내
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <div>
                  <span className="font-medium">충전 포인트:</span>{' '}
                  <span className="text-lg font-bold">
                    {pointValue.toLocaleString()} 포인트
                  </span>
                </div>
                <div>
                  <span className="font-medium">입금 금액:</span>{' '}
                  <span className="text-lg font-bold text-blue-900">
                    {amount.toLocaleString()}원
                  </span>
                  <span className="text-xs ml-1">(부가세 10% 포함)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-300">
                  <div className="font-semibold mb-2">입금 계좌</div>
                  <div className="bg-white rounded p-3 font-mono text-base">
                    국민은행 818701-00-212720
                  </div>
                  <div className="text-xs mt-1">예금주: 인컴 글로벌</div>
                </div>
                <div className="mt-3 text-xs bg-yellow-100 p-2 rounded">
                  ⚠️ 입금 후 신청 버튼을 눌러주세요.
                </div>
              </div>
            </div>
          )}

          {/* 예시 안내 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              예시 안내
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                • <strong>300,000 포인트</strong> 충전 시:{' '}
                <strong>330,000원</strong> 입금 (부가세 10% 포함)
              </div>
              <div>
                • <strong>500,000 포인트</strong> 충전 시:{' '}
                <strong>550,000원</strong> 입금 (부가세 10% 포함)
              </div>
              <div>
                • <strong>1,000,000 포인트</strong> 충전 시:{' '}
                <strong>1,100,000원</strong> 입금 (부가세 10% 포함)
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading || success}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || success || pointValue === 0}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '신청 중...' : '입금 후 신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

