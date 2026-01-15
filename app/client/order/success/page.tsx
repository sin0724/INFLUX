'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const taskTypeNames: Record<string, string> = {
    follower: '인스타그램 팔로워',
    like: '인스타그램 좋아요',
    hotpost: '인스타그램 인기게시물',
    momcafe: '맘카페',
    powerblog: '파워블로그',
    clip: '클립',
    blog: '블로그 리뷰',
    receipt: '영수증 리뷰',
    daangn: '당근마켓 후기',
    experience: '체험단',
    myexpense: '내돈내산 리뷰',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              신청이 완료되었습니다!
            </h1>
            {order && order.taskType === 'blog_review' ? (
              <p className="text-gray-600">
                원고가 작성이 완료되어 업로드가 완료되면<br />
                꼭 원고 확인 버튼을 통해 원고 확인 후 승인 부탁드립니다.
              </p>
            ) : (
              <p className="text-gray-600">
                작업이 정상적으로 접수되었습니다.
              </p>
            )}
          </div>

          {order && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">작업 종류</div>
                  <div className="font-medium text-gray-900">
                    {taskTypeNames[order.taskType] || order.taskType}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">상태</div>
                  <div className="font-medium text-gray-900">
                    {order.status === 'pending' && '대기중'}
                    {order.status === 'working' && '진행중'}
                    {order.status === 'done' && '완료'}
                  </div>
                </div>
                {order.caption && (
                  <div>
                    <div className="text-sm text-gray-600">내용</div>
                    <div className="font-medium text-gray-900">{order.caption}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 블로그 리뷰 신청 시 안내사항 */}
          {order && order.taskType === 'blog_review' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">📝 원고 확인 안내</p>
                <div className="space-y-1 text-blue-800">
                  <p>• 수정사항이 있으신 경우: 직접수정 또는 수정 요청 주시면 됩니다.</p>
                  <p>• 수정사항이 없으신 경우: 승인을 꼭 눌러주셔야 원고 발행이 됩니다.</p>
                </div>
              </div>
            </div>
          )}

          {/* 인스타그램 팔로워/좋아요 작업 시 유의사항 */}
          {order && (order.taskType === 'follower' || order.taskType === 'like') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-900 mb-1">유의사항</div>
                  <div className="text-sm text-amber-800 space-y-1">
                    <p>
                      팔로워 및 좋아요 작업은 특성상 신청 완료 후 순차적으로 반영됩니다. 
                      신청 완료 안내는 별도로 드리지 않습니다.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      ※ A/S는 작업 완료 후 1개월 이내의 건에 한해 1회 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/client')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              홈으로
            </button>
            <button
              onClick={() => router.push('/client/orders')}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              {order && order.taskType === 'blog_review' ? '원고 확인' : '발주 목록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

