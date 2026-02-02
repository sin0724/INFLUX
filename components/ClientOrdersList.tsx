'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  imageUrls: string[];
  status: 'pending' | 'working' | 'done' | 'draft_uploaded' | 'revision_requested' | 'draft_revised' | 'client_approved' | 'published';
  completedLink?: string | null;
  completedLink2?: string | null; // 내돈내산 리뷰용 두 번째 링크
  draftText?: string | null;
  revisionText?: string | null;
  guideFileUrl?: string | null;
  guideText?: string | null;
  videoUrl?: string | null;
  client?: {
    id: string;
    username: string;
    companyName?: string;
  };
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
  blog: '블로그 리뷰',
  blog_review: '블로그 리뷰',
  receipt: '영수증 리뷰',
  receipt_review: '영수증 리뷰',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  working: '진행중',
  done: '발행 완료',
  draft_uploaded: '원고 업로드 완료',
  revision_requested: '원고 수정요청',
  draft_revised: '원고 수정완료',
  client_approved: '승인완료',
  published: '발행 완료',
};

// 가이드 텍스트를 읽기 쉬운 형식으로 변환하는 헬퍼 함수 (JSON 형식 지원)
const formatGuideTextForDisplay = (guideText: string | null, companyName: string): string => {
  if (!guideText) return '';
  
  // JSON 형식인 경우 파싱하여 읽기 쉬운 형식으로 변환
  if (guideText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(guideText);
      
      // 블로그 리뷰 가이드 형식
      if (parsed.keywords !== undefined) {
        return `[ 블로그 리뷰 가이드 ]

1. 업체명 : ${companyName}

2. 플레이스 링크 : ${parsed.placeLink || '(생략)'}

3. 블로그 작성 키워드 : ${parsed.keywords || ''}

4. 업장의 강점 / 원하시는 내용 : ${parsed.strengths || ''}

5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${parsed.additionalRequests || '(없음)'}`;
      }
      
      // 영수증 리뷰 가이드 형식
      if (parsed.reviewContent !== undefined) {
        return `[ 영수증 리뷰 가이드 ]

1. 업체명 : ${companyName}

2. 플레이스 링크 : ${parsed.placeLink || '(생략)'}

3. 방문자 리뷰에 들어갈 내용 : ${parsed.reviewContent || ''}

4. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${parsed.additionalRequests || '(없음)'}`;
      }
    } catch (e) {
      // JSON 파싱 실패 시 원본 반환
      return guideText;
    }
  }
  
  // 일반 텍스트 형식인 경우 그대로 반환
  return guideText;
};

