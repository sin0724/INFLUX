'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  completedLink: string | null;
  completedLink2?: string | null; // 내돈내산 리뷰용 두 번째 링크
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
  daangn: '당근마켓',
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

  const groupedOrders = Object.values(groupedByClientAndTaskType);

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
            {/* 검색 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                onChange={(e) => setSelectedClientId(e.target.value)}
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
          
          {/* 검색 결과 개수 표시 */}
          {searchQuery && (
            <div className="text-sm text-gray-600 mb-4">
              검색 결과: {filteredOrders.length}개
            </div>
          )}
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
          <div className="space-y-6">
            {groupedOrders.map((group) => (
              <div
                key={group.client.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {group.client.username}
                        {group.client.companyName && (
                          <span className="text-gray-600 ml-2">
                            ({group.client.companyName})
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        완료된 작업: {Object.values(group.taskTypes).reduce((sum, orders) => sum + orders.length, 0)}개
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClientForLink(group.client);
                        setBlogLinks(['']);
                        setReceiptLinks(['']);
                        setClientSearchTerm('');
                        setShowClientDropdown(false);
                        setShowBlogReceiptModal(true);
                      }}
                      className="text-sm px-3 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition"
                    >
                      블로그/영수증 링크 추가
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(group.taskTypes).map(([taskType, orders]) => (
                    <div key={taskType} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                          {TASK_TYPE_NAMES[taskType] || taskType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {orders.length}개
                        </span>
                      </div>
                      <div className="space-y-3 pl-4">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-xs text-gray-500">
                                {formatDateTime(order.createdAt)}
                              </p>
                            </div>

                            {order.caption && (
                              <div className="text-sm text-gray-700 mb-3">
                                {order.caption.split('\n').slice(0, 2).map((line, idx) => (
                                  <p key={idx} className={idx === 0 ? 'font-medium' : ''}>
                                    {line}
                                  </p>
                                ))}
                              </div>
                            )}

                            <div className="space-y-2">
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  {order.taskType === 'myexpense' ? '완료 링크 1' : '완료 링크'}
                                </div>
                                <a
                                  href={order.completedLink!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition break-all"
                                >
                                  <span className="truncate max-w-2xl">{order.completedLink}</span>
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                              {order.taskType === 'myexpense' && order.completedLink2 && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">
                                    완료 링크 2
                                  </div>
                                  <a
                                    href={order.completedLink2}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition break-all"
                                  >
                                    <span className="truncate max-w-2xl">{order.completedLink2}</span>
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
    </div>
  );
}
