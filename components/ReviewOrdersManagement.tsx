'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils';
import ImageUpload from './ImageUpload';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  imageUrls: string[];
  status: 'pending' | 'working' | 'done' | 'reviewing' | 'approved' | 'rejected' | 'completed' | 'draft_uploaded' | 'revision_requested' | 'client_approved' | 'published';
  completedLink?: string | null;
  draftText?: string | null;
  revisionText?: string | null;
  revisionRequest?: string | null;
  videoUrl?: string | null;
  guideFileUrl?: string | null;
  guideText?: string | null;
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
  daangn: '당근마켓 후기',
  experience: '체험단',
  myexpense: '내돈내산 리뷰',
  blog_review: '블로그 리뷰 신청',
  receipt_review: '영수증 리뷰 신청',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  draft_uploaded: '원고 업로드 완료',
  published: '발행 완료',
};

// 대기 시간 계산 함수
const getWaitingDays = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function ReviewOrdersManagement() {
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
  
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  
  // 원고 업로드 모달 상태 (리뷰 신청용)
  const [draftUploadOrder, setDraftUploadOrder] = useState<Order | null>(null);
  const [draftText, setDraftText] = useState('');
  
  // 발행 완료 모달 상태
  const [publishingOrder, setPublishingOrder] = useState<Order | null>(null);
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
      // 리뷰 발주만 조회 (blog_review, receipt_review)
      const params = new URLSearchParams();
      
      // 리뷰 상태 필터링 (pending, draft_uploaded, published)
      if (filters.status) {
        params.append('status', filters.status);
      }
      
      // 리뷰 타입 필터링
      if (filters.taskType) {
        params.append('taskType', filters.taskType);
      } else {
        // taskType 필터가 없으면 blog_review와 receipt_review를 모두 조회
        const [blogRes, receiptRes] = await Promise.all([
          fetch(`/api/orders?${params.toString()}&taskType=blog_review`),
          fetch(`/api/orders?${params.toString()}&taskType=receipt_review`)
        ]);
        const blogData = blogRes.ok ? await blogRes.json() : { orders: [] };
        const receiptData = receiptRes.ok ? await receiptRes.json() : { orders: [] };
        let allOrders = [...(blogData.orders || []), ...(receiptData.orders || [])];
        
        // 클라이언트 사이드 추가 필터링
        if (filters.clientId) {
          allOrders = allOrders.filter((o: Order) => o.client?.id === filters.clientId);
        }
        if (filters.startDate) {
          allOrders = allOrders.filter((o: Order) => new Date(o.createdAt) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
          allOrders = allOrders.filter((o: Order) => new Date(o.createdAt) <= new Date(filters.endDate + 'T23:59:59'));
        }
        
        setOrders(allOrders);
        setLoading(false);
        return;
      }
      
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const ordersResponse = await fetch(`/api/orders?${params.toString()}`);
      const ordersData = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      let allOrders = ordersData.orders || [];
      
      // 클라이언트 사이드 추가 필터링
      if (filters.clientId) {
        allOrders = allOrders.filter((o: Order) => o.client?.id === filters.clientId);
      }
      if (filters.startDate) {
        allOrders = allOrders.filter((o: Order) => new Date(o.createdAt) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        allOrders = allOrders.filter((o: Order) => new Date(o.createdAt) <= new Date(filters.endDate + 'T23:59:59'));
      }
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    
    // 영수증 리뷰는 원고 업로드 단계를 건너뛰고 바로 발행 완료로
    if (newStatus === 'draft_uploaded' && order && order.taskType === 'receipt_review') {
      // 영수증 리뷰는 원고 업로드 단계 없이 바로 발행 완료로 이동
      setPublishingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 블로그 리뷰만 원고 업로드 상태로 변경할 때 원고 입력 모달 표시
    if (newStatus === 'draft_uploaded' && order && order.taskType === 'blog_review') {
      setDraftUploadOrder(order);
      setDraftText(order.draftText || '');
      return;
    }
    
    // 발행 완료 상태로 변경할 때 완료 링크 입력 모달 표시
    if (newStatus === 'published' && order) {
      setPublishingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 그 외의 경우는 바로 상태 변경
    await updateOrderStatus(orderId, newStatus, null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, link: string | null, draftText?: string | null) => {
    try {
      const requestBody: any = { 
        status: newStatus,
      };
      
      if (link !== null) {
        requestBody.completedLink = link;
      }
      
      if (draftText !== undefined) {
        requestBody.draftText = draftText;
      }
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        const data = await response.json();
        alert(data.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleSaveDraft = async () => {
    if (!draftUploadOrder) return;
    
    if (!draftText.trim()) {
      alert('원고 내용을 입력해주세요.');
      return;
    }
    
    await updateOrderStatus(draftUploadOrder.id, 'draft_uploaded', null, draftText.trim());
    setDraftUploadOrder(null);
    setDraftText('');
  };

  const handlePublish = async () => {
    if (!publishingOrder) return;
    
    if (!completedLink.trim()) {
      alert('완료 링크를 입력해주세요.');
      return;
    }
    
    await updateOrderStatus(publishingOrder.id, 'published', completedLink.trim());
    setPublishingOrder(null);
    setCompletedLink('');
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

  // 상태별 개수 계산 (리뷰 발주 전용)
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, draft_uploaded: 0, published: 0 };
    orders.forEach((order) => {
      if (order.status === 'pending') counts.pending++;
      else if (order.status === 'draft_uploaded') counts.draft_uploaded++;
      else if (order.status === 'published') counts.published++;
    });
    return counts;
  }, [orders]);

  // 필터링 및 정렬된 주문 목록 (리뷰 발주 전용)
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // 상태 필터링
    if (filters.status) {
      filtered = filtered.filter((order) => order.status === filters.status);
    }

    // 정렬: 대기중일 때는 오래된 순(오름차순), 나머지는 최신순(내림차순)
    filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      
      // 필터링된 상태가 대기중이면 오래된 순
      if (filters.status === 'pending') {
        return aTime - bTime; // 오름차순 (오래된 것 먼저)
      }
      // 그 외에는 최신순
      return bTime - aTime; // 내림차순 (최신 것 먼저)
    });

    return filtered;
  }, [orders, filters.status]);


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
          <h1 className="text-2xl font-bold text-gray-900">리뷰 발주 내역 관리</h1>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-yellow-700 mb-1">대기중 작업</div>
                <div className="text-3xl font-bold text-yellow-900">{statusCounts.pending}</div>
              </div>
              <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'pending' })}
              className="mt-3 w-full px-3 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded-lg text-sm font-medium transition"
            >
              대기중 작업 보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">원고 업로드 완료</div>
                <div className="text-3xl font-bold text-blue-900">{statusCounts.draft_uploaded}</div>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'draft_uploaded' })}
              className="mt-3 w-full px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-lg text-sm font-medium transition"
            >
              원고 업로드 완료 보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-700 mb-1">발행 완료</div>
                <div className="text-3xl font-bold text-green-900">{statusCounts.published}</div>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'published' })}
              className="mt-3 w-full px-3 py-1.5 bg-green-200 hover:bg-green-300 text-green-800 rounded-lg text-sm font-medium transition"
            >
              발행 완료 보기
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
            <button
              onClick={() => setFilters({ status: 'pending', taskType: '', clientId: '', startDate: '', endDate: '' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filters.status === 'pending' && !filters.taskType && !filters.clientId && !filters.startDate && !filters.endDate
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              대기중
            </button>
            <button
              onClick={() => setFilters({ status: 'draft_uploaded', taskType: '', clientId: '', startDate: '', endDate: '' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filters.status === 'draft_uploaded' && !filters.taskType && !filters.clientId && !filters.startDate && !filters.endDate
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              원고 업로드 완료
            </button>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setFilters({ status: 'pending', taskType: '', clientId: '', startDate: today, endDate: '' });
              }}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition"
            >
              오늘 신청된 작업
            </button>
            <button
              onClick={() => setFilters({ status: '', taskType: '', clientId: '', startDate: '', endDate: '' })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              전체 초기화
            </button>
          </div>
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
                <option value="draft_uploaded">원고 업로드 완료</option>
                <option value="published">발행 완료</option>
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
                <option value="blog_review">블로그 리뷰 신청</option>
                <option value="receipt_review">영수증 리뷰 신청</option>
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
            {filteredOrders.map((order) => {
              const waitingDays = order.status === 'pending' ? getWaitingDays(order.createdAt) : 0;
              const isPending = order.status === 'pending';
              
              return (
              <div
                key={order.id}
                className={`rounded-lg border-2 p-6 hover:shadow-md transition cursor-pointer ${
                  isPending 
                    ? 'bg-yellow-50 border-yellow-300' 
                    : 'bg-white border-gray-200'
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                        {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : order.status === 'draft_uploaded'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'revision_requested'
                            ? 'bg-orange-100 text-orange-700'
                            : order.status === 'client_approved'
                            ? 'bg-purple-100 text-purple-700'
                            : order.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_NAMES[order.status] || order.status}
                      </span>
                      {isPending && waitingDays > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {waitingDays}일 대기중
                        </span>
                      )}
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
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">
                        {formatDateTime(order.createdAt)}
                      </p>
                      {isPending && waitingDays >= 3 && (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠ 오래된 작업
                        </span>
                      )}
                    </div>
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
                      <option value="pending">대기중</option>
                      {order.taskType === 'blog_review' && (
                        <option value="draft_uploaded">원고 업로드 완료</option>
                      )}
                      <option value="published">발행 완료</option>
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
            );
            })}
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
                      value={selectedOrder.status}
                      onChange={(e) =>
                        handleStatusChange(selectedOrder.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="pending">대기중</option>
                      {selectedOrder.taskType === 'blog_review' && (
                        <option value="draft_uploaded">원고 업로드 완료</option>
                      )}
                      <option value="published">발행 완료</option>
                    </select>
                  </div>
                  {(
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
                  {/* 가이드 */}
                  {(selectedOrder.guideFileUrl || selectedOrder.guideText) && (
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
                          <div className="text-gray-900 whitespace-pre-wrap">{selectedOrder.guideText}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 동영상 */}
                  {selectedOrder.videoUrl && (
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

        {/* Draft Upload Modal */}
        {draftUploadOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setDraftUploadOrder(null);
              setDraftText('');
            }}
          >
            <div
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    원고 업로드
                  </h2>
                  <button
                    onClick={() => {
                      setDraftUploadOrder(null);
                      setDraftText('');
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
                      {TASK_TYPE_NAMES[draftUploadOrder.taskType] || draftUploadOrder.taskType}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      원고 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={20}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                      placeholder="작성한 원고 내용을 입력해주세요"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      작성한 원고 텍스트를 입력해주세요.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setDraftUploadOrder(null);
                        setDraftText('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveDraft}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      원고 업로드
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publish Modal */}
        {publishingOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setPublishingOrder(null);
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
                    발행 완료
                  </h2>
                  <button
                    onClick={() => {
                      setPublishingOrder(null);
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
                      {TASK_TYPE_NAMES[publishingOrder.taskType] || publishingOrder.taskType}
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
                      발행된 리뷰의 완료 링크를 입력해주세요.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setPublishingOrder(null);
                        setCompletedLink('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handlePublish}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      발행 완료 처리
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

