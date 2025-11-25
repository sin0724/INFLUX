'use client';

import { useState, useEffect } from 'react';
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
};

export default function CompletedLinksView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);

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
        // 완료 링크가 있는 주문만 필터링
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

  // 광고주별로 그룹화
  const groupedByClient = orders.reduce((acc, order) => {
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

  const groupedOrders = Object.values(groupedByClient);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">완료된 링크 모아보기</h1>
          
          {/* 광고주 필터 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              광고주 필터
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
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

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : groupedOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">완료된 링크가 없습니다.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedOrders.map((group) => (
              <div
                key={group.client.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="mb-4 pb-4 border-b border-gray-200">
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
    </div>
  );
}

