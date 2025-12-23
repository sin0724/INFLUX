'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  completedLink: string | null;
  completedLink2?: string | null; // 내돈내산 리뷰용 두 번째 링크
  reviewerName?: string | null; // 내돈내산 리뷰어 이름
  status: string;
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
  blog: '블로그 리뷰',
  receipt: '영수증 리뷰',
  daangn: '당근마켓 후기',
  experience: '체험단',
  myexpense: '내돈내산 리뷰',
};

export default function CompletedLinksView() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  
  // 블로그/영수증 리뷰 링크 추가 모달 상태
  const [showBlogReceiptModal, setShowBlogReceiptModal] = useState(false);
  const [selectedClientForLink, setSelectedClientForLink] = useState<any>(null);
  const [blogLinks, setBlogLinks] = useState<string[]>(['']);
  const [receiptLinks, setReceiptLinks] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  // 내돈내산 리뷰 링크 추가 모달 상태
  const [showMyexpenseModal, setShowMyexpenseModal] = useState(false);
  const [selectedClientForMyexpense, setSelectedClientForMyexpense] = useState<any>(null);
  const [myexpenseCompletedLink, setMyexpenseCompletedLink] = useState('');
  const [myexpenseCompletedLink2, setMyexpenseCompletedLink2] = useState('');
  const [myexpenseReviewerName, setMyexpenseReviewerName] = useState('');
  const [myexpenseClientSearchTerm, setMyexpenseClientSearchTerm] = useState('');
  const [showMyexpenseClientDropdown, setShowMyexpenseClientDropdown] = useState(false);
  const [submittingMyexpense, setSubmittingMyexpense] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 표시할 광고주 그룹 수
  
  // 드롭다운 상태 (펼쳐진 광고주 목록)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // 엑셀 일괄등록 상태
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkLinkType, setBulkLinkType] = useState<'blog' | 'receipt'>('blog');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<{
    success: Array<{ row: any; clientId: string; clientName: string }>;
    failed: Array<{ row: any; error: string }>;
  } | null>(null);

  useEffect(() => {
    fetchClients();
    fetchCompletedOrders();
  }, [selectedClientId]);

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

  const fetchCompletedOrders = async () => {
    setLoading(true);
    try {
      // 주문(orders) 조회
      const params = new URLSearchParams();
      params.append('status', 'done');
      if (selectedClientId) {
        params.append('clientId', selectedClientId);
      }

      const ordersResponse = await fetch(`/api/orders?${params.toString()}`);
      const ordersData = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      
      // 완료된 주문 모두 표시 (링크가 없어도 표시)
      // completedLink2도 포함되도록 명시적으로 매핑
      const completedOrders = (ordersData.orders || []).filter(
        (order: Order) => order.status === 'done'
      ).map((order: any) => ({
        ...order,
        completedLink2: order.completedLink2 || null, // 명시적으로 포함
        reviewerName: order.reviewerName || null, // 명시적으로 포함
      }));

      // 체험단(experience_applications) 조회
      const experienceResponse = await fetch('/api/experience-applications');
      const experienceData = experienceResponse.ok ? await experienceResponse.json() : { applications: [] };
      
      // 완료된 체험단 모두 표시 (링크가 없어도 표시)
      const completedExperiences = (experienceData.applications || [])
        .filter((exp: any) => {
          if (selectedClientId && exp.clientId !== selectedClientId) {
            return false;
          }
          // 완료된 체험단만 표시 (status가 completed이거나 completedLink가 있으면 표시)
          return exp.status === 'completed' || exp.completedLink;
        })
        .map((exp: any) => ({
          id: exp.id,
          taskType: 'experience',
          caption: `상호명: ${exp.companyName || ''}\n플레이스: ${exp.place || ''}\n희망모집인원: ${exp.desiredParticipants || ''}명`,
          completedLink: exp.completedLink,
          status: exp.status || 'completed',
          createdAt: exp.createdAt,
          client: {
            id: exp.clientId,
            username: exp.clientUsername || '',
            companyName: exp.companyName || '',
          },
        }));

      // 주문과 체험단 합치기
      setOrders([...completedOrders, ...completedExperiences]);
    } catch (error) {
      console.error('Failed to fetch completed orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // 블로그/영수증 리뷰 링크 추가
  const handleAddBlogReceiptLink = async () => {
    if (!selectedClientForLink) return;
    
    // 빈 링크 제거
    const validBlogLinks = blogLinks.filter(link => link.trim());
    const validReceiptLinks = receiptLinks.filter(link => link.trim());
    
    if (validBlogLinks.length === 0 && validReceiptLinks.length === 0) {
      alert('블로그 리뷰 또는 영수증 리뷰 링크 중 하나는 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders/blog-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientForLink.id,
          blogLinks: validBlogLinks.length > 0 ? validBlogLinks : null,
          receiptLinks: validReceiptLinks.length > 0 ? validReceiptLinks : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 더 자세한 오류 메시지 표시
        let errorMessage = data.error || '링크 추가에 실패했습니다.';
        if (data.hint) {
          errorMessage += `\n\n${data.hint}`;
        }
        if (data.details && data.details !== data.error) {
          errorMessage += `\n\n오류 상세: ${data.details}`;
        }
        alert(errorMessage);
        setSubmitting(false);
        return;
      }

      const successCount = (data.results?.blogSuccessCount || 0) + (data.results?.receiptSuccessCount || 0);
      const failedCount = (data.results?.blogFailedCount || 0) + (data.results?.receiptFailedCount || 0);
      
      let message = `총 ${successCount}개의 링크가 성공적으로 추가되었습니다.`;
      if (failedCount > 0) {
        message += `\n${failedCount}개의 링크 추가에 실패했습니다.`;
        
        // 실패한 링크의 상세 오류 메시지 추가
        const failedBlogs = data.results?.blogResults?.failed || [];
        const failedReceipts = data.results?.receiptResults?.failed || [];
        const allFailed = [...failedBlogs, ...failedReceipts];
        
        if (allFailed.length > 0) {
          message += '\n\n실패한 링크:';
          allFailed.forEach((failed: any, index: number) => {
            if (index < 5) { // 최대 5개만 표시
              message += `\n- ${failed.link}: ${failed.error}`;
            }
          });
          if (allFailed.length > 5) {
            message += `\n...외 ${allFailed.length - 5}개`;
          }
        }
      }
      alert(message);
      
      setShowBlogReceiptModal(false);
      setSelectedClientForLink(null);
      setBlogLinks(['']);
      setReceiptLinks(['']);
      setClientSearchTerm('');
      setShowClientDropdown(false);
      fetchCompletedOrders();
    } catch (error) {
      console.error('Failed to add blog/receipt link:', error);
      alert('링크 추가 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 블로그 링크 추가
  const addBlogLink = () => {
    setBlogLinks([...blogLinks, '']);
  };

  // 블로그 링크 삭제
  const removeBlogLink = (index: number) => {
    if (blogLinks.length > 1) {
      setBlogLinks(blogLinks.filter((_, i) => i !== index));
    } else {
      setBlogLinks(['']);
    }
  };

  // 블로그 링크 업데이트
  const updateBlogLink = (index: number, value: string) => {
    const newLinks = [...blogLinks];
    newLinks[index] = value;
    setBlogLinks(newLinks);
  };

  // 영수증 링크 추가
  const addReceiptLink = () => {
    setReceiptLinks([...receiptLinks, '']);
  };

  // 영수증 링크 삭제
  const removeReceiptLink = (index: number) => {
    if (receiptLinks.length > 1) {
      setReceiptLinks(receiptLinks.filter((_, i) => i !== index));
    } else {
      setReceiptLinks(['']);
    }
  };

  // 영수증 링크 업데이트
  const updateReceiptLink = (index: number, value: string) => {
    const newLinks = [...receiptLinks];
    newLinks[index] = value;
    setReceiptLinks(newLinks);
  };

  // 내돈내산 리뷰 링크 추가
  const handleAddMyexpenseLink = async () => {
    if (!selectedClientForMyexpense) return;
    
    if (!myexpenseCompletedLink.trim() || !myexpenseCompletedLink2.trim()) {
      alert('내돈내산 예약자 리뷰 링크와 블로그 리뷰 링크를 모두 입력해주세요.');
      return;
    }

    if (!myexpenseReviewerName.trim()) {
      alert('리뷰어 이름을 입력해주세요.');
      return;
    }

    setSubmittingMyexpense(true);
    try {
      const response = await fetch('/api/orders/myexpense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientForMyexpense.id,
          completedLink: myexpenseCompletedLink.trim(),
          completedLink2: myexpenseCompletedLink2.trim(),
          reviewerName: myexpenseReviewerName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || '링크 추가에 실패했습니다.';
        if (data.hint) {
          errorMessage += `\n\n${data.hint}`;
        }
        alert(errorMessage);
        setSubmittingMyexpense(false);
        return;
      }

      alert('내돈내산 리뷰 링크가 성공적으로 추가되었습니다.');
      
      setShowMyexpenseModal(false);
      setSelectedClientForMyexpense(null);
      setMyexpenseCompletedLink('');
      setMyexpenseCompletedLink2('');
      setMyexpenseReviewerName('');
      setMyexpenseClientSearchTerm('');
      setShowMyexpenseClientDropdown(false);
      fetchCompletedOrders();
    } catch (error) {
      console.error('Failed to add myexpense link:', error);
      alert('링크 추가 중 오류가 발생했습니다.');
    } finally {
      setSubmittingMyexpense(false);
    }
  };

  // 완료된 링크를 TXT 파일로 다운로드 (전체 또는 특정 업체)
  const downloadCompletedLinksAsTxt = (clientId?: string) => {
    let ordersToDownload = filteredOrders;
    let clientName = '';

    // 특정 업체만 다운로드하는 경우
    if (clientId) {
      ordersToDownload = filteredOrders.filter(order => order.client.id === clientId);
      const client = clients.find(c => c.id === clientId);
      if (client) {
        clientName = client.companyName || client.username;
      }
    }

    if (ordersToDownload.length === 0) {
      alert('다운로드할 완료된 링크가 없습니다.');
      return;
    }

    // 필터링된 주문을 광고주별, 작업 타입별로 그룹화
    const grouped = ordersToDownload.reduce((acc, order) => {
      const orderClientId = order.client.id;
      if (!acc[orderClientId]) {
        acc[orderClientId] = {
          client: order.client,
          taskTypes: {} as Record<string, Order[]>,
        };
      }
      if (!acc[orderClientId].taskTypes[order.taskType]) {
        acc[orderClientId].taskTypes[order.taskType] = [];
      }
      acc[orderClientId].taskTypes[order.taskType].push(order);
      return acc;
    }, {} as Record<string, { client: Order['client']; taskTypes: Record<string, Order[]> }>);

    // TXT 파일 내용 생성
    let content = '';
    content += '='.repeat(80) + '\n';
    content += '완료된 링크 모아보기\n';
    content += '='.repeat(80) + '\n';
    content += `생성일시: ${new Date().toLocaleString('ko-KR')}\n`;
    if (clientId) {
      content += `업체: ${clientName}\n`;
    } else if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient) {
        content += `필터: ${selectedClient.username}${selectedClient.companyName ? ` (${selectedClient.companyName})` : ''}\n`;
      }
    }
    if (searchQuery) {
      content += `검색어: ${searchQuery}\n`;
    }
    content += `총 링크 개수: ${ordersToDownload.length}개\n`;
    content += '='.repeat(80) + '\n\n';

    // 광고주별로 정리
    Object.values(grouped).forEach((group, clientIndex) => {
      if (!clientId) {
        content += '\n' + '-'.repeat(80) + '\n';
        content += `[${clientIndex + 1}] 광고주: ${group.client.username}`;
        if (group.client.companyName) {
          content += ` (${group.client.companyName})`;
        }
        content += '\n';
        content += '-'.repeat(80) + '\n';
      }

      // 작업 타입별로 정리
      Object.entries(group.taskTypes).forEach(([taskType, orders]) => {
        content += `\n  • ${TASK_TYPE_NAMES[taskType] || taskType} (${orders.length}개)\n`;
        content += '  ' + '-'.repeat(76) + '\n';

        orders.forEach((order, orderIndex) => {
          content += `\n    [${orderIndex + 1}] ${formatDateTime(order.createdAt)}\n`;
          
          if (order.caption) {
            const captionLines = order.caption.split('\n').slice(0, 2);
            captionLines.forEach(line => {
              if (line.trim()) {
                content += `      ${line}\n`;
              }
            });
          }

          // 내돈내산 리뷰의 경우 특별 처리
          if (order.taskType === 'myexpense') {
            if (order.completedLink) {
              content += `      예약자 리뷰 링크: ${order.completedLink}\n`;
            }
            if (order.completedLink2) {
              content += `      블로그 리뷰 링크: ${order.completedLink2}\n`;
            }
            if (order.reviewerName) {
              content += `      리뷰어 이름: ${order.reviewerName}\n`;
            }
          } else {
            // 일반 링크
            if (order.completedLink) {
              content += `      완료 링크: ${order.completedLink}\n`;
            }
          }
          
          content += '\n';
        });
      });

      content += '\n';
    });

    // 파일명 생성
    const dateStr = new Date().toISOString().split('T')[0];
    let fileName = `완료된_링크_${dateStr}`;
    if (clientId && clientName) {
      fileName += `_${clientName}`;
    } else if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient) {
        fileName += `_${selectedClient.username}`;
      }
    }
    fileName += '.txt';

    // Blob 생성 및 다운로드
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 엑셀 템플릿 다운로드
  const downloadExcelTemplate = () => {
    const template = [
      {
        순번: 1,
        상호명: '예시 광고주명',
        링크: 'https://example.com/review-link',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '링크 목록');
    
    // 컬럼 너비 조정
    worksheet['!cols'] = [
      { wch: 8 },  // 순번
      { wch: 20 }, // 상호명
      { wch: 50 }, // 링크
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, '블로그영수증_링크_일괄등록_템플릿.xlsx');
  };

  // 엑셀 파일 업로드 및 파싱
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkUploadResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert('엑셀 파일이 비어있습니다.');
        setBulkUploading(false);
        return;
      }

      // 필수 컬럼 확인
      const firstRow = jsonData[0] as any;
      if (!firstRow.상호명 && !firstRow['상호명']) {
        alert('엑셀 파일에 "상호명" 컬럼이 없습니다.');
        setBulkUploading(false);
        return;
      }
      if (!firstRow.링크 && !firstRow['링크']) {
        alert('엑셀 파일에 "링크" 컬럼이 없습니다.');
        setBulkUploading(false);
        return;
      }

      // API 호출
      const response = await fetch('/api/orders/blog-receipt/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: jsonData,
          linkType: bulkLinkType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '일괄 등록에 실패했습니다.');
        setBulkUploading(false);
        return;
      }

      setBulkUploadResult(result.results);
      
      const successCount = result.results.success.length;
      const failedCount = result.results.failed.length;
      
      let message = `총 ${successCount}개의 링크가 성공적으로 추가되었습니다.`;
      if (failedCount > 0) {
        message += `\n${failedCount}개의 링크 추가에 실패했습니다.\n\n실패한 항목들은 엑셀 파일로 다운로드할 수 있습니다.`;
      }
      alert(message);
      
      fetchCompletedOrders();
    } catch (error: any) {
      console.error('Failed to upload excel:', error);
      alert('엑셀 파일 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setBulkUploading(false);
      // 파일 input 초기화
      event.target.value = '';
    }
  };

  // 실패한 항목들을 엑셀로 다운로드
  const downloadFailedItemsAsExcel = () => {
    if (!bulkUploadResult || bulkUploadResult.failed.length === 0) {
      alert('다운로드할 실패한 항목이 없습니다.');
      return;
    }

    const failedData = bulkUploadResult.failed.map((item) => ({
      순번: item.row.순번 || '',
      상호명: item.row.상호명 || '',
      링크: item.row.링크 || '',
      오류내용: item.error,
    }));

    const worksheet = XLSX.utils.json_to_sheet(failedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '실패한 항목');
    
    // 컬럼 너비 조정
    worksheet['!cols'] = [
      { wch: 8 },  // 순번
      { wch: 20 }, // 상호명
      { wch: 50 }, // 링크
      { wch: 50 }, // 오류내용
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `등록실패항목_${dateStr}.xlsx`);
  };

  // 완료된 링크 삭제 (체험단은 제외)
  const handleDeleteOrder = async (orderId: string, taskType: string) => {
    // 체험단은 삭제하지 않음
    if (taskType === 'experience') {
      alert('체험단은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm('이 완료된 링크를 삭제하시겠습니까?\n삭제 시 광고주의 할당량이 복구됩니다.')) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('완료된 링크가 삭제되었고, 광고주의 할당량이 복구되었습니다.');
        fetchCompletedOrders();
      } else {
        const data = await response.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // 검색어로 필터링
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase().trim();
    return orders.filter((order) => {
      // 광고주 이름 검색
      const clientName = order.client.username?.toLowerCase() || '';
      const companyName = order.client.companyName?.toLowerCase() || '';
      
      // 작업 종류 검색
      const taskTypeName = TASK_TYPE_NAMES[order.taskType]?.toLowerCase() || '';
      
      // 링크 URL 검색
      const link = order.completedLink?.toLowerCase() || '';
      
      // 작업 정보 검색
      const caption = order.caption?.toLowerCase() || '';
      
      return (
        clientName.includes(query) ||
        companyName.includes(query) ||
        taskTypeName.includes(query) ||
        link.includes(query) ||
        caption.includes(query)
      );
    });
  }, [orders, searchQuery]);

  // 광고주별로 그룹화, 각 광고주 내에서 작업 타입별로 그룹화
  const groupedByClientAndTaskType = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const clientId = order.client.id;
      if (!acc[clientId]) {
        acc[clientId] = {
          client: order.client,
          taskTypes: {} as Record<string, Order[]>,
        };
      }
      if (!acc[clientId].taskTypes[order.taskType]) {
        acc[clientId].taskTypes[order.taskType] = [];
      }
      acc[clientId].taskTypes[order.taskType].push(order);
      return acc;
    }, {} as Record<string, { client: Order['client']; taskTypes: Record<string, Order[]> }>);
  }, [filteredOrders]);

  const allGroupedOrders = Object.values(groupedByClientAndTaskType);
  
  // 페이지네이션: 전체 광고주 필터일 때만 적용
  const shouldPaginate = !selectedClientId && !searchQuery.trim();
  const totalPages = shouldPaginate ? Math.ceil(allGroupedOrders.length / itemsPerPage) : 1;
  
  // 현재 페이지에 표시할 데이터
  const groupedOrders = useMemo(() => {
    if (!shouldPaginate) {
      return allGroupedOrders;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allGroupedOrders.slice(startIndex, endIndex);
  }, [allGroupedOrders, currentPage, shouldPaginate, itemsPerPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로가기</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">완료된 링크 모아보기</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowBlogReceiptModal(true);
                setSelectedClientForLink(null);
                setBlogLinks(['']);
                setReceiptLinks(['']);
                setClientSearchTerm('');
                setShowClientDropdown(false);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              블로그/영수증 리뷰 링크 추가
            </button>
            <button
              onClick={() => {
                setShowBulkUploadModal(true);
                setBulkLinkType('blog');
                setBulkUploadResult(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              엑셀 일괄등록
            </button>
            <button
              onClick={() => {
                setShowMyexpenseModal(true);
                setSelectedClientForMyexpense(null);
                setMyexpenseCompletedLink('');
                setMyexpenseCompletedLink2('');
                setMyexpenseReviewerName('');
                setMyexpenseClientSearchTerm('');
                setShowMyexpenseClientDropdown(false);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              내돈내산 리뷰 링크 추가
            </button>
            {filteredOrders.length > 0 && (
              <button
                onClick={() => downloadCompletedLinksAsTxt()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                완료된 링크 TXT 다운로드 ({filteredOrders.length}개)
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
            {/* 검색 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // 검색 시 첫 페이지로
                }}
                placeholder="광고주명, 회사명, 작업종류, 링크 등으로 검색..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            
            {/* 광고주 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고주 필터
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setCurrentPage(1); // 필터 변경 시 첫 페이지로
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">전체 광고주</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.username} {client.companyName && `(${client.companyName})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 검색 결과 개수 및 페이지 정보 표시 */}
          <div className="flex items-center justify-between mb-4">
            {searchQuery && (
              <div className="text-sm text-gray-600">
                검색 결과: {filteredOrders.length}개
              </div>
            )}
            {shouldPaginate && allGroupedOrders.length > 0 && (
              <div className="text-sm text-gray-600">
                전체 {allGroupedOrders.length}개 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allGroupedOrders.length)}번째 표시 (페이지 {currentPage} / {totalPages})
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : groupedOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">
              {searchQuery ? '검색 결과가 없습니다.' : '완료된 링크가 없습니다.'}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm"
              >
                검색어 지우기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedOrders.map((group) => {
              const isExpanded = expandedClients.has(group.client.id);
              const totalOrders = Object.values(group.taskTypes).reduce((sum, orders) => sum + orders.length, 0);
              
              return (
                <div
                  key={group.client.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* 드롭다운 헤더 */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const newExpanded = new Set(expandedClients);
                      if (newExpanded.has(group.client.id)) {
                        newExpanded.delete(group.client.id);
                      } else {
                        newExpanded.add(group.client.id);
                      }
                      setExpandedClients(newExpanded);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* 펼침/접기 아이콘 */}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'transform rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-gray-900">
                            {group.client.username}
                            {group.client.companyName && (
                              <span className="text-gray-600 ml-2">
                                ({group.client.companyName})
                              </span>
                            )}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            완료된 작업: {totalOrders}개
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 헤더 클릭 이벤트와 분리
                            setSelectedClientForLink(group.client);
                            setBlogLinks(['']);
                            setReceiptLinks(['']);
                            setClientSearchTerm('');
                            setShowClientDropdown(false);
                            setShowBlogReceiptModal(true);
                          }}
                          className="text-sm px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition"
                        >
                          블로그/영수증 링크 추가
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadCompletedLinksAsTxt(group.client.id);
                          }}
                          className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          TXT 다운로드
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 드롭다운 내용 - 간단한 리스트 형식 */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {Object.entries(group.taskTypes).map(([taskType, orders]) => (
                          <div key={taskType} className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                                {TASK_TYPE_NAMES[taskType] || taskType}
                              </span>
                              <span className="text-xs text-gray-500">
                                {orders.length}개
                              </span>
                            </div>
                            <div className="space-y-2 pl-4">
                              {orders.map((order) => (
                                <div
                                  key={order.id}
                                  className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 -mx-2 group"
                                >
                                  <div className="flex-1 min-w-0">
                                    {order.completedLink && (
                                      <a
                                        href={order.completedLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary-600 hover:text-primary-700 hover:underline break-all"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {order.completedLink}
                                      </a>
                                    )}
                                    {order.taskType === 'myexpense' && order.completedLink2 && (
                                      <>
                                        <br />
                                        <a
                                          href={order.completedLink2}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline break-all"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {order.completedLink2}
                                        </a>
                                      </>
                                    )}
                                    {!order.completedLink && !order.completedLink2 && (
                                      <span className="text-sm text-gray-400">
                                        링크 없음
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <span className="text-xs text-gray-400 hidden group-hover:inline">
                                      {formatDateTime(order.createdAt)}
                                    </span>
                                    {order.taskType !== 'experience' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteOrder(order.id, order.taskType);
                                        }}
                                        disabled={deletingOrderId === order.id}
                                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {deletingOrderId === order.id ? '삭제 중...' : '삭제'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {shouldPaginate && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`px-3 py-2 border rounded-lg transition ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 블로그/영수증 리뷰 링크 추가 모달 */}
      {showBlogReceiptModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              블로그/영수증 리뷰 링크 추가
            </h2>

            {/* 광고주 선택 - 검색 가능 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고주 선택 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedClientForLink ? `${selectedClientForLink.username}${selectedClientForLink.companyName ? ` (${selectedClientForLink.companyName})` : ''}` : clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value) {
                      setSelectedClientForLink(null);
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => {
                    // 드롭다운 클릭을 위해 약간의 지연
                    setTimeout(() => setShowClientDropdown(false), 200);
                  }}
                  placeholder="광고주를 검색하세요..."
                  disabled={!!selectedClientForLink && !clientSearchTerm}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-10"
                />
                {(selectedClientForLink || clientSearchTerm) && !selectedClientForLink && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientSearchTerm('');
                      setShowClientDropdown(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    ×
                  </button>
                )}
                {selectedClientForLink && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClientForLink(null);
                      setClientSearchTerm('');
                      setShowClientDropdown(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    변경
                  </button>
                )}
                
                {/* 검색 드롭다운 */}
                {showClientDropdown && !selectedClientForLink && (
                  <div 
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()} // blur 이벤트 방지
                  >
                    {clients
                      .filter((client) => {
                        const searchLower = clientSearchTerm.toLowerCase();
                        return (
                          client.username.toLowerCase().includes(searchLower) ||
                          (client.companyName && client.companyName.toLowerCase().includes(searchLower))
                        );
                      })
                      .map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientForLink(client);
                            setClientSearchTerm('');
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
                        >
                          <div className="font-medium">{client.username}</div>
                          {client.companyName && (
                            <div className="text-xs text-gray-500">{client.companyName}</div>
                          )}
                        </button>
                      ))}
                    {clients.filter((client) => {
                      const searchLower = clientSearchTerm.toLowerCase();
                      return (
                        client.username.toLowerCase().includes(searchLower) ||
                        (client.companyName && client.companyName.toLowerCase().includes(searchLower))
                      );
                    }).length === 0 && clientSearchTerm && (
                      <div className="px-3 py-2 text-gray-500 text-sm text-center">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 블로그 리뷰 링크 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  블로그 리뷰 링크
                </label>
                <button
                  type="button"
                  onClick={addBlogLink}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  + 링크 추가
                </button>
              </div>
              <div className="space-y-2">
                {blogLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateBlogLink(index, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    {blogLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlogLink(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                각 링크 입력 시 블로그 리뷰 quota가 1개씩 차감됩니다. (총 {blogLinks.filter(l => l.trim()).length}개)
              </p>
            </div>

            {/* 영수증 리뷰 링크 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  영수증 리뷰 링크
                </label>
                <button
                  type="button"
                  onClick={addReceiptLink}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  + 링크 추가
                </button>
              </div>
              <div className="space-y-2">
                {receiptLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateReceiptLink(index, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    {receiptLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReceiptLink(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                각 링크 입력 시 영수증 리뷰 quota가 1개씩 차감됩니다. (총 {receiptLinks.filter(l => l.trim()).length}개)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBlogReceiptModal(false);
                  setSelectedClientForLink(null);
                  setBlogLinks(['']);
                  setReceiptLinks(['']);
                  setClientSearchTerm('');
                  setShowClientDropdown(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddBlogReceiptLink}
                disabled={submitting || !selectedClientForLink || (blogLinks.filter(l => l.trim()).length === 0 && receiptLinks.filter(l => l.trim()).length === 0)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 내돈내산 리뷰 링크 추가 모달 */}
      {showMyexpenseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              내돈내산 리뷰 링크 추가
            </h2>

            {/* 광고주 선택 - 검색 가능 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고주 선택 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedClientForMyexpense ? `${selectedClientForMyexpense.username}${selectedClientForMyexpense.companyName ? ` (${selectedClientForMyexpense.companyName})` : ''}` : myexpenseClientSearchTerm}
                  onChange={(e) => {
                    setMyexpenseClientSearchTerm(e.target.value);
                    setShowMyexpenseClientDropdown(true);
                    if (!e.target.value) {
                      setSelectedClientForMyexpense(null);
                    }
                  }}
                  onFocus={() => setShowMyexpenseClientDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowMyexpenseClientDropdown(false), 200);
                  }}
                  placeholder="광고주를 검색하세요..."
                  disabled={!!selectedClientForMyexpense && !myexpenseClientSearchTerm}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-10"
                />
                {(selectedClientForMyexpense || myexpenseClientSearchTerm) && !selectedClientForMyexpense && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMyexpenseClientSearchTerm('');
                      setShowMyexpenseClientDropdown(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    ×
                  </button>
                )}
                {selectedClientForMyexpense && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClientForMyexpense(null);
                      setMyexpenseClientSearchTerm('');
                      setShowMyexpenseClientDropdown(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    변경
                  </button>
                )}
                
                {/* 검색 드롭다운 */}
                {showMyexpenseClientDropdown && !selectedClientForMyexpense && (
                  <div 
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {clients
                      .filter((client) => {
                        const searchLower = myexpenseClientSearchTerm.toLowerCase();
                        return (
                          client.username.toLowerCase().includes(searchLower) ||
                          (client.companyName && client.companyName.toLowerCase().includes(searchLower))
                        );
                      })
                      .map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientForMyexpense(client);
                            setMyexpenseClientSearchTerm('');
                            setShowMyexpenseClientDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
                        >
                          <div className="font-medium">{client.username}</div>
                          {client.companyName && (
                            <div className="text-xs text-gray-500">{client.companyName}</div>
                          )}
                        </button>
                      ))}
                    {clients.filter((client) => {
                      const searchLower = myexpenseClientSearchTerm.toLowerCase();
                      return (
                        client.username.toLowerCase().includes(searchLower) ||
                        (client.companyName && client.companyName.toLowerCase().includes(searchLower))
                      );
                    }).length === 0 && myexpenseClientSearchTerm && (
                      <div className="px-3 py-2 text-gray-500 text-sm text-center">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 내돈내산 예약자 리뷰 링크 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내돈내산 예약자 리뷰 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={myexpenseCompletedLink}
                onChange={(e) => setMyexpenseCompletedLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* 내돈내산 블로그 리뷰 링크 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내돈내산 블로그 리뷰 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={myexpenseCompletedLink2}
                onChange={(e) => setMyexpenseCompletedLink2(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* 리뷰어 이름 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                리뷰어 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={myexpenseReviewerName}
                onChange={(e) => setMyexpenseReviewerName(e.target.value)}
                placeholder="리뷰어 이름을 입력해주세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            <p className="text-xs text-gray-500 mb-4">
              내돈내산 리뷰 quota가 1개 차감됩니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMyexpenseModal(false);
                  setSelectedClientForMyexpense(null);
                  setMyexpenseCompletedLink('');
                  setMyexpenseCompletedLink2('');
                  setMyexpenseReviewerName('');
                  setMyexpenseClientSearchTerm('');
                  setShowMyexpenseClientDropdown(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddMyexpenseLink}
                disabled={submittingMyexpense || !selectedClientForMyexpense || !myexpenseCompletedLink.trim() || !myexpenseCompletedLink2.trim() || !myexpenseReviewerName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingMyexpense ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 일괄등록 모달 */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              엑셀 일괄등록
            </h2>

            {/* 링크 타입 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                링크 타입 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="blog"
                    checked={bulkLinkType === 'blog'}
                    onChange={(e) => setBulkLinkType(e.target.value as 'blog' | 'receipt')}
                    className="mr-2"
                  />
                  블로그 리뷰
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="receipt"
                    checked={bulkLinkType === 'receipt'}
                    onChange={(e) => setBulkLinkType(e.target.value as 'blog' | 'receipt')}
                    className="mr-2"
                  />
                  영수증 리뷰
                </label>
              </div>
            </div>

            {/* 엑셀 파일 업로드 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                엑셀 파일 업로드 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={bulkUploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                엑셀 파일 형식: 순번, 상호명, 링크 (상호명으로 자동 매칭됩니다)
              </p>
            </div>

            {/* 템플릿 다운로드 */}
            <div className="mb-4">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                템플릿 다운로드
              </button>
            </div>

            {/* 업로드 결과 */}
            {bulkUploadResult && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="mb-2">
                  <span className="font-medium text-green-600">
                    성공: {bulkUploadResult.success.length}개
                  </span>
                </div>
                {bulkUploadResult.failed.length > 0 && (
                  <div className="mb-2">
                    <span className="font-medium text-red-600">
                      실패: {bulkUploadResult.failed.length}개
                    </span>
                    <button
                      type="button"
                      onClick={downloadFailedItemsAsExcel}
                      className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                    >
                      실패한 항목 다운로드
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadResult(null);
                  setBulkLinkType('blog');
                }}
                disabled={bulkUploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                닫기
              </button>
            </div>

            {bulkUploading && (
              <div className="mt-4 text-center text-gray-600">
                처리 중...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
