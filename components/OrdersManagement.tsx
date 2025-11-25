'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils';
import ImageUpload from './ImageUpload';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  imageUrls: string[];
  status: 'pending' | 'working' | 'done';
  completedLink?: string | null;
  createdAt: string;
  client: {
    id: string;
    username: string;
    companyName?: string;
  };
}

const TASK_TYPE_NAMES: Record<string, string> = {
  follower: '인스타그램 팔로워',
  like: '인스타그램 좋아요',
  hotpost: '인스타그램 인기게시물',
  momcafe: '맘카페',
  powerblog: '파워블로그',
  clip: '클립',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  working: '진행중',
  done: '완료',
};

// 인스타 좋아요/팔로워용 상태 이름
const SIMPLE_STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  done: '신청완료',
};

export default function OrdersManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    taskType: '',
    clientId: '',
    startDate: '',
    endDate: '',
  });
  const [clients, setClients] = useState<any[]>([]);
  
  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    caption: '',
    imageUrls: [] as string[],
  });
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  // 완료 링크 입력 모달 상태
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [completedLink, setCompletedLink] = useState('');

  useEffect(() => {
    fetchClients();
    fetchOrders();
  }, [filters]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const clientList = data.users.filter((u: any) => u.role === 'client');
        setClients(clientList);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.taskType) params.append('taskType', filters.taskType);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/orders?${params.toString()}`);
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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    
    // 인기게시물/맘카페를 완료로 변경할 때는 링크 입력 모달 표시
    if (newStatus === 'done' && order && (order.taskType === 'hotpost' || order.taskType === 'momcafe')) {
      setCompletingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 그 외의 경우는 바로 상태 변경
    await updateOrderStatus(orderId, newStatus, null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, link: string | null) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          completedLink: link 
        }),
      });

      if (response.ok) {
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          const data = await response.json();
          setSelectedOrder(data.order);
        }
        setCompletingOrder(null);
        setCompletedLink('');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleCompleteWithLink = () => {
    if (!completingOrder) return;
    
    if (!completedLink.trim()) {
      alert('완료 링크를 입력해주세요.');
      return;
    }
    
    updateOrderStatus(completingOrder.id, 'done', completedLink.trim());
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      caption: order.caption || '',
      imageUrls: order.imageUrls || [],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    try {
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caption: editForm.caption,
          imageUrls: editForm.imageUrls,
        }),
      });

      if (response.ok) {
        fetchOrders();
        setEditingOrder(null);
        if (selectedOrder?.id === editingOrder.id) {
          const data = await response.json();
          setSelectedOrder(data.order);
        }
        alert('발주가 수정되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '발주 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to edit order:', error);
      alert('발주 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('정말 이 발주를 삭제하시겠습니까?\n대기중 상태인 경우 작업 개수가 복구됩니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchOrders();
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

  const filteredOrders = orders;


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">발주 내역 관리</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">전체</option>
                <option value="pending">대기중</option>
                <option value="working">진행중</option>
                <option value="done">완료</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작업 종류
              </label>
              <select
                value={filters.taskType}
                onChange={(e) =>
                  setFilters({ ...filters, taskType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">전체</option>
                <option value="follower">인스타그램 팔로워</option>
                <option value="like">인스타그램 좋아요</option>
                <option value="hotpost">인스타그램 인기게시물</option>
                <option value="momcafe">맘카페</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고주
              </label>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="광고주 검색 또는 선택..."
                  value={
                    filters.clientId
                      ? clients.find((c) => c.id === filters.clientId)?.username || clientSearchTerm
                      : clientSearchTerm
                  }
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value) {
                      setFilters({ ...filters, clientId: '' });
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => {
                    // 드롭다운 클릭 시간을 주기 위해 약간의 지연
                    setTimeout(() => setShowClientDropdown(false), 200);
                  }}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                {(filters.clientId || clientSearchTerm) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientSearchTerm('');
                      setFilters({ ...filters, clientId: '' });
                      setShowClientDropdown(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    ×
                  </button>
                )}
                
                {/* 검색 드롭다운 */}
                {showClientDropdown && (
                  <div 
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()} // blur 이벤트 방지
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, clientId: '' });
                        setClientSearchTerm('');
                        setShowClientDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition ${
                        !filters.clientId ? 'bg-primary-50 text-primary-700 font-medium' : ''
                      }`}
                    >
                      전체
                    </button>
                    {clients
                      .filter((client) =>
                        client.username
                          .toLowerCase()
                          .includes(clientSearchTerm.toLowerCase())
                      )
                      .map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFilters({ ...filters, clientId: client.id });
                            setClientSearchTerm(client.username);
                            setShowClientDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition ${
                            filters.clientId === client.id
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : ''
                          }`}
                        >
                          {client.username}
                        </button>
                      ))}
                    {clients.filter((client) =>
                      client.username
                        .toLowerCase()
                        .includes(clientSearchTerm.toLowerCase())
                    ).length === 0 && clientSearchTerm && (
                      <div className="px-3 py-2 text-gray-500 text-sm text-center">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            발주 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                        {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : order.status === 'working'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {(order.taskType === 'follower' || order.taskType === 'like')
                          ? SIMPLE_STATUS_NAMES[order.status] || STATUS_NAMES[order.status]
                          : STATUS_NAMES[order.status]}
                      </span>
                      <span className="text-sm text-gray-600">
                        {order.client?.username || '알 수 없음'}
                        {order.client?.companyName && (
                          <span className="text-gray-500 ml-2">
                            ({order.client.companyName})
                          </span>
                        )}
                      </span>
                    </div>
                    {order.caption && (
                      <div className="text-gray-700 mb-2">
                        {order.caption.split('\n').slice(0, 2).map((line, idx) => (
                          <p key={idx} className={idx === 0 ? 'font-medium' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {/* 인스타 좋아요/팔로워는 대기중/신청완료만 */}
                      {(order.taskType === 'follower' || order.taskType === 'like') ? (
                        <>
                          <option value="pending">대기중</option>
                          <option value="done">신청완료</option>
                        </>
                      ) : (
                        <>
                          <option value="pending">대기중</option>
                          <option value="working">진행중</option>
                          <option value="done">완료</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                {order.imageUrls && order.imageUrls.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {order.imageUrls.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className="w-20 h-20 relative rounded-lg overflow-hidden border border-gray-200"
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
                      <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-sm text-gray-600">
                        +{order.imageUrls.length - 3}
                      </div>
                    )}
                  </div>
                )}
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
                    className="text-gray-400 hover:text-gray-600"
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
                    <div className="text-sm text-gray-600">광고주</div>
                    <div className="font-medium text-gray-900">
                      {selectedOrder.client?.username || '알 수 없음'}
                      {selectedOrder.client?.companyName && (
                        <span className="text-gray-600 ml-2">
                          ({selectedOrder.client.companyName})
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">상태</div>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) =>
                        handleStatusChange(selectedOrder.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {/* 인스타 좋아요/팔로워는 대기중/신청완료만 */}
                      {(selectedOrder.taskType === 'follower' || selectedOrder.taskType === 'like') ? (
                        <>
                          <option value="pending">대기중</option>
                          <option value="done">신청완료</option>
                        </>
                      ) : (
                        <>
                          <option value="pending">대기중</option>
                          <option value="working">진행중</option>
                          <option value="done">완료</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEditOrder(selectedOrder)}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('정말 이 발주를 삭제하시겠습니까?')) {
                          handleDeleteOrder(selectedOrder.id);
                          setSelectedOrder(null);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      삭제
                    </button>
                  </div>
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

        {/* Complete Link Modal */}
        {completingOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setCompletingOrder(null);
              setCompletedLink('');
            }}
          >
            <div
              className="bg-white rounded-lg max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    완료 링크 입력
                  </h2>
                  <button
                    onClick={() => {
                      setCompletingOrder(null);
                      setCompletedLink('');
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">작업 종류</div>
                    <div className="font-medium text-gray-900">
                      {TASK_TYPE_NAMES[completingOrder.taskType] || completingOrder.taskType}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      완료 링크 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={completedLink}
                      onChange={(e) => setCompletedLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      완료된 작업의 링크를 입력해주세요.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setCompletingOrder(null);
                        setCompletedLink('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCompleteWithLink}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      완료 처리
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Edit Modal */}
        {editingOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingOrder(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    발주 수정
                  </h2>
                  <button
                    onClick={() => setEditingOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">작업 종류</div>
                    <div className="font-medium text-gray-900">
                      {TASK_TYPE_NAMES[editingOrder.taskType] || editingOrder.taskType}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      작업 정보
                    </label>
                    <textarea
                      value={editForm.caption}
                      onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="작업 정보를 입력하세요"
                    />
                  </div>

                  {(editingOrder.taskType === 'hotpost' || editingOrder.taskType === 'momcafe') && (
                    <ImageUpload
                      images={editForm.imageUrls}
                      onImagesChange={(urls) => setEditForm({ ...editForm, imageUrls: urls })}
                      maxImages={editingOrder.taskType === 'hotpost' ? 1 : 10}
                    />
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEditingOrder(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      저장
                    </button>
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

