'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  imageUrls: string[];
  status: 'pending' | 'working' | 'done';
  completedLink?: string | null;
  completedLink2?: string | null; // 내돈내산 리뷰용 두 번째 링크
  createdAt: string;
}

const TASK_TYPE_NAMES: Record<string, string> = {
  follower: '인스타그램 팔로워',
  like: '인스타그램 좋아요',
  hotpost: '인스타그램 인기게시물',
  momcafe: '맘카페',
  powerblog: '파워블로그',
  clip: '클립',
  myexpense: '내돈내산 리뷰',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  working: '진행중',
  done: '완료',
};

export default function ClientOrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">발주 목록</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">발주 내역이 없습니다.</div>
            <button
              onClick={() => router.push('/client/order')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              작업 신청하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-2 inline-block">
                      {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                    </span>
                    <div
                      className={`inline-block ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : order.status === 'working'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {(order.taskType === 'follower' || order.taskType === 'like')
                        ? (order.status === 'pending' ? '대기중' : '신청완료')
                        : STATUS_NAMES[order.status]}
                    </div>
                    {order.status === 'done' && order.completedLink && (
                      <div className="mt-2">
                        <a
                          href={order.completedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate max-w-xs">완료 링크 보기</span>
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {order.caption && (
                  <div className="text-gray-700 mb-3">
                    {order.caption.split('\n').map((line, idx) => (
                      <p key={idx} className={idx === 0 ? 'font-medium' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {order.imageUrls && order.imageUrls.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {order.imageUrls.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className="w-16 h-16 relative rounded-lg overflow-hidden border border-gray-200"
                      >
                        <Image
                          src={url}
                          alt={`Image ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {order.imageUrls.length > 3 && (
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-xs text-gray-600">
                        +{order.imageUrls.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    발주 상세
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">작업 종류</div>
                    <div className="font-medium text-gray-900">
                      {TASK_TYPE_NAMES[selectedOrder.taskType] ||
                        selectedOrder.taskType}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">상태</div>
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        selectedOrder.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : selectedOrder.status === 'working'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {STATUS_NAMES[selectedOrder.status]}
                    </div>
                  </div>
                  
                  {/* 완료된 링크 표시 */}
                  {selectedOrder.status === 'done' && selectedOrder.completedLink && (
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">
                          {selectedOrder.taskType === 'myexpense' ? '내돈내산 예약자 리뷰' : '완료 링크'}
                        </div>
                        <a
                          href={selectedOrder.completedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition break-all"
                        >
                          <span className="truncate max-w-md">{selectedOrder.completedLink}</span>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                      {selectedOrder.taskType === 'myexpense' && (selectedOrder as any).completedLink2 && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">내돈내산 블로그 리뷰</div>
                          <a
                            href={(selectedOrder as any).completedLink2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition break-all"
                          >
                            <span className="truncate max-w-md">{(selectedOrder as any).completedLink2}</span>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                      {selectedOrder.taskType === 'myexpense' && (selectedOrder as any).reviewerName && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">리뷰어 이름</div>
                          <div className="px-4 py-2 bg-gray-50 text-gray-900 rounded-lg">
                            {(selectedOrder as any).reviewerName}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedOrder.caption && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">작업 정보</div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {selectedOrder.caption.split('\n').map((line, idx) => (
                          <div key={idx} className="text-gray-900">
                            {line.includes(':') ? (
                              <>
                                <span className="font-medium">
                                  {line.split(':')[0]}:
                                </span>
                                <span className="ml-2">
                                  {line.split(':').slice(1).join(':')}
                                </span>
                              </>
                            ) : (
                              line
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-600">신청일</div>
                    <div className="font-medium text-gray-900">
                      {formatDateTime(selectedOrder.createdAt)}
                    </div>
                  </div>
                  {selectedOrder.imageUrls &&
                    selectedOrder.imageUrls.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">
                          이미지 ({selectedOrder.imageUrls.length}개)
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedOrder.imageUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="aspect-square relative rounded-lg overflow-hidden border border-gray-200"
                            >
                              <Image
                                src={url}
                                alt={`Image ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

