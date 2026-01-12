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
  status: 'pending' | 'working' | 'done' | 'reviewing' | 'approved' | 'rejected' | 'completed' | 'draft_uploaded' | 'revision_requested' | 'draft_revised' | 'client_approved' | 'published';
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
  working: '진행중',
  done: '발행 완료',
  draft_uploaded: '원고 업로드 완료',
  revision_requested: '원고 수정요청',
  draft_revised: '원고 수정완료',
  client_approved: '승인완료',
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
  const [allOrders, setAllOrders] = useState<Order[]>([]); // 상태 카운트용 전체 주문 목록
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // 페이지당 항목 수
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
  
  // 원고 수정 모달 상태 (수정 요청 후 수정 완료용)
  const [revisionRequestOrder, setRevisionRequestOrder] = useState<Order | null>(null);
  const [revisionText, setRevisionText] = useState('');
  
  // 발행 완료 모달 상태
  const [publishingOrder, setPublishingOrder] = useState<Order | null>(null);
  const [completedLink, setCompletedLink] = useState('');

  useEffect(() => {
    fetchClients();
    fetchOrders();
  }, [filters]);

  // 초기 로드 시 전체 주문 목록 가져오기 (상태 카운트용)
  useEffect(() => {
    fetchAllOrders();
  }, []);

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

  // 전체 주문 목록 가져오기 (상태 카운트용)
  const fetchAllOrders = async () => {
    try {
      const [blogRes, receiptRes] = await Promise.all([
        fetch('/api/orders?taskType=blog_review'),
        fetch('/api/orders?taskType=receipt_review')
      ]);
      const blogData = blogRes.ok ? await blogRes.json() : { orders: [] };
      const receiptData = receiptRes.ok ? await receiptRes.json() : { orders: [] };
      const all = [...(blogData.orders || []), ...(receiptData.orders || [])];
      setAllOrders(all);
    } catch (error) {
      console.error('Failed to fetch all orders:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 전체 주문 목록도 함께 가져오기 (상태 카운트용)
      await fetchAllOrders();
      
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
        let filteredOrders = [...(blogData.orders || []), ...(receiptData.orders || [])];
        
        // 클라이언트 사이드 추가 필터링
        if (filters.clientId) {
          filteredOrders = filteredOrders.filter((o: Order) => o.client?.id === filters.clientId);
        }
        if (filters.startDate) {
          filteredOrders = filteredOrders.filter((o: Order) => new Date(o.createdAt) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
          filteredOrders = filteredOrders.filter((o: Order) => new Date(o.createdAt) <= new Date(filters.endDate + 'T23:59:59'));
        }
        
        setOrders(filteredOrders);
        setLoading(false);
        return;
      }
      
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const ordersResponse = await fetch(`/api/orders?${params.toString()}`);
      const ordersData = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      let filteredOrders = ordersData.orders || [];
      
      // 클라이언트 사이드 추가 필터링
      if (filters.clientId) {
        filteredOrders = filteredOrders.filter((o: Order) => o.client?.id === filters.clientId);
      }
      if (filters.startDate) {
        filteredOrders = filteredOrders.filter((o: Order) => new Date(o.createdAt) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        filteredOrders = filteredOrders.filter((o: Order) => new Date(o.createdAt) <= new Date(filters.endDate + 'T23:59:59'));
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
    
    // 영수증 리뷰 신청건: 완료 상태로 변경할 때 링크 입력 모달 표시
    if (newStatus === 'done' && order && order.taskType === 'receipt_review') {
      setPublishingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 원고 업로드 상태로 변경할 때 원고 입력 모달 표시 (블로그 리뷰 신청건만)
    if (newStatus === 'draft_uploaded' && order && order.taskType === 'blog_review') {
      setDraftUploadOrder(order);
      setDraftText(order.draftText || '');
      return;
    }
    
    // 원고 수정 완료 상태로 변경할 때 수정된 원고 입력 모달 표시 (블로그 리뷰 신청건만)
    if (newStatus === 'draft_revised' && order && order.taskType === 'blog_review') {
      setRevisionRequestOrder(order);
      setRevisionText(order.revisionText || order.draftText || '');
      return;
    }
    
    // 발행 완료 상태로 변경할 때 완료 링크 입력 모달 표시 (블로그 리뷰 신청건만)
    if (newStatus === 'published' && order && order.taskType === 'blog_review') {
      setPublishingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 그 외의 경우는 바로 상태 변경
    await updateOrderStatus(orderId, newStatus, null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, link: string | null, draftText?: string | null, revisionText?: string | null) => {
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
      
      if (revisionText !== undefined) {
        requestBody.revisionText = revisionText;
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

  const handleSaveRevision = async () => {
    if (!revisionRequestOrder) return;
    
    if (!revisionText.trim()) {
      alert('수정된 원고 내용을 입력해주세요.');
      return;
    }
    
    await updateOrderStatus(revisionRequestOrder.id, 'draft_revised', null, undefined, revisionText.trim());
    setRevisionRequestOrder(null);
    setRevisionText('');
  };

  const handlePublish = async () => {
    if (!publishingOrder) return;
    
    if (!completedLink.trim()) {
      alert('완료 링크를 입력해주세요.');
      return;
    }
    
    // 영수증 리뷰 신청건은 'done' 상태로, 블로그 리뷰 신청건은 'published' 상태로 변경
    const targetStatus = publishingOrder.taskType === 'receipt_review' ? 'done' : 'published';
    await updateOrderStatus(publishingOrder.id, targetStatus, completedLink.trim());
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
  // 발행완료는 전체 개수, 나머지는 현재 시점에 들어와 있는 작업건 개수 (필터링 무관하게 전체 기준)
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, working: 0, done: 0, draft_uploaded: 0, revision_requested: 0, draft_revised: 0, client_approved: 0, published: 0 };
    
    // 모든 상태는 전체 주문 목록 기준으로 계산 (필터링과 무관)
    allOrders.forEach((order) => {
      if (order.status === 'pending') counts.pending++;
      else if (order.status === 'working') counts.working++;
      else if (order.status === 'done') counts.done++;
      else if (order.status === 'draft_uploaded') counts.draft_uploaded++;
      else if (order.status === 'revision_requested') counts.revision_requested++;
      else if (order.status === 'draft_revised') counts.draft_revised++;
      else if (order.status === 'client_approved') counts.client_approved++;
      else if (order.status === 'published') counts.published++;
    });
    
    return counts;
  }, [allOrders]);

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

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.taskType, filters.clientId, filters.startDate, filters.endDate]);


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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-yellow-700 mb-1">대기중</div>
                <div className="text-2xl font-bold text-yellow-900">{statusCounts.pending}</div>
              </div>
              <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'pending' })}
              className="w-full px-2 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded text-xs font-medium transition"
            >
              보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 border-2 border-cyan-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-cyan-700 mb-1">진행중</div>
                <div className="text-2xl font-bold text-cyan-900">{statusCounts.working}</div>
              </div>
              <div className="w-8 h-8 bg-cyan-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'working' })}
              className="w-full px-2 py-1 bg-cyan-200 hover:bg-cyan-300 text-cyan-800 rounded text-xs font-medium transition"
            >
              보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-blue-700 mb-1">원고 업로드</div>
                <div className="text-2xl font-bold text-blue-900">{statusCounts.draft_uploaded}</div>
              </div>
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'draft_uploaded' })}
              className="w-full px-2 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded text-xs font-medium transition"
            >
              보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-orange-700 mb-1">수정요청</div>
                <div className="text-2xl font-bold text-orange-900">{statusCounts.revision_requested}</div>
              </div>
              <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'revision_requested' })}
              className="w-full px-2 py-1 bg-orange-200 hover:bg-orange-300 text-orange-800 rounded text-xs font-medium transition"
            >
              보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-purple-700 mb-1">승인완료</div>
                <div className="text-2xl font-bold text-purple-900">{statusCounts.client_approved}</div>
              </div>
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'client_approved' })}
              className="w-full px-2 py-1 bg-purple-200 hover:bg-purple-300 text-purple-800 rounded text-xs font-medium transition"
            >
              보기
            </button>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-green-700 mb-1">발행완료</div>
                <div className="text-2xl font-bold text-green-900">{statusCounts.published}</div>
              </div>
              <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'published' })}
              className="w-full px-2 py-1 bg-green-200 hover:bg-green-300 text-green-800 rounded text-xs font-medium transition"
            >
              보기
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
                <option value="revision_requested">원고 수정요청</option>
                <option value="draft_revised">원고 수정완료</option>
                <option value="client_approved">승인완료</option>
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
                      ? (() => {
                          const selectedClient = clients.find((c) => c.id === filters.clientId);
                          if (selectedClient) {
                            return selectedClient.companyName 
                              ? `${selectedClient.username} (${selectedClient.companyName})`
                              : selectedClient.username;
                          }
                          return clientSearchTerm;
                        })()
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
                      .filter((client) => {
                        const searchTerm = clientSearchTerm.toLowerCase();
                        const username = (client.username || '').toLowerCase();
                        const companyName = (client.companyName || '').toLowerCase();
                        return username.includes(searchTerm) || companyName.includes(searchTerm);
                      })
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
                          {client.companyName && (
                            <span className="text-gray-500 ml-2">({client.companyName})</span>
                          )}
                        </button>
                      ))}
                    {clients.filter((client) => {
                      const searchTerm = clientSearchTerm.toLowerCase();
                      const username = (client.username || '').toLowerCase();
                      const companyName = (client.companyName || '').toLowerCase();
                      return username.includes(searchTerm) || companyName.includes(searchTerm);
                    }).length === 0 && clientSearchTerm && (
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
          <>
            <div className="space-y-4">
              {paginatedOrders.map((order) => {
              const waitingDays = order.status === 'pending' ? getWaitingDays(order.createdAt) : 0;
              const isPending = order.status === 'pending';
              
              return (
              <div
                key={order.id}
                className={`rounded-lg border-2 p-4 hover:shadow-md transition cursor-pointer ${
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
                            : order.status === 'working'
                            ? 'bg-cyan-100 text-cyan-700'
                            : order.status === 'revision_requested'
                            ? 'bg-orange-100 text-orange-700'
                            : order.status === 'draft_revised'
                            ? 'bg-purple-100 text-purple-700'
                            : order.status === 'client_approved'
                            ? 'bg-indigo-100 text-indigo-700'
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
                      {/* 영수증 리뷰 신청건: 대기중 → 진행중 → 발행 완료 (링크 입력) */}
                      {order.taskType === 'receipt_review' && (
                        <>
                          <option value="working">진행중</option>
                          {order.status === 'working' && (
                            <option value="done">발행 완료</option>
                          )}
                        </>
                      )}
                      {/* 블로그 리뷰 신청건: 기존 워크플로우 유지 */}
                      {order.taskType === 'blog_review' && (
                        <>
                          <option value="working">진행중</option>
                          <option value="draft_uploaded">원고 업로드 완료</option>
                          {/* draft_uploaded 상태일 때 수정요청 또는 승인완료 가능 */}
                          {order.status === 'draft_uploaded' && (
                            <>
                              <option value="revision_requested">원고 수정요청</option>
                              <option value="client_approved">승인완료</option>
                            </>
                          )}
                          {/* revision_requested 상태일 때 수정완료 가능 */}
                          {order.status === 'revision_requested' && (
                            <option value="draft_revised">원고 수정완료</option>
                          )}
                          {/* draft_revised 상태일 때 승인완료 가능 */}
                          {order.status === 'draft_revised' && (
                            <option value="client_approved">승인완료</option>
                          )}
                          {/* client_approved 상태일 때 발행완료 가능 */}
                          {order.status === 'client_approved' && (
                            <option value="published">발행 완료</option>
                          )}
                          {/* published 상태일 때 롤백 가능 */}
                          {order.status === 'published' && (
                            <option value="client_approved">승인완료로 되돌리기</option>
                          )}
                        </>
                      )}
                      {/* 다른 작업 타입은 바로 발행 완료 */}
                      {order.taskType !== 'blog_review' && order.taskType !== 'receipt_review' && (
                        <option value="published">발행 완료</option>
                      )}
                    </select>
                  </div>
                </div>
                {order.imageUrls && order.imageUrls.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      📷 이미지 {order.imageUrls.length}개
                    </span>
                  </div>
                )}
              </div>
            );
            })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  이전
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  다음
                </button>
                <span className="ml-4 text-sm text-gray-600">
                  {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} / {filteredOrders.length}
                </span>
              </div>
            )}
          </>
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
                      {/* 영수증 리뷰 신청건: 대기중 → 진행중 → 발행 완료 (링크 입력) */}
                      {selectedOrder.taskType === 'receipt_review' && (
                        <>
                          <option value="working">진행중</option>
                          {selectedOrder.status === 'working' && (
                            <option value="done">발행 완료</option>
                          )}
                        </>
                      )}
                      {/* 블로그 리뷰 신청건: 기존 워크플로우 유지 */}
                      {selectedOrder.taskType === 'blog_review' && (
                        <>
                          <option value="working">진행중</option>
                          <option value="draft_uploaded">원고 업로드 완료</option>
                          {/* draft_uploaded 상태일 때 수정요청 또는 승인완료 가능 */}
                          {selectedOrder.status === 'draft_uploaded' && (
                            <>
                              <option value="revision_requested">원고 수정요청</option>
                              <option value="client_approved">승인완료</option>
                            </>
                          )}
                          {/* revision_requested 상태일 때 수정완료 가능 */}
                          {selectedOrder.status === 'revision_requested' && (
                            <option value="draft_revised">원고 수정완료</option>
                          )}
                          {/* draft_revised 상태일 때 승인완료 가능 */}
                          {selectedOrder.status === 'draft_revised' && (
                            <option value="client_approved">승인완료</option>
                          )}
                          {/* client_approved 상태일 때 발행완료 가능 */}
                          {selectedOrder.status === 'client_approved' && (
                            <option value="published">발행 완료</option>
                          )}
                          {/* published 상태일 때 롤백 가능 */}
                          {selectedOrder.status === 'published' && (
                            <option value="client_approved">승인완료로 되돌리기</option>
                          )}
                        </>
                      )}
                      {/* 다른 작업 타입은 바로 발행 완료 */}
                      {selectedOrder.taskType !== 'blog_review' && selectedOrder.taskType !== 'receipt_review' && (
                        <option value="published">발행 완료</option>
                      )}
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
                  
                  {/* 원고 표시 (블로그 리뷰 신청만, client_approved 이상 상태) */}
                  {selectedOrder.taskType === 'blog_review' && 
                   (selectedOrder.status === 'client_approved' || selectedOrder.status === 'published') &&
                   (selectedOrder.revisionText || selectedOrder.draftText) && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">원고</div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {selectedOrder.revisionText || selectedOrder.draftText}
                        </div>
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
                                loading="lazy"
                                sizes="(max-width: 768px) 50vw, 25vw"
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

        {/* Revision Modal - 원고 수정 완료 */}
        {revisionRequestOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setRevisionRequestOrder(null);
              setRevisionText('');
            }}
          >
            <div
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    원고 수정 완료
                  </h2>
                  <button
                    onClick={() => {
                      setRevisionRequestOrder(null);
                      setRevisionText('');
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
                      {TASK_TYPE_NAMES[revisionRequestOrder.taskType] || revisionRequestOrder.taskType}
                    </div>
                  </div>
                  
                  {revisionRequestOrder.revisionRequest && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-yellow-900 mb-2">수정 요청 내용</div>
                      <div className="text-sm text-yellow-800 whitespace-pre-wrap">
                        {revisionRequestOrder.revisionRequest}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수정된 원고 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={revisionText}
                      onChange={(e) => setRevisionText(e.target.value)}
                      rows={20}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                      placeholder="수정된 원고 내용을 입력해주세요"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      광고주의 수정 요청에 따라 수정한 원고 내용을 입력해주세요.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setRevisionRequestOrder(null);
                        setRevisionText('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveRevision}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      수정 완료 처리
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
                    {publishingOrder.taskType === 'receipt_review' ? '완료' : '발행 완료'}
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

