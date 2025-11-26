'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface Client {
  id: string;
  username: string;
  companyName?: string;
  totalQuota: number;
  remainingQuota: number;
  quota?: any;
  contractStartDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
  notes?: string;
  naverId?: string;
  naverPassword?: string;
  businessType?: string;
  optimization?: boolean;
  reservation?: boolean;
  createdAt: string;
}

// 업종 리스트
const BUSINESS_TYPES = [
  '네일',
  '속눈썹/눈썹/메이크업',
  '왁싱/피부관리/체형관리',
  '미용실',
  '꽃집/공방',
  '맛집/술집',
  '카페/디저트',
  'PT/필라테스',
  '스포츠/운동',
  '자동차',
  '인테리어',
  '핸드폰',
  '반려동물',
  '학원/스터디카페',
  '펜션/숙소/민박/호텔',
  '공간대여/파티룸/스튜디오',
  '기타',
];

export default function ClientsManagement() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [extendingClient, setExtendingClient] = useState<Client | null>(null);
  const [renewingClient, setRenewingClient] = useState<Client | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [renewPlanType, setRenewPlanType] = useState('1');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    companyName: '',
    planType: '1', // '1', '3', '6' 개월
    contractStartDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    notes: '',
    naverId: '',
    naverPassword: '',
    businessType: '',
  });
  
  // 수정 모달 상태
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    companyName: '',
    notes: '',
    naverId: '',
    naverPassword: '',
    businessType: '',
    optimization: false,
    reservation: false,
    quota: {
      follower: { total: 0, remaining: 0 },
      like: { total: 0, remaining: 0 },
      hotpost: { total: 0, remaining: 0 },
      momcafe: { total: 0, remaining: 0 },
      powerblog: { total: 0, remaining: 0 },
      clip: { total: 0, remaining: 0 },
      blog: { total: 0, remaining: 0 },
      receipt: { total: 0, remaining: 0 },
    },
  });

  // 플랜별 quota 설정
  const getQuotaByPlan = (planType: string) => {
    switch (planType) {
      case '1':
        // 1개월: 인기게시물 3개, 맘카페 3개, 블로그 리뷰 10개, 영수증 리뷰 20개 (팔로워/좋아요 없음)
        return {
          follower: { total: 0, remaining: 0 },
          like: { total: 0, remaining: 0 },
          hotpost: { total: 3, remaining: 3 },
          momcafe: { total: 3, remaining: 3 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 10, remaining: 10 },
          receipt: { total: 20, remaining: 20 },
        };
      case '3':
        // 3개월: 인기게시물 3개, 맘카페 3개, 팔로워 1000개, 좋아요 1000개, 블로그 리뷰 30개, 영수증 리뷰 60개
        return {
          follower: { total: 1000, remaining: 1000 },
          like: { total: 1000, remaining: 1000 },
          hotpost: { total: 3, remaining: 3 },
          momcafe: { total: 3, remaining: 3 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 30, remaining: 30 },
          receipt: { total: 60, remaining: 60 },
        };
      case '6':
        // 6개월: 인기게시물 6개, 맘카페 6개, 팔로워 2500개, 좋아요 2500개, 블로그 리뷰 60개, 영수증 리뷰 120개
        return {
          follower: { total: 2500, remaining: 2500 },
          like: { total: 2500, remaining: 2500 },
          hotpost: { total: 6, remaining: 6 },
          momcafe: { total: 6, remaining: 6 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 60, remaining: 60 },
          receipt: { total: 120, remaining: 120 },
        };
      default:
        return {
          follower: { total: 0, remaining: 0 },
          like: { total: 0, remaining: 0 },
          hotpost: { total: 0, remaining: 0 },
          momcafe: { total: 0, remaining: 0 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 0, remaining: 0 },
          receipt: { total: 0, remaining: 0 },
        };
    }
  };

  // 계약 종료일 계산
  const getContractEndDate = (startDate: string, planType: string): string => {
    const start = new Date(startDate);
    const months = parseInt(planType);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return end.toISOString().split('T')[0];
  };
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchClients();
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          companyName: formData.companyName,
          role: 'client',
          quota: getQuotaByPlan(formData.planType),
          contractStartDate: formData.contractStartDate,
          contractEndDate: getContractEndDate(formData.contractStartDate, formData.planType),
          notes: formData.notes || undefined,
          naverId: formData.naverId || undefined,
          naverPassword: formData.naverPassword || undefined,
          businessType: formData.businessType || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create user error:', data);
        setFormError(data.error || '광고주 생성에 실패했습니다.');
        setFormLoading(false);
        return;
      }

      // Reset form and refresh list
      setFormData({ 
        username: '', 
        password: '',
        companyName: '',
        planType: '1',
        contractStartDate: new Date().toISOString().split('T')[0],
        notes: '',
        naverId: '',
        naverPassword: '',
        businessType: '',
      });
      setShowCreateForm(false);
      fetchClients();
    } catch (error: any) {
      console.error('Create user error:', error);
      setFormError(`광고주 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // 계약 만료 필터 상태
  const [contractFilter, setContractFilter] = useState<string>('all'); // 'all', 'expired', '7days', '14days', '30days'
  // 업종 필터 상태
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all'); // 'all' 또는 특정 업종

  const filteredClients = clients.filter((client) => {
    // 검색 필터 (아이디 및 상호명)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesUsername = client.username.toLowerCase().includes(searchLower);
      const matchesCompanyName = client.companyName?.toLowerCase().includes(searchLower) || false;
      if (!matchesUsername && !matchesCompanyName) return false;
    }

    // 업종 필터
    if (businessTypeFilter !== 'all') {
      if (client.businessType !== businessTypeFilter) return false;
    }

    // 계약 만료 필터
    if (contractFilter === 'all') return true;

    const now = new Date();
    const endDate = client.contractEndDate ? new Date(client.contractEndDate) : null;
    
    if (!endDate) {
      // 계약 종료일이 없으면 'expired'가 아닌 경우만 표시
      return contractFilter !== 'expired';
    }

    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (contractFilter) {
      case 'expired':
        return diffDays < 0;
      case '7days':
        return diffDays >= 0 && diffDays <= 7;
      case '14days':
        return diffDays >= 0 && diffDays <= 14;
      case '30days':
        return diffDays >= 0 && diffDays <= 30;
      default:
        return true;
    }
  });

  const handleToggleActive = async (client: Client) => {
    if (!confirm(`${client.username} 계정을 ${client.isActive !== false ? '차단' : '활성화'}하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: client.isActive === false ? true : false,
        }),
      });

      if (response.ok) {
        fetchClients();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`정말로 ${client.username}${client.companyName ? ` (${client.companyName})` : ''} 광고주를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 광고주의 모든 데이터가 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${client.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchClients();
        alert('광고주가 삭제되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '광고주 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert('광고주 삭제 중 오류가 발생했습니다.');
    }
  };

  // 계약 연장 (날짜 직접 선택, quota 유지)
  const handleExtendContract = async () => {
    if (!extendingClient || !extendDate) {
      alert('날짜를 선택해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${extendingClient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractEndDate: extendDate,
          isActive: true, // 연장 시 활성화
        }),
      });

      if (response.ok) {
        fetchClients();
        setExtendingClient(null);
        setExtendDate('');
        alert('계약이 연장되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '계약 연장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to extend contract:', error);
      alert('계약 연장 중 오류가 발생했습니다.');
    }
  };

  // 재계약 (1,3,6개월 선택, quota 추가)
  const handleRenewContract = async () => {
    if (!renewingClient) {
      return;
    }

    const newQuota = getQuotaByPlan(renewPlanType);
    
    // 기존 quota와 합산
    const currentQuota = renewingClient.quota || {};
    const mergedQuota = {
      follower: {
        total: (currentQuota.follower?.total || 0) + (newQuota.follower?.total || 0),
        remaining: (currentQuota.follower?.remaining || 0) + (newQuota.follower?.remaining || 0),
      },
      like: {
        total: (currentQuota.like?.total || 0) + (newQuota.like?.total || 0),
        remaining: (currentQuota.like?.remaining || 0) + (newQuota.like?.remaining || 0),
      },
      hotpost: {
        total: (currentQuota.hotpost?.total || 0) + (newQuota.hotpost?.total || 0),
        remaining: (currentQuota.hotpost?.remaining || 0) + (newQuota.hotpost?.remaining || 0),
      },
      momcafe: {
        total: (currentQuota.momcafe?.total || 0) + (newQuota.momcafe?.total || 0),
        remaining: (currentQuota.momcafe?.remaining || 0) + (newQuota.momcafe?.remaining || 0),
      },
      powerblog: {
        total: (currentQuota.powerblog?.total || 0) + (newQuota.powerblog?.total || 0),
        remaining: (currentQuota.powerblog?.remaining || 0) + (newQuota.powerblog?.remaining || 0),
      },
      clip: {
        total: (currentQuota.clip?.total || 0) + (newQuota.clip?.total || 0),
        remaining: (currentQuota.clip?.remaining || 0) + (newQuota.clip?.remaining || 0),
      },
    };

    // 계약 시작일 = 오늘, 종료일 계산
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = getContractEndDate(startDate, renewPlanType);

    try {
      const response = await fetch(`/api/users/${renewingClient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractStartDate: startDate,
          contractEndDate: endDate,
          quota: mergedQuota,
          isActive: true,
        }),
      });

      if (response.ok) {
        fetchClients();
        setRenewingClient(null);
        setRenewPlanType('1');
        alert('재계약이 완료되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '재계약에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to renew contract:', error);
      alert('재계약 중 오류가 발생했습니다.');
    }
  };

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">광고주 관리</h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              + 광고주 추가
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              새 광고주 추가
            </h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이디
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상호명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    required
                    placeholder="예: 인플루언서컴퍼니"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계약 시작일
                  </label>
                  <input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, contractStartDate: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    업종
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) =>
                      setFormData({ ...formData, businessType: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="">선택 안 함</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이용 기간
                  </label>
                  <select
                    value={formData.planType}
                    onChange={(e) =>
                      setFormData({ ...formData, planType: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="1">1개월 (인기게시물 3개, 맘카페 3개, 블로그 리뷰 10개, 영수증 리뷰 20개)</option>
                    <option value="3">3개월 (인기게시물 3개, 맘카페 3개, 팔로워 1000개, 좋아요 1000개, 블로그 리뷰 30개, 영수증 리뷰 60개)</option>
                    <option value="6">6개월 (인기게시물 6개, 맘카페 6개, 팔로워 2500개, 좋아요 2500개, 블로그 리뷰 60개, 영수증 리뷰 120개)</option>
                  </select>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium mb-1">포함된 작업:</div>
                    {formData.planType === '1' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>인기게시물: 3개</li>
                        <li>맘카페: 3개</li>
                        <li>블로그 리뷰: 10개</li>
                        <li>영수증 리뷰: 20개</li>
                        <li className="text-gray-400">인스타 팔로워/좋아요: 이용 불가</li>
                      </ul>
                    )}
                    {formData.planType === '3' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>인기게시물: 3개</li>
                        <li>맘카페: 3개</li>
                        <li>인스타 팔로워: 1000개</li>
                        <li>인스타 좋아요: 1000개</li>
                        <li>블로그 리뷰: 30개</li>
                        <li>영수증 리뷰: 60개</li>
                      </ul>
                    )}
                    {formData.planType === '6' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>인기게시물: 6개</li>
                        <li>맘카페: 6개</li>
                        <li>인스타 팔로워: 2500개</li>
                        <li>인스타 좋아요: 2500개</li>
                        <li>블로그 리뷰: 60개</li>
                        <li>영수증 리뷰: 120개</li>
                      </ul>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        계약 종료일: {getContractEndDate(formData.contractStartDate, formData.planType)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 비고, 네이버 아이디/비밀번호 추가 필드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비고 (특이사항)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="특이사항을 입력하세요..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      네이버 아이디
                    </label>
                    <input
                      type="text"
                      value={formData.naverId}
                      onChange={(e) =>
                        setFormData({ ...formData, naverId: e.target.value })
                      }
                      placeholder="네이버 아이디"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      네이버 비밀번호
                    </label>
                    <input
                      type="text"
                      value={formData.naverPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, naverPassword: e.target.value })
                      }
                      placeholder="네이버 비밀번호"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ 
                      username: '', 
                      password: '', 
                      companyName: '',
                      planType: '1',
                      contractStartDate: new Date().toISOString().split('T')[0],
                      notes: '',
                      naverId: '',
                      naverPassword: '',
                      businessType: '',
                    });
                    setFormError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {formLoading ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고주 검색
              </label>
              <input
                type="text"
                placeholder="아이디 또는 상호명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업종 필터
              </label>
              <select
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="all">전체 업종</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 만료 필터
              </label>
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="all">전체</option>
                <option value="expired">계약 만료됨</option>
                <option value="7days">만료 7일 이내</option>
                <option value="14days">만료 14일 이내</option>
                <option value="30days">만료 30일 이내</option>
              </select>
            </div>
          </div>
          {(contractFilter !== 'all' || businessTypeFilter !== 'all' || searchTerm) && (
            <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
              필터링된 결과: <span className="font-semibold">{filteredClients.length}개</span>
            </div>
          )}
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 광고주가 없습니다.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      아이디
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상호명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      업종
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      네이버 아이디
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      네이버 비밀번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업별 남은 개수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      계약 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최적화 / 예약
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.businessType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.naverId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                        {client.naverPassword || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {client.quota ? (
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="text-blue-600">인기게시물:</span>{' '}
                              <span className="font-medium">{client.quota.hotpost?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-purple-600">맘카페:</span>{' '}
                              <span className="font-medium">{client.quota.momcafe?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-green-600">팔로워:</span>{' '}
                              <span className="font-medium">{client.quota.follower?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-orange-600">좋아요:</span>{' '}
                              <span className="font-medium">{client.quota.like?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-indigo-600">파워블로그:</span>{' '}
                              <span className="font-medium">{client.quota.powerblog?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-teal-600">클립:</span>{' '}
                              <span className="font-medium">{client.quota.clip?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-pink-600">블로그 리뷰:</span>{' '}
                              <span className="font-medium">{client.quota.blog?.remaining || 0}개</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-red-600">영수증 리뷰:</span>{' '}
                              <span className="font-medium">{client.quota.receipt?.remaining || 0}개</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            {client.remainingQuota || 0}건
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const now = new Date();
                          const endDate = client.contractEndDate 
                            ? new Date(client.contractEndDate) 
                            : null;
                          const isExpired = endDate && endDate < now;
                          const isActive = client.isActive !== false && !isExpired;
                          
                          if (isExpired) {
                            return (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                만료됨
                              </span>
                            );
                          }
                          if (!client.isActive) {
                            return (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                차단됨
                              </span>
                            );
                          }
                          if (endDate) {
                            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  활성
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {daysLeft > 0 ? `${daysLeft}일 남음` : '만료 임박'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {endDate.toLocaleDateString('ko-KR')}
                                </div>
                              </div>
                            );
                          }
                          return <span className="text-gray-500 text-xs">-</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">최적화:</span>
                            <span className={`text-xs font-medium ${client.optimization ? 'text-green-600' : 'text-gray-400'}`}>
                              {client.optimization ? '완료' : '대기'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">예약:</span>
                            <span className={`text-xs font-medium ${client.reservation ? 'text-green-600' : 'text-gray-400'}`}>
                              {client.reservation ? '완료' : '대기'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              // 기존 quota가 있으면 powerblog와 clip이 없을 수 있으므로 보완
                              const existingQuota = client.quota || {};
                              setEditForm({
                                username: client.username,
                                companyName: client.companyName || '',
                                notes: client.notes || '',
                                naverId: client.naverId || '',
                                naverPassword: client.naverPassword || '',
                                businessType: client.businessType || '',
                                optimization: client.optimization || false,
                                reservation: client.reservation || false,
                                quota: {
                                  follower: existingQuota.follower || { total: 0, remaining: 0 },
                                  like: existingQuota.like || { total: 0, remaining: 0 },
                                  hotpost: existingQuota.hotpost || { total: 0, remaining: 0 },
                                  momcafe: existingQuota.momcafe || { total: 0, remaining: 0 },
                                  powerblog: existingQuota.powerblog || { total: 0, remaining: 0 },
                                  clip: existingQuota.clip || { total: 0, remaining: 0 },
                                  blog: existingQuota.blog || { total: 0, remaining: 0 },
                                  receipt: existingQuota.receipt || { total: 0, remaining: 0 },
                                },
                              });
                            }}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 bg-green-50"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleToggleActive(client)}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                          >
                            {client.isActive !== false ? '차단' : '활성화'}
                          </button>
                          <button
                            onClick={() => {
                              setExtendingClient(client);
                              setExtendDate(client.contractEndDate || '');
                            }}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                          >
                            연장
                          </button>
                          <button
                            onClick={() => {
                              setRenewingClient(client);
                              setRenewPlanType('1');
                            }}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 bg-blue-50"
                          >
                            재계약
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client)}
                            className="text-xs px-2 py-1 rounded border hover:bg-red-50 bg-red-50 text-red-700"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 연장 모달 */}
        {extendingClient && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setExtendingClient(null);
              setExtendDate('');
            }}
          >
            <div
              className="bg-white rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                계약 연장
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    광고주
                  </label>
                  <div className="text-gray-900 font-medium">{extendingClient.username}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    현재 계약 종료일
                  </label>
                  <div className="text-gray-600">
                    {extendingClient.contractEndDate
                      ? new Date(extendingClient.contractEndDate || '').toLocaleDateString('ko-KR')
                      : '미설정'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    새로운 계약 종료일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={extendDate}
                    onChange={(e) => setExtendDate(e.target.value)}
                    min={(() => {
                      const currentEnd = extendingClient.contractEndDate 
                        ? new Date(extendingClient.contractEndDate) 
                        : new Date();
                      const today = new Date();
                      return currentEnd > today 
                        ? currentEnd.toISOString().split('T')[0]
                        : today.toISOString().split('T')[0];
                    })()}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ 계약 기간만 연장되며, 작업 개수는 추가되지 않습니다.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setExtendingClient(null);
                      setExtendDate('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleExtendContract}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    연장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 재계약 모달 */}
        {renewingClient && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setRenewingClient(null);
              setRenewPlanType('1');
            }}
          >
            <div
              className="bg-white rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                재계약
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    광고주
                  </label>
                  <div className="text-gray-900 font-medium">{renewingClient.username}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계약 기간 선택 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={renewPlanType}
                    onChange={(e) => setRenewPlanType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="1">1개월</option>
                    <option value="3">3개월</option>
                    <option value="6">6개월</option>
                  </select>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">추가될 작업:</div>
                  {renewPlanType === '1' && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 인기게시물: 3개</li>
                      <li>• 맘카페: 3개</li>
                      <li className="text-gray-400">• 인스타 팔로워/좋아요: 없음</li>
                    </ul>
                  )}
                  {renewPlanType === '3' && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 인기게시물: 3개</li>
                      <li>• 맘카페: 3개</li>
                      <li>• 인스타 팔로워: 1000개</li>
                      <li>• 인스타 좋아요: 1000개</li>
                    </ul>
                  )}
                  {renewPlanType === '6' && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 인기게시물: 6개</li>
                      <li>• 맘카페: 6개</li>
                      <li>• 인스타 팔로워: 2500개</li>
                      <li>• 인스타 좋아요: 2500개</li>
                    </ul>
                  )}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-xs text-blue-700">
                      💡 기존 작업 개수에 추가됩니다.
                    </div>
                    <div className="text-xs text-blue-700">
                      계약 시작일: {new Date().toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-xs text-blue-700">
                      계약 종료일: {new Date(getContractEndDate(new Date().toISOString().split('T')[0], renewPlanType)).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setRenewingClient(null);
                      setRenewPlanType('1');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleRenewContract}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    재계약 완료
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editingClient && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setEditingClient(null);
              setEditForm({
                username: '',
                companyName: '',
                notes: '',
                naverId: '',
                naverPassword: '',
                businessType: '',
                quota: {
                  follower: { total: 0, remaining: 0 },
                  like: { total: 0, remaining: 0 },
                  hotpost: { total: 0, remaining: 0 },
                  momcafe: { total: 0, remaining: 0 },
                  powerblog: { total: 0, remaining: 0 },
                  clip: { total: 0, remaining: 0 },
                  blog: { total: 0, remaining: 0 },
                  receipt: { total: 0, remaining: 0 },
                },
              });
            }}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                광고주 정보 수정
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이디 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상호명
                  </label>
                  <input
                    type="text"
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    placeholder="예: 인플루언서컴퍼니"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업별 개수
                  </label>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">인스타 팔로워 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.follower.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.follower = {
                                ...newQuota.follower,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.follower.total}
                            value={editForm.quota.follower.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.follower = {
                                ...newQuota.follower,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">인스타 좋아요 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.like.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.like = {
                                ...newQuota.like,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.like.total}
                            value={editForm.quota.like.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.like = {
                                ...newQuota.like,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">인기게시물 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.hotpost.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.hotpost = {
                                ...newQuota.hotpost,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.hotpost.total}
                            value={editForm.quota.hotpost.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.hotpost = {
                                ...newQuota.hotpost,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">맘카페 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.momcafe.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.momcafe = {
                                ...newQuota.momcafe,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.momcafe.total}
                            value={editForm.quota.momcafe.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.momcafe = {
                                ...newQuota.momcafe,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">파워블로그 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.powerblog.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.powerblog = {
                                ...newQuota.powerblog,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.powerblog.total}
                            value={editForm.quota.powerblog.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.powerblog = {
                                ...newQuota.powerblog,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">클립 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.clip.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.clip = {
                                ...newQuota.clip,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.clip.total}
                            value={editForm.quota.clip.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.clip = {
                                ...newQuota.clip,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">블로그 리뷰 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.blog.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.blog = {
                                ...newQuota.blog,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.blog.total}
                            value={editForm.quota.blog.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.blog = {
                                ...newQuota.blog,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">영수증 리뷰 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.receipt.total}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.receipt = {
                                ...newQuota.receipt,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.receipt.total}
                            value={editForm.quota.receipt.remaining}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.receipt = {
                                ...newQuota.receipt,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 추가 정보 필드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      업종
                    </label>
                    <select
                      value={editForm.businessType}
                      onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="">선택 안 함</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      네이버 아이디
                    </label>
                    <input
                      type="text"
                      value={editForm.naverId}
                      onChange={(e) => setEditForm({ ...editForm, naverId: e.target.value })}
                      placeholder="네이버 아이디"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      네이버 비밀번호
                    </label>
                    <input
                      type="text"
                      value={editForm.naverPassword}
                      onChange={(e) => setEditForm({ ...editForm, naverPassword: e.target.value })}
                      placeholder="네이버 비밀번호 (변경 시에만 입력)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비고 (특이사항)
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      placeholder="특이사항을 입력하세요..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  {/* 최적화/예약 체크박스 */}
                  <div className="md:col-span-2 pt-2 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      상태 관리
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.optimization}
                          onChange={(e) => setEditForm({ ...editForm, optimization: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">최적화</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.reservation}
                          onChange={(e) => setEditForm({ ...editForm, reservation: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">예약</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setEditingClient(null);
                      setEditForm({
                        username: '',
                        companyName: '',
                        notes: '',
                        naverId: '',
                        naverPassword: '',
                        businessType: '',
                        optimization: false,
                        reservation: false,
                        quota: {
                          follower: { total: 0, remaining: 0 },
                          like: { total: 0, remaining: 0 },
                          hotpost: { total: 0, remaining: 0 },
                          momcafe: { total: 0, remaining: 0 },
                          powerblog: { total: 0, remaining: 0 },
                          clip: { total: 0, remaining: 0 },
                          blog: { total: 0, remaining: 0 },
                          receipt: { total: 0, remaining: 0 },
                        },
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/users/${editingClient.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            username: editForm.username,
                            companyName: editForm.companyName,
                            quota: editForm.quota,
                            notes: editForm.notes || null,
                            naverId: editForm.naverId || null,
                            naverPassword: editForm.naverPassword || null,
                            businessType: editForm.businessType || null,
                            optimization: editForm.optimization,
                            reservation: editForm.reservation,
                          }),
                        });

                        if (response.ok) {
                          fetchClients();
                          setEditingClient(null);
                          alert('수정이 완료되었습니다.');
                        } else {
                          const data = await response.json();
                          alert(data.error || '수정에 실패했습니다.');
                        }
                      } catch (error) {
                        console.error('Failed to update client:', error);
                        alert('수정 중 오류가 발생했습니다.');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

