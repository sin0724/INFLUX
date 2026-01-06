'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface AdminLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  target_type: string;
  targetId: string | null;
  details: any;
  ip_address: string;
  user_agent: string;
  createdAt: string;
}

const ACTION_NAMES: Record<string, string> = {
  create_user: '사용자 생성',
  create_admin: '관리자 생성',
  update_user: '사용자 수정',
  delete_user: '사용자 삭제',
  block_user: '사용자 차단',
  activate_user: '사용자 활성화',
  extend_contract: '계약 연장',
  renew_contract: '계약 재계약',
  update_order_status: '발주 상태 변경',
  delete_order: '발주 삭제',
  edit_order: '발주 수정',
  add_completed_link: '작업 완료 링크 추가',
  add_blog_receipt_link: '블로그/영수증 링크 추가',
  add_myexpense_link: '내돈내산 링크 추가',
  add_experience_link: '체험단 링크 추가',
  login: '로그인',
  logout: '로그아웃',
};

// 중요한 액션만 필터링 (기본값)
const IMPORTANT_ACTIONS = [
  'create_user',
  'update_user',
  'delete_user',
  'block_user',
  'activate_user',
  'extend_contract',
  'update_order_status',
  'delete_order',
  'edit_order',
  'add_completed_link',
  'add_blog_receipt_link',
  'add_myexpense_link',
  'add_experience_link',
];

// 액션 타입별 색상
const getActionColor = (action: string) => {
  if (action.includes('create') || action.includes('add')) {
    return 'bg-green-100 text-green-700';
  }
  if (action.includes('update') || action.includes('edit') || action.includes('extend')) {
    return 'bg-blue-100 text-blue-700';
  }
  if (action.includes('delete') || action.includes('block')) {
    return 'bg-red-100 text-red-700';
  }
  if (action.includes('activate')) {
    return 'bg-purple-100 text-purple-700';
  }
  return 'bg-gray-100 text-gray-700';
};

export default function AdminActivityLogs() {
  const router = useRouter();
  const [allLogs, setAllLogs] = useState<AdminLog[]>([]); // 원본 로그 데이터
  const [logs, setLogs] = useState<AdminLog[]>([]); // 필터링된 로그 데이터
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    adminId: '',
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });
  const [showImportantOnly, setShowImportantOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // API 호출은 다른 필터 변경 시에만
  useEffect(() => {
    fetchLogs();
  }, [page, filters, showImportantOnly]);

  // 검색어 변경 시에는 클라이언트 사이드에서만 필터링
  useEffect(() => {
    applyFilters();
  }, [searchTerm, allLogs, showImportantOnly, filters.action]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '100'); // 더 많은 로그를 가져와서 필터링
      if (filters.adminId) params.append('adminId', filters.adminId);
      if (filters.action) params.append('action', filters.action);
      if (filters.targetType) params.append('targetType', filters.targetType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedLogs = data.logs || [];
        
        // 원본 로그 데이터 저장
        setAllLogs(fetchedLogs);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터 적용 함수 (클라이언트 사이드 필터링)
  const applyFilters = () => {
    let filteredLogs = [...allLogs];
    
    // 중요한 액션만 필터링
    if (showImportantOnly && !filters.action) {
      filteredLogs = filteredLogs.filter((log: AdminLog) => 
        IMPORTANT_ACTIONS.includes(log.action)
      );
    }
    
    // 상호명 검색 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredLogs = filteredLogs.filter((log: AdminLog) => {
        const companyName = log.details?.companyName?.toLowerCase() || '';
        const username = log.details?.username?.toLowerCase() || '';
        return companyName.includes(searchLower) || username.includes(searchLower);
      });
    }
    
    setLogs(filteredLogs);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로가기</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">관리자 활동 로그</h1>
          </div>

          {/* 중요 필터 토글 */}
          <div className="mb-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showImportantOnly}
                onChange={(e) => {
                  setShowImportantOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                중요한 항목만 보기
              </span>
            </label>
            <span className="text-xs text-gray-500">
              (사용자 관리, 발주 관리, 링크 추가 등)
            </span>
          </div>

          {/* 필터 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
            {/* 상호명 검색 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상호명/사용자명 검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="상호명 또는 사용자명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  액션
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">전체</option>
                  {Object.entries(ACTION_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 타입
                </label>
                <select
                  value={filters.targetType}
                  onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">전체</option>
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                  <option value="client">광고주</option>
                  <option value="order">발주</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilters({
                    adminId: '',
                    action: '',
                    targetType: '',
                    startDate: '',
                    endDate: '',
                  });
                  setSearchTerm('');
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                필터 초기화
              </button>
            </div>
          </div>

          {/* 로그 테이블 */}
          {loading ? (
            <div className="text-center py-12 text-gray-600">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm.trim() ? '검색 결과가 없습니다.' : '로그가 없습니다.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        시간
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        관리자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        액션
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        대상
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상세
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {log.adminUsername}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {ACTION_NAMES[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{log.target_type}</span>
                            {log.targetId && (
                              <span className="text-xs text-gray-500 font-mono">
                                ID: {log.targetId.substring(0, 8)}...
                              </span>
                            )}
                            {log.details?.username && (
                              <span className="text-xs text-gray-600">
                                사용자: {log.details.username}
                              </span>
                            )}
                            {log.details?.companyName && (
                              <span className="text-xs text-gray-600">
                                상호명: {log.details.companyName}
                              </span>
                            )}
                            {log.details?.status && (
                              <span className="text-xs text-gray-600">
                                상태: {log.details.status}
                              </span>
                            )}
                            {log.details?.completedLink && (
                              <a 
                                href={log.details.completedLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 underline truncate max-w-xs block"
                              >
                                링크: {log.details.completedLink.substring(0, 50)}...
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.details && Object.keys(log.details).length > 0 && (
                            <details className="cursor-pointer">
                              <summary className="text-primary-600 hover:text-primary-700 text-xs">
                                전체 상세보기
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

