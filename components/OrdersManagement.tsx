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
  status: 'pending' | 'working' | 'done' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  completedLink?: string | null;
  createdAt: string;
  client: {
    id: string;
    username: string;
    companyName?: string;
  };
  isExperience?: boolean; // 체험단 신청인지 구분
}

const TASK_TYPE_NAMES: Record<string, string> = {
  follower: '인스타그램 팔로워',
  like: '인스타그램 좋아요',
  hotpost: '인스타그램 인기게시물',
  momcafe: '맘카페',
  powerblog: '파워블로그',
  clip: '클립',
  blog: '블로그 리뷰',
  receipt: '영수증 리뷰',
  daangn: '당근마켓',
  experience: '체험단',
  myexpense: '내돈내산 리뷰',
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

// 체험단 상태를 표시용 상태로 매핑 (대기중, 진행중, 완료로 통일)
const mapExperienceStatusForDisplay = (status: string): string => {
  if (status === 'pending') return 'pending';
  if (['reviewing', 'approved'].includes(status)) return 'working';
  if (status === 'completed') return 'done';
  return 'pending'; // rejected 등 기타 상태는 대기중으로
};

// 표시용 상태를 체험단 실제 상태로 매핑 (API 전송용)
const mapExperienceStatusForAPI = (displayStatus: string): string => {
  if (displayStatus === 'pending') return 'pending';
  if (displayStatus === 'working') return 'approved'; // 진행중은 approved로 저장
  if (displayStatus === 'done') return 'completed';
  return 'pending';
};

// 체험단 상태를 표시용 이름으로 변환
const getExperienceStatusDisplayName = (status: string): string => {
  const displayStatus = mapExperienceStatusForDisplay(status);
  return STATUS_NAMES[displayStatus] || status;
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
  const [completedLink2, setCompletedLink2] = useState(''); // 내돈내산 리뷰용 두 번째 링크
  const [reviewerName, setReviewerName] = useState(''); // 내돈내산 리뷰어 이름
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

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
      let ordersData: any = { orders: [] };
      let experienceData: any[] = [];

      // 체험단 필터가 선택된 경우 orders는 조회하지 않음
      if (filters.taskType !== 'experience') {
        // orders 조회
        const params = new URLSearchParams();
        if (filters.status) {
          // 체험단은 다른 status를 사용하므로 필터링 시 주의
          if (filters.status === 'pending') {
            params.append('status', 'pending');
          } else if (filters.status === 'working') {
            params.append('status', 'working');
          } else if (filters.status === 'done') {
            params.append('status', 'done');
          }
        }
        if (filters.taskType) {
          params.append('taskType', filters.taskType);
        }
        if (filters.clientId) params.append('clientId', filters.clientId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const ordersResponse = await fetch(`/api/orders?${params.toString()}`);
        ordersData = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      }

      // 체험단 신청 조회 (taskType 필터가 없거나 experience인 경우)
      if (!filters.taskType || filters.taskType === 'experience') {
        try {
          const experienceResponse = await fetch('/api/experience-applications');
          if (experienceResponse.ok) {
            const expData = await experienceResponse.json();
            experienceData = (expData.applications || []).map((exp: any) => {
              // 필터링 적용
              if (filters.clientId && exp.clientId !== filters.clientId) {
                return null;
              }
              if (filters.status) {
                // 체험단 status 매핑 (표시용 상태로 변환하여 필터링)
                const displayStatus = mapExperienceStatusForDisplay(exp.status);
                if (filters.status !== displayStatus) return null;
              }
              if (filters.startDate && new Date(exp.createdAt) < new Date(filters.startDate)) {
                return null;
              }
              if (filters.endDate && new Date(exp.createdAt) > new Date(filters.endDate + 'T23:59:59')) {
                return null;
              }

              // 체험단의 실제 상태는 유지하되, 표시용으로는 매핑된 상태 저장
              const originalStatus = exp.status || 'pending';
              return {
                id: exp.id,
                taskType: 'experience',
                caption: `상호명: ${exp.companyName || ''}\n플레이스: ${exp.place || ''}\n희망모집인원: ${exp.desiredParticipants || ''}명\n예약 조율 가능한 번호: ${exp.reservationPhone || ''}\n제공내역: ${exp.providedDetails || ''}\n키워드: ${exp.keywords || ''}\n블로그미션 부가유무: ${exp.blogMissionRequired ? '예' : '아니오'}\n기타전달사항: ${exp.additionalNotes || '(없음)'}`,
                imageUrls: exp.imageUrls && Array.isArray(exp.imageUrls) ? exp.imageUrls : [],
                status: originalStatus, // 실제 상태 유지 (표시할 때만 매핑)
                completedLink: exp.completedLink || null,
                createdAt: exp.createdAt,
                client: {
                  id: exp.clientId,
                  username: exp.clientUsername || '',
                  companyName: exp.companyName || '',
                },
                isExperience: true,
              };
            }).filter((item: any) => item !== null);
          }
        } catch (error) {
          console.error('Failed to fetch experience applications:', error);
        }
      }

      // orders와 체험단 합치기
      const allOrders = [...(ordersData.orders || []), ...experienceData];
      
      // taskType 필터 적용
      let filteredOrders = allOrders;
      if (filters.taskType === 'experience') {
        // 체험단 필터: 체험단만 표시
        filteredOrders = allOrders.filter((o: Order) => o.taskType === 'experience');
      } else if (filters.taskType) {
        // 다른 작업 필터: 해당 작업만 표시 (체험단 제외)
        filteredOrders = allOrders.filter((o: Order) => o.taskType === filters.taskType);
      }

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    
    // 인기게시물/맘카페/파워블로그/클립/체험단/내돈내산 리뷰를 완료로 변경할 때는 링크 입력 모달 표시
    if (newStatus === 'done' && order && (
      order.taskType === 'hotpost' || 
      order.taskType === 'momcafe' || 
      order.taskType === 'powerblog' || 
      order.taskType === 'clip' ||
      order.taskType === 'experience' ||
      order.taskType === 'myexpense'
    )) {
      setCompletingOrder(order);
      setCompletedLink(order.completedLink || '');
      setCompletedLink2((order as any).completedLink2 || '');
      setReviewerName((order as any).reviewerName || '');
      return;
    }
    
    // 그 외의 경우는 바로 상태 변경
    await updateOrderStatus(orderId, newStatus, null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, link: string | null, link2?: string | null, reviewerName?: string | null) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const isExperience = order?.isExperience || order?.taskType === 'experience';

      // 체험단 신청인 경우 별도 API 사용
      if (isExperience) {
        // 표시용 상태를 체험단 실제 상태로 변환
        const experienceStatus = mapExperienceStatusForAPI(newStatus);
        
        const response = await fetch(`/api/experience-applications/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: experienceStatus,
            completedLink: link 
          }),
        });

        if (response.ok) {
          fetchOrders();
          if (selectedOrder?.id === orderId) {
            const data = await response.json();
            // 체험단 데이터를 Order 형식으로 변환
            const exp = data.application;
            // 체험단의 실제 상태는 유지 (표시할 때만 매핑)
            const originalStatus = exp.status || 'pending';
            setSelectedOrder({
              id: exp.id,
              taskType: 'experience',
              caption: `상호명: ${exp.companyName || ''}\n플레이스: ${exp.place || ''}\n희망모집인원: ${exp.desiredParticipants || ''}명\n예약 조율 가능한 번호: ${exp.reservationPhone || ''}\n제공내역: ${exp.providedDetails || ''}\n키워드: ${exp.keywords || ''}\n블로그미션 부가유무: ${exp.blogMissionRequired ? '예' : '아니오'}\n기타전달사항: ${exp.additionalNotes || '(없음)'}`,
              imageUrls: exp.imageUrls && Array.isArray(exp.imageUrls) ? exp.imageUrls : [],
              status: originalStatus, // 실제 상태 유지
              completedLink: exp.completedLink || null,
              createdAt: exp.createdAt,
              client: {
                id: exp.clientId,
                username: exp.clientUsername || '',
                companyName: exp.companyName || '',
              },
              isExperience: true,
            });
          }
          setCompletingOrder(null);
          setCompletedLink('');
        } else {
          const data = await response.json();
          alert(data.error || '체험단 신청 상태 변경에 실패했습니다.');
        }
      } else {
        // 일반 주문인 경우
        const isMyexpense = order?.taskType === 'myexpense';
        const requestBody: any = { 
          status: newStatus,
          completedLink: link || null
        };
        // 내돈내산 리뷰는 completedLink2와 reviewerName도 전송
        if (isMyexpense && link2) {
          requestBody.completedLink2 = link2;
        }
        if (isMyexpense && reviewerName && reviewerName.trim()) {
          requestBody.reviewerName = reviewerName.trim();
        }
        
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          fetchOrders();
          if (selectedOrder?.id === orderId) {
            const data = await response.json();
            setSelectedOrder(data.order);
          }
          setCompletingOrder(null);
          setCompletedLink('');
          setCompletedLink2('');
          setReviewerName('');
        } else {
          const data = await response.json();
          alert(data.error || '상태 변경에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleCompleteWithLink = () => {
    if (!completingOrder) return;
    
    // 내돈내산 리뷰는 2개의 링크와 리뷰어 이름이 모두 필요
    if (completingOrder.taskType === 'myexpense') {
      if (!completedLink.trim() || !completedLink2.trim()) {
        alert('완료 링크 2개를 모두 입력해주세요.');
        return;
      }
      if (!reviewerName.trim()) {
        alert('리뷰어 이름을 입력해주세요.');
        return;
      }
    } else {
      if (!completedLink.trim()) {
        alert('완료 링크를 입력해주세요.');
        return;
      }
    }
    
    // 체험단인 경우 'done' 상태를 사용 (updateOrderStatus에서 API 상태로 변환됨)
    const status = 'done';
    const link = completedLink.trim();
    const link2 = completingOrder.taskType === 'myexpense' ? completedLink2.trim() : null;
    const reviewer = completingOrder.taskType === 'myexpense' ? reviewerName.trim() : null;
    updateOrderStatus(completingOrder.id, status, link, link2, reviewer);
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

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const handleDownloadAllImages = () => {
    if (!selectedOrder || !selectedOrder.imageUrls || selectedOrder.imageUrls.length === 0) {
      return;
    }

    const taskTypeName = TASK_TYPE_NAMES[selectedOrder.taskType] || selectedOrder.taskType;
    const clientName = selectedOrder.client?.username || 'unknown';
    const date = new Date(selectedOrder.createdAt).toISOString().split('T')[0];

    selectedOrder.imageUrls.forEach((url, idx) => {
      const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${taskTypeName}_${clientName}_${date}_${idx + 1}.${extension}`;
      setTimeout(() => downloadImage(url, filename), idx * 200); // 순차 다운로드
    });
  };

  const handleDownloadSelectedImages = () => {
    if (!selectedOrder || !selectedOrder.imageUrls || selectedImages.size === 0) {
      return;
    }

    const taskTypeName = TASK_TYPE_NAMES[selectedOrder.taskType] || selectedOrder.taskType;
    const clientName = selectedOrder.client?.username || 'unknown';
    const date = new Date(selectedOrder.createdAt).toISOString().split('T')[0];

    Array.from(selectedImages).forEach((idx, orderIdx) => {
      const url = selectedOrder.imageUrls[idx];
      const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${taskTypeName}_${clientName}_${date}_${idx + 1}.${extension}`;
      setTimeout(() => downloadImage(url, filename), orderIdx * 200);
    });
  };

  const toggleImageSelection = (idx: number) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(idx)) {
      newSelection.delete(idx);
    } else {
      newSelection.add(idx);
    }
    setSelectedImages(newSelection);
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
                <option value="blog">블로그 리뷰</option>
                <option value="receipt">영수증 리뷰</option>
                <option value="follower">인스타그램 팔로워</option>
                <option value="like">인스타그램 좋아요</option>
                <option value="hotpost">인스타그램 인기게시물</option>
                <option value="momcafe">맘카페</option>
                <option value="daangn">당근마켓</option>
                <option value="experience">체험단</option>
                <option value="powerblog">파워블로그</option>
                <option value="clip">클립</option>
                <option value="myexpense">내돈내산 리뷰</option>
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
                          (() => {
                            // 체험단인 경우 표시용 상태로 변환하여 색상 결정
                            const displayStatus = order.taskType === 'experience' 
                              ? mapExperienceStatusForDisplay(order.status)
                              : order.status;
                            return displayStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : displayStatus === 'working'
                              ? 'bg-blue-100 text-blue-700'
                              : displayStatus === 'done'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700';
                          })()
                        }`}
                      >
                        {order.taskType === 'experience' 
                          ? getExperienceStatusDisplayName(order.status)
                          : (order.taskType === 'follower' || order.taskType === 'like')
                          ? (SIMPLE_STATUS_NAMES[order.status] || STATUS_NAMES[order.status])
                          : (STATUS_NAMES[order.status] || order.status)}
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
                        {order.caption.split('\n').slice(0, 2).map((line, idx) => {
                          if (line.includes('플레이스 링크:')) {
                            const value = line.split(':').slice(1).join(':').trim();
                            const isPlaceLink = value && value !== '(미기재)' && (value.startsWith('http://') || value.startsWith('https://'));
                            return (
                              <p key={idx} className={idx === 0 ? 'font-medium' : ''}>
                                {isPlaceLink ? (
                                  <>
                                    플레이스 링크:{' '}
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary-600 hover:text-primary-700 underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {value}
                                    </a>
                                  </>
                                ) : (
                                  line
                                )}
                              </p>
                            );
                          }
                          return (
                            <p key={idx} className={idx === 0 ? 'font-medium' : ''}>
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={order.taskType === 'experience' 
                        ? mapExperienceStatusForDisplay(order.status)
                        : order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {/* 체험단도 대기중, 진행중, 완료만 표시 */}
                      {order.taskType === 'experience' ? (
                        <>
                          <option value="pending">대기중</option>
                          <option value="working">진행중</option>
                          <option value="done">완료</option>
                        </>
                      ) : (order.taskType === 'follower' || order.taskType === 'like') ? (
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
            onClick={() => {
              setSelectedOrder(null);
              setSelectedImages(new Set());
            }}
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
                      value={selectedOrder.taskType === 'experience' 
                        ? mapExperienceStatusForDisplay(selectedOrder.status)
                        : selectedOrder.status}
                      onChange={(e) =>
                        handleStatusChange(selectedOrder.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {/* 체험단도 대기중, 진행중, 완료만 표시 */}
                      {selectedOrder.taskType === 'experience' ? (
                        <>
                          <option value="pending">대기중</option>
                          <option value="working">진행중</option>
                          <option value="done">완료</option>
                        </>
                      ) : (selectedOrder.taskType === 'follower' || selectedOrder.taskType === 'like') ? (
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
                  {/* 체험단은 수정/삭제 불가 (별도 관리 필요) */}
                  {selectedOrder.taskType !== 'experience' && (
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
                  )}
                  {selectedOrder.caption && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">작업 정보</div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {selectedOrder.caption.split('\n').map((line, idx) => {
                          if (line.includes(':')) {
                            const [key, ...valueParts] = line.split(':');
                            const value = valueParts.join(':').trim();
                            const isPlaceLink = key.trim() === '플레이스 링크' && value && value !== '(미기재)' && (value.startsWith('http://') || value.startsWith('https://'));
                            
                            return (
                              <div key={idx} className="text-gray-900">
                                <span className="font-medium">
                                  {key.trim()}:
                                </span>
                                <span className="ml-2">
                                  {isPlaceLink ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary-600 hover:text-primary-700 underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {value}
                                    </a>
                                  ) : (
                                    value
                                  )}
                                </span>
                              </div>
                            );
                          }
                          return <div key={idx} className="text-gray-900">{line}</div>;
                        })}
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
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-600">
                            이미지 ({selectedOrder.imageUrls.length}개)
                          </div>
                          <div className="flex gap-2">
                            {selectedImages.size > 0 && (
                              <button
                                onClick={handleDownloadSelectedImages}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                              >
                                선택 다운로드 ({selectedImages.size}개)
                              </button>
                            )}
                            <button
                              onClick={handleDownloadAllImages}
                              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              전체 다운로드
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedOrder.imageUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="aspect-square relative rounded-lg overflow-hidden border-2 border-gray-200 group cursor-pointer"
                              style={{
                                borderColor: selectedImages.has(idx) ? '#3b82f6' : '#e5e7eb',
                              }}
                              onClick={() => toggleImageSelection(idx)}
                            >
                              <Image
                                src={url}
                                alt={`Image ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div
                                className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition ${
                                  selectedImages.has(idx) ? 'bg-opacity-20' : ''
                                }`}
                              >
                                {selectedImages.has(idx) && (
                                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div className="absolute top-2 right-2">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    selectedImages.has(idx)
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'bg-white border-gray-400'
                                  }`}
                                >
                                  {selectedImages.has(idx) && (
                                    <span className="text-white text-xs">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedImages.size > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            {selectedImages.size}개 이미지 선택됨
                          </div>
                        )}
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
                      {completingOrder.taskType === 'myexpense' ? '내돈내산 예약자 리뷰' : '완료 링크'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={completedLink}
                      onChange={(e) => setCompletedLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {completingOrder.taskType === 'myexpense' ? '내돈내산 예약자 리뷰 링크를 입력해주세요.' : '완료된 작업의 링크를 입력해주세요.'}
                    </p>
                  </div>
                  
                  {completingOrder.taskType === 'myexpense' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          내돈내산 블로그 리뷰 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={completedLink2}
                          onChange={(e) => setCompletedLink2(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          내돈내산 블로그 리뷰 링크를 입력해주세요.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          리뷰어 이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="리뷰어 이름을 입력해주세요"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          완료된 리뷰를 작성한 리뷰어의 이름을 입력해주세요.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setCompletingOrder(null);
                        setCompletedLink('');
                        setCompletedLink2('');
                        setReviewerName('');
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

