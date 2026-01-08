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
  draft_uploaded: '원고 업로드 완료',
  revision_requested: '원고 수정요청',
  draft_revised: '원고 수정완료',
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
  
  // 이미 텍스트 형식인 경우 그대로 반환
  return guideText;
};

export default function ReviewOrdersManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // 전체 주문 목록 (상태 카운트용)
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    taskType: '',
    clientId: '',
  });
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  
  // 일괄 삭제를 위한 선택된 주문 ID 관리
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // 필터 변경 시 선택 초기화
  useEffect(() => {
    setSelectedOrderIds(new Set());
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
      // 전체 주문 목록 조회 (상태 카운트용) - 필터 없이 조회
      const allParams = new URLSearchParams();
      if (filters.clientId) allParams.append('clientId', filters.clientId);
      
      // 전체 리뷰 발주 조회 (blog_review, receipt_review)
      const [allBlogRes, allReceiptRes] = await Promise.all([
        fetch(`/api/orders?${allParams.toString()}&taskType=blog_review`),
        fetch(`/api/orders?${allParams.toString()}&taskType=receipt_review`)
      ]);
      const allBlogData = allBlogRes.ok ? await allBlogRes.json() : { orders: [] };
      const allReceiptData = allReceiptRes.ok ? await allReceiptRes.json() : { orders: [] };
      let totalAllOrders = [...(allBlogData.orders || []), ...(allReceiptData.orders || [])];
      
      // 클라이언트 필터링 (전체 목록)
      if (filters.clientId) {
        totalAllOrders = totalAllOrders.filter((o: Order) => o.client?.id === filters.clientId);
      }
      
      // 전체 주문 목록 저장 (상태 카운트용)
      setAllOrders(totalAllOrders);
      
      // 필터링된 주문 목록 (표시용)
      let filteredOrders = totalAllOrders;
      
      // 상태 필터링
      if (filters.status) {
        if (filters.status === 'published_no_link') {
          // 발행완료 상태이지만 링크가 없는 경우
          filteredOrders = filteredOrders.filter((o: Order) => 
            o.status === 'published' && !o.completedLink
          );
        } else {
          filteredOrders = filteredOrders.filter((o: Order) => o.status === filters.status);
        }
      }
      
      // 작업 타입 필터링
      if (filters.taskType) {
        filteredOrders = filteredOrders.filter((o: Order) => o.taskType === filters.taskType);
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
    
    // 발행완료 상태에서 롤백 (진행중 또는 원고 업로드 상태로 되돌리기)
    if (order && order.status === 'published') {
      // 블로그 리뷰는 draft_uploaded 또는 working으로 롤백 가능
      if (order.taskType === 'blog_review' && newStatus === 'draft_uploaded') {
        // completedLink를 null로 설정하고 원고 입력 모달 표시
        setDraftUploadOrder(order);
        setDraftText(order.draftText || '');
        // 상태는 모달에서 저장할 때 변경됨
        return;
      }
      if (order.taskType === 'blog_review' && newStatus === 'working') {
        // completedLink를 null로 설정하여 롤백
        await updateOrderStatus(orderId, newStatus, null);
        return;
      }
      // 영수증 리뷰는 working으로 롤백
      if (order.taskType === 'receipt_review' && newStatus === 'working') {
        // completedLink를 null로 설정하여 롤백
        await updateOrderStatus(orderId, newStatus, null);
        return;
      }
    }
    
    // 영수증 리뷰와 블로그 리뷰 모두 working 상태로 변경 가능
    if (newStatus === 'working' && order && (order.taskType === 'receipt_review' || order.taskType === 'blog_review') && order.status === 'pending') {
      await updateOrderStatus(orderId, newStatus, null);
      return;
    }
    
    // 영수증 리뷰는 원고 업로드 단계를 건너뛰고 바로 발행 완료로
    if (newStatus === 'draft_uploaded' && order && order.taskType === 'receipt_review') {
      // 영수증 리뷰는 원고 업로드 단계 없이 바로 발행 완료로 이동
      setPublishingOrder(order);
      setCompletedLink(order.completedLink || '');
      return;
    }
    
    // 블로그 리뷰만 원고 업로드 상태로 변경할 때 원고 입력 모달 표시
    // working 또는 revision_requested 상태에서도 재수정할 수 있도록 허용
    if (newStatus === 'draft_uploaded' && order && order.taskType === 'blog_review') {
      setDraftUploadOrder(order);
      setDraftText(order.draftText || '');
      return;
    }
    
    // revision_requested 상태에서 원고 재수정 (draft_uploaded로 변경)
    if (order && order.status === 'revision_requested' && order.taskType === 'blog_review') {
      // 수정 요청된 원고를 다시 draft_uploaded 상태로 변경하려면 원고 입력 모달 표시
      setDraftUploadOrder(order);
      setDraftText(order.draftText || '');
      return;
    }
    
    // 발행 완료 상태로 변경할 때 완료 링크 입력 모달 표시
    if (newStatus === 'published' && order) {
      // 영수증 리뷰는 working 또는 pending에서 published로 가능
      if (order.taskType === 'receipt_review' && (order.status === 'pending' || order.status === 'working' || order.status === 'client_approved' || order.status === 'draft_uploaded' || order.status === 'draft_revised')) {
        setPublishingOrder(order);
        setCompletedLink(order.completedLink || '');
        return;
      }
      // 블로그 리뷰는 client_approved, draft_uploaded, draft_revised에서만 published로 가능
      if (order.taskType === 'blog_review' && (order.status === 'client_approved' || order.status === 'draft_uploaded' || order.status === 'draft_revised')) {
        setPublishingOrder(order);
        setCompletedLink(order.completedLink || '');
        return;
      }
    }
    
    // 그 외의 경우는 바로 상태 변경
    await updateOrderStatus(orderId, newStatus, null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, link: string | null, draftText?: string | null) => {
    try {
      const requestBody: any = { 
        status: newStatus,
      };
      
      // link가 null이면 completedLink를 null로 설정 (롤백 시)
      if (link === null) {
        requestBody.completedLink = null;
      } else if (link !== undefined && link.trim() !== '') {
        requestBody.completedLink = link.trim();
      }
      
      if (draftText !== undefined && draftText !== null) {
        requestBody.draftText = draftText;
      }
      
      console.log('Updating order:', orderId, requestBody);
      
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
        console.error('Update failed:', data);
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
    
    // revision_requested 상태에서 수정한 경우 draft_revised로 변경 (원고 수정완료)
    // published 상태에서 롤백하는 경우 draft_uploaded로 변경 (completedLink는 null로 설정)
    const newStatus = draftUploadOrder.status === 'revision_requested' ? 'draft_revised' : 'draft_uploaded';
    await updateOrderStatus(draftUploadOrder.id, newStatus, null, draftText.trim());
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
        // 선택된 목록에서도 제거
        const newSelection = new Set(selectedOrderIds);
        newSelection.delete(orderId);
        setSelectedOrderIds(newSelection);
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

  // 일괄 삭제 핸들러 (발행완료 상태이지만 링크가 없는 작업건만)
  const handleBulkDelete = async () => {
    const publishedNoLinkOrders = filteredOrders.filter(
      (order) => order.status === 'published' && !order.completedLink
    );
    
    const selectedPublishedNoLink = publishedNoLinkOrders.filter(
      (order) => selectedOrderIds.has(order.id)
    );

    if (selectedPublishedNoLink.length === 0) {
      alert('삭제할 작업건을 선택해주세요.\n발행완료 상태이지만 링크가 없는 작업건만 선택할 수 있습니다.');
      return;
    }

    const orderDetails = selectedPublishedNoLink
      .map((order) => `${order.client?.username || '알 수 없음'} - ${TASK_TYPE_NAMES[order.taskType] || order.taskType}`)
      .join('\n');

    if (!confirm(`정말로 선택한 ${selectedPublishedNoLink.length}개 작업건을 삭제하시겠습니까?\n\n선택된 작업건:\n${orderDetails}\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = selectedPublishedNoLink.map((order) =>
        fetch(`/api/orders/${order.id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter((res) => res.ok).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        fetchOrders();
        setSelectedOrderIds(new Set());
        if (selectedOrder && selectedPublishedNoLink.some((o) => o.id === selectedOrder.id)) {
          setSelectedOrder(null);
        }
      }

      if (failedCount > 0) {
        alert(`성공: ${successCount}개, 실패: ${failedCount}개 작업건이 삭제되었습니다.`);
      } else {
        alert(`성공적으로 ${successCount}개 작업건을 삭제했습니다.`);
      }
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 주문 선택 토글
  const toggleOrderSelection = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    // 발행완료 상태이지만 링크가 없는 작업건만 선택 가능
    if (order && order.status === 'published' && !order.completedLink) {
      const newSelection = new Set(selectedOrderIds);
      if (newSelection.has(orderId)) {
        newSelection.delete(orderId);
      } else {
        newSelection.add(orderId);
      }
      setSelectedOrderIds(newSelection);
    }
  };

  // 전체 선택/해제 (발행완료 상태이지만 링크가 없는 작업건만)
  const toggleSelectAll = () => {
    const publishedNoLinkOrders = filteredOrders.filter(
      (order) => order.status === 'published' && !order.completedLink
    );
    
    if (publishedNoLinkOrders.length === 0) {
      return;
    }

    const allSelected = publishedNoLinkOrders.every((order) => selectedOrderIds.has(order.id));
    
    if (allSelected) {
      // 모두 선택되어 있으면 모두 해제
      const newSelection = new Set(selectedOrderIds);
      publishedNoLinkOrders.forEach((order) => newSelection.delete(order.id));
      setSelectedOrderIds(newSelection);
    } else {
      // 일부만 선택되어 있거나 아무것도 선택되지 않았으면 모두 선택
      const newSelection = new Set(selectedOrderIds);
      publishedNoLinkOrders.forEach((order) => newSelection.add(order.id));
      setSelectedOrderIds(newSelection);
    }
  };

  // 상태별 개수 계산 (리뷰 발주 전용) - 전체 주문 목록 기준
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, working: 0, draft_uploaded: 0, revision_requested: 0, draft_revised: 0, client_approved: 0, published: 0, published_no_link: 0 };
    allOrders.forEach((order) => {
      if (order.status === 'pending') counts.pending++;
      else if (order.status === 'working') counts.working++;
      else if (order.status === 'draft_uploaded') counts.draft_uploaded++;
      else if (order.status === 'revision_requested') counts.revision_requested++;
      else if (order.status === 'draft_revised') counts.draft_revised++;
      else if (order.status === 'client_approved') counts.client_approved++;
      else if (order.status === 'published') {
        counts.published++;
        // 발행완료 상태이지만 링크가 없는 경우
        if (!order.completedLink) {
          counts.published_no_link++;
        }
      }
    });
    return counts;
  }, [allOrders]);

  // 필터링 및 정렬된 주문 목록 (리뷰 발주 전용)
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

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
  }, [orders, filters]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'pending' ? '' : 'pending' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'pending'
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">대기중</div>
            <div className={`text-2xl font-bold ${filters.status === 'pending' ? 'text-yellow-700' : 'text-gray-900'}`}>
              {statusCounts.pending}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'working' ? '' : 'working' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'working'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">진행중</div>
            <div className={`text-2xl font-bold ${filters.status === 'working' ? 'text-blue-700' : 'text-gray-900'}`}>
              {statusCounts.working}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'draft_uploaded' ? '' : 'draft_uploaded' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'draft_uploaded'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">원고 업로드 완료</div>
            <div className={`text-2xl font-bold ${filters.status === 'draft_uploaded' ? 'text-blue-700' : 'text-gray-900'}`}>
              {statusCounts.draft_uploaded}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'revision_requested' ? '' : 'revision_requested' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'revision_requested'
                ? 'bg-orange-50 border-orange-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">원고 수정요청</div>
            <div className={`text-2xl font-bold ${filters.status === 'revision_requested' ? 'text-orange-700' : 'text-gray-900'}`}>
              {statusCounts.revision_requested}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'draft_revised' ? '' : 'draft_revised' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'draft_revised'
                ? 'bg-purple-50 border-purple-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">원고 수정완료</div>
            <div className={`text-2xl font-bold ${filters.status === 'draft_revised' ? 'text-purple-700' : 'text-gray-900'}`}>
              {statusCounts.draft_revised}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'client_approved' ? '' : 'client_approved' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'client_approved'
                ? 'bg-indigo-50 border-indigo-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">승인완료</div>
            <div className={`text-2xl font-bold ${filters.status === 'client_approved' ? 'text-indigo-700' : 'text-gray-900'}`}>
              {statusCounts.client_approved}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'published' ? '' : 'published' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'published'
                ? 'bg-green-50 border-green-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">발행 완료</div>
            <div className={`text-2xl font-bold ${filters.status === 'published' ? 'text-green-700' : 'text-gray-900'}`}>
              {statusCounts.published}
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, status: filters.status === 'published_no_link' ? '' : 'published_no_link' })}
            className={`p-3 rounded-lg border text-left transition ${
              filters.status === 'published_no_link'
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">발행완료(링크없음)</div>
            <div className={`text-2xl font-bold ${filters.status === 'published_no_link' ? 'text-red-700' : 'text-gray-900'}`}>
              {statusCounts.published_no_link}
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-3 mb-4 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <option value="draft_uploaded">원고 업로드 완료</option>
                <option value="revision_requested">원고 수정요청</option>
                <option value="draft_revised">원고 수정완료</option>
                <option value="client_approved">승인완료</option>
                <option value="published">발행 완료</option>
                <option value="published_no_link">발행완료(링크없음)</option>
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
            {/* 일괄 삭제 컨트롤 (발행완료 상태이지만 링크가 없는 작업건만) */}
            {filteredOrders.some((order) => order.status === 'published' && !order.completedLink) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 text-sm border border-red-300 rounded text-red-700 hover:bg-red-100 transition"
                  >
                    {filteredOrders
                      .filter((order) => order.status === 'published' && !order.completedLink)
                      .every((order) => selectedOrderIds.has(order.id))
                      ? '전체 해제'
                      : '전체 선택'}
                  </button>
                  <span className="text-sm text-red-700">
                    발행완료 상태이지만 링크가 없는 작업건: {filteredOrders.filter((order) => order.status === 'published' && !order.completedLink).length}개
                    {selectedOrderIds.size > 0 && ` (${selectedOrderIds.size}개 선택됨)`}
                  </span>
                </div>
                {selectedOrderIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? '삭제 중...' : `일괄 삭제 (${selectedOrderIds.size}개)`}
                  </button>
                )}
              </div>
            )}
            {filteredOrders.map((order) => {
              const waitingDays = order.status === 'pending' ? getWaitingDays(order.createdAt) : 0;
              const isPending = order.status === 'pending';
              const isPublishedNoLink = order.status === 'published' && !order.completedLink;
              
              return (
                <div
                  key={order.id}
                  className={`rounded-lg border p-4 hover:bg-gray-50 transition cursor-pointer ${
                    isPending 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : isPublishedNoLink
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* 체크박스 (발행완료 상태이지만 링크가 없는 작업건만) */}
                    {isPublishedNoLink && (
                      <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer"
                        />
                      </div>
                    )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                        {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-700'
                            : order.status === 'draft_uploaded'
                            ? 'bg-blue-50 text-blue-700'
                            : order.status === 'revision_requested'
                            ? 'bg-orange-50 text-orange-700'
                            : order.status === 'draft_revised'
                            ? 'bg-purple-50 text-purple-700'
                            : order.status === 'client_approved'
                            ? 'bg-indigo-50 text-indigo-700'
                            : order.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {STATUS_NAMES[order.status] || order.status}
                      </span>
                      {isPublishedNoLink && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          링크 없음
                        </span>
                      )}
                      {isPending && waitingDays > 0 && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">
                          {waitingDays}일 대기
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
                  <div className="flex items-center gap-2">
                    {/* 발행완료(링크없음) 상태일 때 삭제 버튼 강조 표시 */}
                    {isPublishedNoLink && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('정말 이 발주를 삭제하시겠습니까?\n발행완료 상태이지만 링크가 없는 작업건입니다.')) {
                            handleDeleteOrder(order.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        삭제
                      </button>
                    )}
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                    <option value="pending">대기중</option>
                    {/* 블로그 리뷰와 영수증 리뷰 모두 pending -> working */}
                    {(order.taskType === 'blog_review' || order.taskType === 'receipt_review') && order.status === 'pending' && (
                      <option value="working">진행중</option>
                    )}
                    {/* 블로그 리뷰는 working -> draft_uploaded */}
                    {order.taskType === 'blog_review' && order.status === 'working' && (
                      <option value="draft_uploaded">원고 업로드 완료</option>
                    )}
                    {/* 블로그 리뷰는 draft_uploaded -> published */}
                    {order.taskType === 'blog_review' && order.status === 'draft_uploaded' && (
                      <option value="published">발행 완료</option>
                    )}
                    {/* 블로그 리뷰는 draft_revised, client_approved -> published */}
                    {order.taskType === 'blog_review' && (order.status === 'draft_revised' || order.status === 'client_approved') && (
                      <option value="published">발행 완료</option>
                    )}
                    {/* 블로그 리뷰는 published -> draft_uploaded (롤백) */}
                    {order.taskType === 'blog_review' && order.status === 'published' && (
                      <option value="draft_uploaded">원고 업로드 완료로 되돌리기</option>
                    )}
                    {/* 영수증 리뷰는 working -> published */}
                    {order.taskType === 'receipt_review' && order.status === 'working' && (
                      <option value="published">발행 완료</option>
                    )}
                    {/* 영수증 리뷰는 published -> working (롤백) */}
                    {order.taskType === 'receipt_review' && order.status === 'published' && (
                      <option value="working">진행중으로 되돌리기</option>
                    )}
                  </select>
                </div>
                {order.imageUrls && order.imageUrls.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {order.imageUrls.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className={`w-16 h-16 relative rounded overflow-hidden border-2 bg-gray-100 ${
                          idx === 0 && order.taskType === 'blog_review'
                            ? 'border-primary-500'
                            : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`Image ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        {idx === 0 && order.taskType === 'blog_review' && (
                          <div className="absolute top-0.5 left-0.5 bg-primary-500 text-white px-1 py-0.5 rounded text-[10px] font-medium">
                            대표
                          </div>
                        )}
                      </div>
                    ))}
                    {order.imageUrls.length > 3 && (
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-xs text-gray-600">
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
                      {/* 블로그 리뷰와 영수증 리뷰 모두 pending -> working으로 가능 */}
                      {(selectedOrder.taskType === 'blog_review' || selectedOrder.taskType === 'receipt_review') && selectedOrder.status === 'pending' && (
                        <option value="working">진행중</option>
                      )}
                      {/* 블로그 리뷰는 working -> draft_uploaded로 가능 */}
                      {selectedOrder.taskType === 'blog_review' && selectedOrder.status === 'working' && (
                        <option value="draft_uploaded">원고 업로드 완료</option>
                      )}
                      {/* 블로그 리뷰는 draft_uploaded에서 published로 가능 */}
                      {selectedOrder.taskType === 'blog_review' && selectedOrder.status === 'draft_uploaded' && (
                        <option value="published">발행 완료</option>
                      )}
                      {/* 블로그 리뷰 revision_requested 상태에서 재수정 */}
                      {selectedOrder.taskType === 'blog_review' && selectedOrder.status === 'revision_requested' && (
                        <option value="draft_uploaded">원고 재수정 (수정완료)</option>
                      )}
                      {/* 블로그 리뷰는 draft_revised, client_approved에서 published로 가능 */}
                      {selectedOrder.taskType === 'blog_review' && (selectedOrder.status === 'draft_revised' || selectedOrder.status === 'client_approved') && (
                        <option value="published">발행 완료</option>
                      )}
                      {/* 블로그 리뷰는 published -> draft_uploaded 또는 working (롤백) */}
                      {selectedOrder.taskType === 'blog_review' && selectedOrder.status === 'published' && (
                        <>
                          <option value="draft_uploaded">원고 업로드 완료로 되돌리기</option>
                          <option value="working">진행중으로 되돌리기</option>
                        </>
                      )}
                      {/* 영수증 리뷰는 working -> published로 가능 */}
                      {selectedOrder.taskType === 'receipt_review' && selectedOrder.status === 'working' && (
                        <option value="published">발행 완료</option>
                      )}
                      {/* 영수증 리뷰는 pending에서 직접 published도 가능 (옵션) */}
                      {selectedOrder.taskType === 'receipt_review' && selectedOrder.status === 'pending' && (
                        <option value="published">발행 완료 (직접)</option>
                      )}
                      {/* 영수증 리뷰는 published -> working (롤백) */}
                      {selectedOrder.taskType === 'receipt_review' && selectedOrder.status === 'published' && (
                        <option value="working">진행중으로 되돌리기</option>
                      )}
                    </select>
                    {/* revision_requested 상태일 때 재수정 버튼 표시 */}
                    {selectedOrder.status === 'revision_requested' && selectedOrder.taskType === 'blog_review' && (
                      <button
                        onClick={() => {
                          setDraftUploadOrder(selectedOrder);
                          setDraftText(selectedOrder.draftText || '');
                        }}
                        className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                      >
                        원고 재수정하기
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {selectedOrder.status === 'published' && !selectedOrder.completedLink && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          발행완료 상태이지만 링크가 없는 작업건입니다
                        </div>
                        <p className="text-xs text-red-600">
                          예전에 전산 시스템 도입 전에 등록된 작업건으로, 광고주 화면에서 혼란을 줄 수 있습니다.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const confirmMessage = selectedOrder.status === 'published' && !selectedOrder.completedLink
                          ? '정말 이 발주를 삭제하시겠습니까?\n발행완료 상태이지만 링크가 없는 작업건입니다.'
                          : '정말 이 발주를 삭제하시겠습니까?\n대기중 상태인 경우 작업 개수가 복구됩니다.';
                        if (confirm(confirmMessage)) {
                          handleDeleteOrder(selectedOrder.id);
                          setSelectedOrder(null);
                        }
                      }}
                      className={`w-full px-4 py-2 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 ${
                        selectedOrder.status === 'published' && !selectedOrder.completedLink
                          ? 'bg-red-600 font-semibold'
                          : 'bg-red-600'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      삭제
                    </button>
                  </div>
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
                          <div className="text-gray-900 whitespace-pre-wrap">
                            {formatGuideTextForDisplay(selectedOrder.guideText || '', selectedOrder.client?.companyName || '')}
                          </div>
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
                  
                  {/* 원고 내용 */}
                  {selectedOrder.draftText && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">원고 내용</div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-gray-900 whitespace-pre-wrap font-mono text-sm">
                          {selectedOrder.draftText}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 수정 요청 내용 */}
                  {selectedOrder.revisionRequest && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">수정 요청 내용</div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-yellow-900 whitespace-pre-wrap">
                          {selectedOrder.revisionRequest}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 수정된 원고 (광고주가 직접 수정한 경우) */}
                  {selectedOrder.revisionText && selectedOrder.revisionText !== selectedOrder.draftText && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">광고주가 수정한 원고</div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-gray-900 whitespace-pre-wrap font-mono text-sm">
                          {selectedOrder.revisionText}
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
                          {selectedOrder.imageUrls.map((url, idx) => {
                            const isFeatured = idx === 0 && selectedOrder.taskType === 'blog_review';
                            return (
                              <div
                                key={idx}
                                className={`aspect-square relative rounded-lg overflow-hidden border-2 group cursor-pointer ${
                                  selectedImages.has(idx)
                                    ? 'border-blue-600'
                                    : isFeatured
                                    ? 'border-primary-500'
                                    : 'border-gray-200'
                                }`}
                                onClick={() => toggleImageSelection(idx)}
                              >
                                <Image
                                  src={url}
                                  alt={`Image ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                {isFeatured && (
                                  <div className="absolute top-2 left-2 bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 z-10">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    대표사진
                                  </div>
                                )}
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
                            );
                          })}
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
                    {draftUploadOrder.status === 'revision_requested' ? '원고 재수정' : '원고 업로드'}
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
                  
                  {/* 수정 요청 내용 표시 */}
                  {draftUploadOrder.status === 'revision_requested' && draftUploadOrder.revisionRequest && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-yellow-900 mb-2">수정 요청 내용</div>
                      <div className="text-sm text-yellow-800 whitespace-pre-wrap">
                        {draftUploadOrder.revisionRequest}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      원고 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={20}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm text-gray-900 placeholder:text-gray-400"
                      placeholder="작성한 원고 내용을 입력해주세요"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {draftUploadOrder.status === 'revision_requested' 
                        ? '수정 요청 내용을 반영하여 원고를 재작성해주세요. 수정 완료 후 광고주가 다시 확인할 수 있습니다.'
                        : '작성한 원고 텍스트를 입력해주세요.'}
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
                      {draftUploadOrder.status === 'revision_requested' ? '수정 완료' : '원고 업로드'}
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
      </div>
    </div>
  );
}