export default function ClientOrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [userCompanyName, setUserCompanyName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchOrders();
    fetchUserInfo();
  }, []);

  // 탭 전환 후 돌아왔을 때 목록 새로고침 (관리자가 링크 추가한 건 반영)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user?.companyName) {
          setUserCompanyName(data.user.companyName);
        }
        if (data.user?.role) {
          setUserRole(data.user.role);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      // 캐싱 방지: 항상 최신 데이터를 가져오도록 설정
      const response = await fetch('/api/orders', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
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

  // 광고주용 삭제 기능
  const handleDeleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 완료된 작업(링크가 있는 경우) 삭제 경고
    const isCompleted = (order.status === 'done' || order.status === 'published') && 
                        (order.completedLink || (order as any).completedLink2);
    
    if (isCompleted) {
      if (!confirm('완료된 작업(링크가 등록된 작업)을 삭제하시겠습니까?\n삭제된 발주는 복구할 수 없습니다.')) {
        return;
      }
    } else {
      if (!confirm('정말 이 발주를 삭제하시겠습니까?\n삭제된 발주는 복구할 수 없습니다.')) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (response.ok) {
        // 삭제 후 즉시 목록 새로고침
        await fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
        alert('발주가 삭제되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '발주 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('발주 삭제 중 오류가 발생했습니다.');
    }
  };

  // 상태별 필터링
  const statusFilteredOrders = useMemo(() => {
    if (selectedStatus === 'all') {
      return orders;
    } else if (selectedStatus === 'completed') {
      // 완료: status가 'done' 또는 'published'이고 completedLink가 있는 경우
      return orders.filter(order => {
        const isCompletedStatus = order.status === 'done' || order.status === 'published';
        const hasLink = order.completedLink || (order as any).completedLink2;
        return isCompletedStatus && hasLink;
      });
    } else if (selectedStatus === 'in_progress') {
      // 진행중: 완료되지 않은 모든 주문
      return orders.filter(order => {
        const isCompletedStatus = order.status === 'done' || order.status === 'published';
        const hasLink = order.completedLink || (order as any).completedLink2;
        return !(isCompletedStatus && hasLink);
      });
    }
    return orders;
  }, [orders, selectedStatus]);

  // 작업별 필터링 (blog/blog_review, receipt/receipt_review 통합)
  const filteredOrders = useMemo(() => {
    let filtered = statusFilteredOrders;
    
    if (selectedTaskType === 'all') {
      return filtered;
    }
    
    // taskType을 정규화하는 함수
    const normalizeTaskType = (taskType: string): string => {
      if (taskType === 'blog' || taskType === 'blog_review') {
        return 'blog';
    }
      if (taskType === 'receipt' || taskType === 'receipt_review') {
        return 'receipt';
      }
      return taskType;
    };
    
    return filtered.filter(order => {
      const normalizedOrderType = normalizeTaskType(order.taskType);
      const normalizedSelectedType = normalizeTaskType(selectedTaskType);
      return normalizedOrderType === normalizedSelectedType;
    });
  }, [statusFilteredOrders, selectedTaskType]);

  // 상태별 개수 계산
  const statusCounts = useMemo(() => {
    const allCount = orders.length;
    const completedCount = orders.filter(order => {
      const isCompletedStatus = order.status === 'done' || order.status === 'published';
      const hasLink = order.completedLink || (order as any).completedLink2;
      return isCompletedStatus && hasLink;
    }).length;
    const inProgressCount = allCount - completedCount;
    
    return {
      all: allCount,
      completed: completedCount,
      in_progress: inProgressCount,
    };
  }, [orders]);

  // 작업별 개수 계산 (blog/blog_review, receipt/receipt_review 통합)
  // 선택된 상태에 따라 카운트
  const taskTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: statusFilteredOrders.length };
    
    // taskType을 정규화하는 함수 (blog/blog_review, receipt/receipt_review 통합)
    const normalizeTaskType = (taskType: string): string => {
      if (taskType === 'blog' || taskType === 'blog_review') {
        return 'blog'; // 통합된 이름 사용
      }
      if (taskType === 'receipt' || taskType === 'receipt_review') {
        return 'receipt'; // 통합된 이름 사용
      }
      return taskType;
    };
    
    statusFilteredOrders.forEach(order => {
      const normalizedType = normalizeTaskType(order.taskType);
      counts[normalizedType] = (counts[normalizedType] || 0) + 1;
    });
    return counts;
  }, [statusFilteredOrders]);

  // 작업 타입 목록 (실제 사용된 타입만, blog/blog_review, receipt/receipt_review 통합)
  const availableTaskTypes = useMemo(() => {
    // taskType을 정규화하는 함수
    const normalizeTaskType = (taskType: string): string => {
      if (taskType === 'blog' || taskType === 'blog_review') {
        return 'blog';
      }
      if (taskType === 'receipt' || taskType === 'receipt_review') {
        return 'receipt';
      }
      return taskType;
    };
    
    const types = new Set(orders.map(order => normalizeTaskType(order.taskType)));
    return Array.from(types).sort();
  }, [orders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-3 text-sm"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-xl font-bold text-gray-900">발주 목록</h1>
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
          <>
            {/* 상태별 필터 탭 */}
            <div className="mb-3 bg-white rounded-lg border border-gray-200 p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedStatus === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체 ({statusCounts.all})
                </button>
                <button
                  onClick={() => setSelectedStatus('in_progress')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedStatus === 'in_progress'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  진행중 ({statusCounts.in_progress})
                </button>
                <button
                  onClick={() => setSelectedStatus('completed')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedStatus === 'completed'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  완료 ({statusCounts.completed})
                </button>
              </div>
            </div>

            {/* 작업별 필터 탭 */}
            <div className="mb-4 bg-white rounded-lg border border-gray-200 p-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTaskType('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    selectedTaskType === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체 ({taskTypeCounts.all || 0})
                </button>
                {availableTaskTypes.map(taskType => (
                  <button
                    key={taskType}
                    onClick={() => setSelectedTaskType(taskType)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      selectedTaskType === taskType
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {TASK_TYPE_NAMES[taskType] || taskType} ({taskTypeCounts[taskType] || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* 간단한 리스트 형식 */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                선택한 작업 종류의 발주 내역이 없습니다.
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  // 블로그 리뷰에만 원고 확인 버튼 표시 (영수증 리뷰는 제외)
                  const showReviewButton = order.taskType === 'blog_review' && 
                    (order.status === 'working' || order.status === 'draft_uploaded' || order.status === 'draft_revised' || 
                     order.status === 'revision_requested' || order.status === 'client_approved' || order.status === 'published');
                  // 영수증 리뷰는 발행 완료 시 링크 확인 버튼만 표시
                  const showReceiptLinkButton = order.taskType === 'receipt_review' && 
                    (order.status === 'published' || order.status === 'done') && order.completedLink;

                  return (
                  <div
                    key={order.id}
                    className="p-3 hover:bg-gray-50 transition"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start gap-3">
                      {order.imageUrls && order.imageUrls.length > 0 && (
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 relative rounded overflow-hidden border border-gray-200 bg-gray-100">
                            <Image
                              src={order.imageUrls[0]}
                              alt="첫 번째 이미지"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                            {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              order.status === 'pending'
                                ? 'bg-yellow-50 text-yellow-700'
                                : order.status === 'working' || order.status === 'draft_uploaded'
                                ? 'bg-blue-50 text-blue-700'
                                : order.status === 'revision_requested'
                                ? 'bg-orange-50 text-orange-700'
                                : order.status === 'draft_revised'
                                ? 'bg-purple-50 text-purple-700'
                                : order.status === 'client_approved'
                                ? 'bg-indigo-50 text-indigo-700'
                                : order.status === 'published' || order.status === 'done'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {(order.taskType === 'follower' || order.taskType === 'like')
                              ? (order.status === 'pending' ? '대기중' : '신청완료')
                              : STATUS_NAMES[order.status] || order.status}
                          </span>
                        </div>
                        {order.caption && (
                          <div className="text-sm text-gray-700 mb-1 line-clamp-2">
                            {order.caption.split('\n')[0]}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </div>
                      {/* 버튼 영역 - 우측 배치 */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* 발행 완료 또는 완료 상태일 때 링크 확인 버튼 (모든 작업 타입) */}
                        {(order.status === 'published' || order.status === 'done') && order.completedLink ? (
                          <a
                            href={order.completedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition whitespace-nowrap"
                          >
                            링크 확인
                          </a>
                        ) : showReviewButton ? (
                          /* 블로그 리뷰 원고 확인 버튼 (링크가 없을 때만) */
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/client/review-request/${order.id}`);
                            }}
                            className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition whitespace-nowrap"
                          >
                            원고 확인
                          </button>
                        ) : null}
                        {/* 삭제 버튼 - 모든 작업에 대해 삭제 가능 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </>
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
                  <h2 className="text-lg font-bold text-gray-900">
                    발주 상세
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
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
                          : selectedOrder.status === 'working' || selectedOrder.status === 'draft_uploaded'
                          ? 'bg-blue-100 text-blue-700'
                          : selectedOrder.status === 'revision_requested'
                          ? 'bg-orange-100 text-orange-700'
                          : selectedOrder.status === 'draft_revised'
                          ? 'bg-purple-100 text-purple-700'
                          : selectedOrder.status === 'client_approved'
                          ? 'bg-indigo-100 text-indigo-700'
                          : selectedOrder.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {STATUS_NAMES[selectedOrder.status] || selectedOrder.status}
                    </div>
                  </div>

                  {/* 블로그 리뷰 원고 확인/링크 확인 버튼 (영수증 리뷰는 제외) */}
                  {selectedOrder.taskType === 'blog_review' && 
                   (selectedOrder.status === 'working' || selectedOrder.status === 'draft_uploaded' || selectedOrder.status === 'draft_revised' || selectedOrder.status === 'client_approved' || selectedOrder.status === 'published' || selectedOrder.status === 'done') && (
                    <div>
                      {(selectedOrder.status === 'published' || selectedOrder.status === 'done') && selectedOrder.completedLink ? (
                        <a
                          href={selectedOrder.completedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center"
                        >
                          링크 확인
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedOrder(null);
                            router.push(`/client/review-request/${selectedOrder.id}`);
                          }}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                        >
                          {(selectedOrder.status === 'draft_uploaded' || selectedOrder.status === 'draft_revised') ? '원고 확인 및 수정' : selectedOrder.status === 'working' ? '진행 상황 확인' : '원고 확인'}
                        </button>
                      )}
                    </div>
                  )}
                  {/* 영수증 리뷰 발행 완료 시 링크 확인 버튼만 표시 */}
                  {selectedOrder.taskType === 'receipt_review' && 
                   (selectedOrder.status === 'published' || selectedOrder.status === 'done') && selectedOrder.completedLink && (
                    <div>
                      <a
                        href={selectedOrder.completedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center"
                      >
                        링크 확인
                      </a>
                    </div>
                  )}

                  {/* 가이드 (리뷰 신청인 경우) */}
                  {(selectedOrder.taskType === 'blog_review' || selectedOrder.taskType === 'receipt_review') &&
                   (selectedOrder.guideFileUrl || selectedOrder.guideText) && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">가이드</div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {selectedOrder.guideFileUrl ? (
                          <a
                            href={selectedOrder.guideFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            가이드 파일 다운로드
                          </a>
                        ) : (
                          <div className="text-gray-900 whitespace-pre-wrap">
                            {formatGuideTextForDisplay(selectedOrder.guideText || '', userCompanyName || selectedOrder.client?.companyName || '')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 동영상 (블로그 리뷰인 경우) */}
                  {selectedOrder.taskType === 'blog_review' && selectedOrder.videoUrl && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">동영상</div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <video
                          src={selectedOrder.videoUrl}
                          controls
                          className="w-full rounded-lg border border-gray-200"
                          style={{ maxHeight: '400px' }}
                        />
                        <a
                          href={selectedOrder.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="mt-2 inline-block text-primary-600 hover:text-primary-700 underline text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          동영상 다운로드
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* 완료된 링크 표시 (모든 작업 타입, published 또는 done 상태) */}
                  {(selectedOrder.status === 'done' || selectedOrder.status === 'published') && selectedOrder.completedLink && (
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">
                          {selectedOrder.taskType === 'myexpense' ? '내돈내산 예약자 리뷰' 
                           : selectedOrder.taskType === 'blog_review' || selectedOrder.taskType === 'receipt_review' ? '발행된 리뷰 링크'
                           : '완료 링크'}
                        </div>
                        <a
                          href={selectedOrder.completedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center"
                        >
                          링크 확인
                        </a>
                      </div>
                      {selectedOrder.taskType === 'myexpense' && (selectedOrder as any).completedLink2 && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">내돈내산 블로그 리뷰</div>
                          <a
                            href={(selectedOrder as any).completedLink2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center"
                          >
                            링크 확인
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
                  
                  {/* 삭제 버튼 - 모든 작업에 대해 삭제 가능 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      발주 삭제
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      삭제된 발주는 복구할 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


