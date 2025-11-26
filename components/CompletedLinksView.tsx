'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Order {
  id: string;
  taskType: string;
  caption: string | null;
  completedLink: string | null;
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
};

export default function CompletedLinksView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  
  // 블로그/영수증 리뷰 링크 추가 모달 상태
  const [showBlogReceiptModal, setShowBlogReceiptModal] = useState(false);
  const [selectedClientForLink, setSelectedClientForLink] = useState<any>(null);
  const [blogLink, setBlogLink] = useState('');
  const [receiptLink, setReceiptLink] = useState('');
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
      const params = new URLSearchParams();
      params.append('status', 'done');
      if (selectedClientId) {
        params.append('clientId', selectedClientId);
      }

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // 완료 링크가 있는 주문만 필터링 (블로그/영수증 리뷰 포함)
        const completedWithLinks = (data.orders || []).filter(
          (order: Order) => order.completedLink && order.completedLink.trim()
        );
        setOrders(completedWithLinks);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // 블로그/영수증 리뷰 링크 추가
  const handleAddBlogReceiptLink = async () => {
    if (!selectedClientForLink) return;
    
    if (!blogLink.trim() && !receiptLink.trim()) {
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
          blogLink: blogLink.trim() || null,
          receiptLink: receiptLink.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || '링크 추가에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      alert('링크가 성공적으로 추가되었습니다.');
      setShowBlogReceiptModal(false);
      setSelectedClientForLink(null);
      setBlogLink('');
      setReceiptLink('');
      fetchCompletedOrders();
    } catch (error) {
      console.error('Failed to add blog/receipt link:', error);
      alert('링크 추가 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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

  // 광고주별로 그룹화
  const groupedByClient = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const clientId = order.client.id;
      if (!acc[clientId]) {
        acc[clientId] = {
          client: order.client,
          orders: [],
        };
      }
      acc[clientId].orders.push(order);
      return acc;
    }, {} as Record<string, { client: Order['client']; orders: Order[] }>);
  }, [filteredOrders]);

  const groupedOrders = Object.values(groupedByClient);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">완료된 링크 모아보기</h1>
            <button
              onClick={() => {
                setShowBlogReceiptModal(true);
                setSelectedClientForLink(null);
                setBlogLink('');
                setReceiptLink('');
                setClientSearchTerm('');
                setShowClientDropdown(false);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              블로그/영수증 리뷰 링크 추가
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                        완료된 작업: {group.orders.length}개
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClientForLink(group.client);
                        setBlogLink('');
                        setReceiptLink('');
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

                <div className="space-y-4">
                  {group.orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                            {TASK_TYPE_NAMES[order.taskType] || order.taskType}
                          </span>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
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

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          완료 링크
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                블로그 리뷰 링크
              </label>
              <input
                type="url"
                value={blogLink}
                onChange={(e) => setBlogLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                링크 입력 시 블로그 리뷰 quota가 1개 차감됩니다.
              </p>
            </div>

            {/* 영수증 리뷰 링크 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                영수증 리뷰 링크
              </label>
              <input
                type="url"
                value={receiptLink}
                onChange={(e) => setReceiptLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                링크 입력 시 영수증 리뷰 quota가 1개 차감됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBlogReceiptModal(false);
                  setSelectedClientForLink(null);
                  setBlogLink('');
                  setReceiptLink('');
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
                disabled={submitting || !selectedClientForLink || (!blogLink.trim() && !receiptLink.trim())}
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
