'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, parseDate, formatDateSafe } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  placeLink?: string;
  businessType?: string;
  optimization?: boolean;
  reservation?: boolean;
  reviewing?: boolean;
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
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [extendingClient, setExtendingClient] = useState<Client | null>(null);
  const [renewingClient, setRenewingClient] = useState<Client | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [renewPlanType, setRenewPlanType] = useState('1');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 일괄 수정/삭제 관련 state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    businessType: '',
    optimization: null as boolean | null,
    reservation: null as boolean | null,
    reviewing: null as boolean | null,
    isActive: null as boolean | null,
  });
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    companyName: '',
    planType: '1', // '1', '3', '6' 개월
    contractStartDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    notes: '',
    naverId: '',
    naverPassword: '',
    placeLink: '',
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
      daangn: { total: 0, remaining: 0 },
      experience: { total: 0, remaining: 0 },
      myexpense: { total: 0, remaining: 0 },
    },
  });
  
  // 수정 모달 상태
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    companyName: '',
    notes: '',
    naverId: '',
    naverPassword: '',
    placeLink: '',
    businessType: '',
    optimization: false,
    reservation: false,
    reviewing: false,
    quota: {
      follower: { total: 0, remaining: 0 },
      like: { total: 0, remaining: 0 },
      hotpost: { total: 0, remaining: 0 },
      momcafe: { total: 0, remaining: 0 },
      powerblog: { total: 0, remaining: 0 },
      clip: { total: 0, remaining: 0 },
      blog: { total: 0, remaining: 0 },
      receipt: { total: 0, remaining: 0 },
      daangn: { total: 0, remaining: 0 },
      experience: { total: 0, remaining: 0 },
      myexpense: { total: 0, remaining: 0 },
    },
  });

  // 플랜별 quota 설정
  const getQuotaByPlan = (planType: string) => {
    switch (planType) {
      case '1':
        // 1개월: 블로그 10개, 영수증 10개, 인기게시물 1개, 맘카페 1개
        return {
          follower: { total: 0, remaining: 0 },
          like: { total: 0, remaining: 0 },
          hotpost: { total: 1, remaining: 1 },
          momcafe: { total: 1, remaining: 1 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 10, remaining: 10 },
          receipt: { total: 10, remaining: 10 },
          daangn: { total: 0, remaining: 0 },
          experience: { total: 0, remaining: 0 },
          myexpense: { total: 0, remaining: 0 },
        };
      case '3':
        // 3개월: 블로그 리뷰 30개, 영수증 리뷰 60개, 인기게시물 3개, 맘카페 3개, 당근마켓 3개, 인스타팔로워/좋아요 통합 1000개, 체험단 1회
        return {
          follower: { total: 500, remaining: 500 }, // 통합 1000개 중 500개 (팔로워/좋아요 자유 선택 가능)
          like: { total: 500, remaining: 500 }, // 통합 1000개 중 500개 (팔로워/좋아요 자유 선택 가능)
          hotpost: { total: 3, remaining: 3 },
          momcafe: { total: 3, remaining: 3 },
          powerblog: { total: 0, remaining: 0 },
          clip: { total: 0, remaining: 0 },
          blog: { total: 30, remaining: 30 },
          receipt: { total: 60, remaining: 60 },
          daangn: { total: 3, remaining: 3 },
          experience: { total: 1, remaining: 1 },
          myexpense: { total: 0, remaining: 0 },
        };
      case '6':
        // 6개월: 블로그 리뷰 60개, 영수증 리뷰 120개, 인기게시물 6개, 맘카페 6개, 당근마켓 6개, 인스타팔로워/좋아요 통합 2000개, 파워블로그 2회, 체험단 2회
        return {
          follower: { total: 1000, remaining: 1000 }, // 통합 2000개 중 1000개 (팔로워/좋아요 자유 선택 가능)
          like: { total: 1000, remaining: 1000 }, // 통합 2000개 중 1000개 (팔로워/좋아요 자유 선택 가능)
          hotpost: { total: 6, remaining: 6 },
          momcafe: { total: 6, remaining: 6 },
          powerblog: { total: 2, remaining: 2 }, // 6개월 플랜만 파워블로그 2회
          clip: { total: 0, remaining: 0 },
          blog: { total: 60, remaining: 60 }, // 블로그 리뷰 60개
          receipt: { total: 120, remaining: 120 },
          daangn: { total: 6, remaining: 6 },
          experience: { total: 2, remaining: 2 },
          myexpense: { total: 0, remaining: 0 },
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
          daangn: { total: 0, remaining: 0 },
          experience: { total: 0, remaining: 0 },
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

  // 엑셀 템플릿 다운로드
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        '아이디*': 'client01',
        '비밀번호*': 'password123',
        '상호명': '예시 회사',
        '이용기간(개월)*': '1',
        '계약시작일': '2024-01-01',
        '계약종료일': '',
        '활성화여부(예/아니오)': '예',
        '비고': '특이사항',
        '네이버 아이디': 'naver_id',
        '네이버 비밀번호': 'naver_pw',
        '업종': '네일',
        '최적화(예/아니오)': '아니오',
        '예약(예/아니오)': '아니오',
        '검수중(예/아니오)': '아니오',
        '인스타팔로워(개)': '',
        '인스타좋아요(개)': '',
        '인기게시물(개)': '',
        '맘카페(개)': '',
        '파워블로그(개)': '',
        '클립(개)': '',
        '블로그리뷰(개)': '',
        '영수증리뷰(개)': '',
        '당근마켓(개)': '',
        '체험단(개)': '',
        '내지출(개)': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '광고주 목록');

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 15 }, // 아이디
      { wch: 15 }, // 비밀번호
      { wch: 20 }, // 상호명
      { wch: 12 }, // 이용기간
      { wch: 12 }, // 계약시작일
      { wch: 12 }, // 계약종료일
      { wch: 15 }, // 활성화여부
      { wch: 20 }, // 비고
      { wch: 15 }, // 네이버 아이디
      { wch: 15 }, // 네이버 비밀번호
      { wch: 15 }, // 업종
      { wch: 15 }, // 최적화
      { wch: 15 }, // 예약
      { wch: 15 }, // 검수중
      { wch: 15 }, // 인스타팔로워
      { wch: 15 }, // 인스타좋아요
      { wch: 15 }, // 인기게시물
      { wch: 15 }, // 맘카페
      { wch: 15 }, // 파워블로그
      { wch: 15 }, // 클립
      { wch: 15 }, // 블로그리뷰
      { wch: 15 }, // 영수증리뷰
      { wch: 15 }, // 당근마켓
      { wch: 15 }, // 체험단
      { wch: 15 }, // 내지출
    ];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, '광고주_일괄등록_템플릿.xlsx');
  };

  // 엑셀 파일 파싱 및 업로드
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

      // 엑셀 날짜를 YYYY-MM-DD 형식으로 변환하는 함수 (타임존 문제 해결)
      const excelDateToDateString = (excelDate: any): string => {
        if (!excelDate) {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        
        // 이미 문자열이고 YYYY-MM-DD 형식인 경우
        if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
          return excelDate;
        }
        
        // 숫자인 경우 (엑셀 시리얼 날짜)
        if (typeof excelDate === 'number') {
          // 엑셀 날짜는 1900-01-01부터의 일수 (단, 1900년을 윤년으로 잘못 계산해서 1일 더해짐)
          // 타임존 문제를 피하기 위해 로컬 날짜로 직접 계산
          const excelEpoch = new Date(1900, 0, 1);
          const days = excelDate - 2; // 엑셀의 1900년 윤년 버그 보정
          const date = new Date(excelEpoch);
          date.setDate(date.getDate() + days);
          
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
        
        // 문자열인 경우 - 타임존 문제를 피하기 위해 직접 파싱
        if (typeof excelDate === 'string') {
          // YYYY-MM-DD 형식인지 확인
          const dateMatch = excelDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
          
          // 다른 형식의 날짜 문자열인 경우 로컬 타임존으로 파싱
          const parsed = new Date(excelDate);
          if (!isNaN(parsed.getTime())) {
            // 로컬 타임존의 날짜를 사용 (시간은 무시)
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
        
        // 기본값: 오늘 날짜
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // 필드명 매핑 및 데이터 정규화
      const clients = jsonData.map((row: any) => {
        // 날짜 처리
        const contractStartDate = excelDateToDateString(row['계약시작일']);
        const contractEndDate = row['계약종료일'] ? excelDateToDateString(row['계약종료일']) : null;

        // 이용기간 처리 (숫자 또는 문자열)
        let planType = row['이용기간(개월)*'] || row['이용기간(개월)'] || row['이용기간'] || '1';
        planType = String(planType);

        // 최적화/예약/검수중/활성화 처리 (예/아니오, Y/N, true/false, 1/0 등 다양한 형식 지원)
        const parseBoolean = (value: any): boolean => {
          if (value === null || value === undefined || value === '') return false;
          const str = String(value).toLowerCase().trim();
          return str === '예' || str === 'yes' || str === 'y' || str === 'true' || str === '1' || str === '완료';
        };

        const optimization = parseBoolean(row['최적화(예/아니오)'] || row['최적화'] || row['최적화 완료']);
        const reservation = parseBoolean(row['예약(예/아니오)'] || row['예약'] || row['예약 완료']);
        const reviewing = parseBoolean(row['검수중(예/아니오)'] || row['검수중'] || row['검수']);
        const isActive = parseBoolean(row['활성화여부(예/아니오)'] || row['활성화여부'] || row['활성화'] || '예');

        // Quota 필드 처리 (숫자로 변환, 빈 값은 null)
        const parseNumber = (value: any): number | null => {
          if (value === null || value === undefined || value === '') return null;
          const num = Number(value);
          return isNaN(num) ? null : num;
        };

        const follower = parseNumber(row['인스타팔로워(개)'] || row['인스타팔로워'] || row['팔로워']);
        const like = parseNumber(row['인스타좋아요(개)'] || row['인스타좋아요'] || row['좋아요']);
        const hotpost = parseNumber(row['인기게시물(개)'] || row['인기게시물']);
        const momcafe = parseNumber(row['맘카페(개)'] || row['맘카페']);
        const powerblog = parseNumber(row['파워블로그(개)'] || row['파워블로그']);
        const clip = parseNumber(row['클립(개)'] || row['클립']);
        const blog = parseNumber(row['블로그리뷰(개)'] || row['블로그리뷰'] || row['블로그']);
        const receipt = parseNumber(row['영수증리뷰(개)'] || row['영수증리뷰'] || row['영수증']);
        const daangn = parseNumber(row['당근마켓(개)'] || row['당근마켓'] || row['당근']);
        const experience = parseNumber(row['체험단(개)'] || row['체험단']);
        const myexpense = parseNumber(row['내지출(개)'] || row['내지출']);

        // Quota 객체 생성 (값이 있는 것만 포함)
        const quota: any = {};
        if (follower !== null) quota.follower = { total: follower, remaining: follower };
        if (like !== null) quota.like = { total: like, remaining: like };
        if (hotpost !== null) quota.hotpost = { total: hotpost, remaining: hotpost };
        if (momcafe !== null) quota.momcafe = { total: momcafe, remaining: momcafe };
        if (powerblog !== null) quota.powerblog = { total: powerblog, remaining: powerblog };
        if (clip !== null) quota.clip = { total: clip, remaining: clip };
        if (blog !== null) quota.blog = { total: blog, remaining: blog };
        if (receipt !== null) quota.receipt = { total: receipt, remaining: receipt };
        if (daangn !== null) quota.daangn = { total: daangn, remaining: daangn };
        if (experience !== null) quota.experience = { total: experience, remaining: experience };
        if (myexpense !== null) quota.myexpense = { total: myexpense, remaining: myexpense };

        return {
          username: String(row['아이디*'] || row['아이디'] || '').trim(),
          password: String(row['비밀번호*'] || row['비밀번호'] || '').trim(),
          companyName: String(row['상호명'] || '').trim(),
          planType: planType,
          contractStartDate: contractStartDate,
          contractEndDate: contractEndDate,
          isActive: isActive,
          notes: String(row['비고'] || '').trim(),
          naverId: String(row['네이버 아이디'] || '').trim(),
          naverPassword: String(row['네이버 비밀번호'] || '').trim(),
          businessType: String(row['업종'] || '').trim(),
          optimization: optimization,
          reservation: reservation,
          reviewing: reviewing,
          quota: Object.keys(quota).length > 0 ? quota : undefined,
        };
      });

      if (clients.length === 0) {
        alert('엑셀 파일에 데이터가 없습니다.');
        setBulkUploading(false);
        return;
      }

      // API 호출
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients }),
      });

      const result = await response.json();

      if (response.ok) {
        setBulkUploadResult(result.results);
        if (result.results.failedCount === 0) {
          alert(`모든 광고주(${result.results.successCount}명)가 성공적으로 등록되었습니다.`);
        } else {
          alert(`${result.results.successCount}명 성공, ${result.results.failedCount}명 실패했습니다. 상세 내용을 확인해주세요.`);
        }
        fetchClients();
      } else {
        alert(result.error || '일괄 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Excel upload error:', error);
      alert(`엑셀 파일 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
          placeLink: formData.placeLink || undefined,
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
        placeLink: '',
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
          daangn: { total: 0, remaining: 0 },
          experience: { total: 0, remaining: 0 },
          myexpense: { total: 0, remaining: 0 },
        },
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

    // 타임존 문제를 피하기 위해 날짜 문자열을 직접 파싱
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const endDate = parseDate(client.contractEndDate);
    
    if (!endDate) {
      // 계약 종료일이 없으면 'expired'가 아닌 경우만 표시
      return contractFilter !== 'expired';
    }

    const diffTime = endDate.getTime() - todayDate.getTime();
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

  // 일괄 선택/해제 함수
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredClients.map(client => client.id));
      setSelectedClients(allIds);
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(clientId);
    } else {
      newSelected.delete(clientId);
    }
    setSelectedClients(newSelected);
  };

  // 일괄 수정
  const handleBulkUpdate = async () => {
    if (selectedClients.size === 0) {
      alert('수정할 광고주를 선택해주세요.');
      return;
    }

    setBulkProcessing(true);
    try {
      const updateData: any = {};
      if (bulkEditForm.businessType !== '') {
        updateData.businessType = bulkEditForm.businessType;
      }
      if (bulkEditForm.optimization !== null) {
        updateData.optimization = bulkEditForm.optimization;
      }
      if (bulkEditForm.reservation !== null) {
        updateData.reservation = bulkEditForm.reservation;
      }
      if (bulkEditForm.reviewing !== null) {
        updateData.reviewing = bulkEditForm.reviewing;
      }
      if (bulkEditForm.isActive !== null) {
        updateData.isActive = bulkEditForm.isActive;
      }

      if (Object.keys(updateData).length === 0) {
        alert('수정할 항목을 선택해주세요.');
        setBulkProcessing(false);
        return;
      }

      const response = await fetch('/api/users/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedClients),
          data: updateData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        fetchClients();
        setSelectedClients(new Set());
        setShowBulkEditModal(false);
        setBulkEditForm({
          businessType: '',
          optimization: null,
          reservation: null,
          reviewing: null,
          isActive: null,
        });
        alert(`성공적으로 ${result.successCount || selectedClients.size}개 광고주를 수정했습니다.`);
      } else {
        const data = await response.json();
        alert(data.error || '일괄 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('일괄 수정 중 오류가 발생했습니다.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) {
      alert('삭제할 광고주를 선택해주세요.');
      return;
    }

    const selectedNames = filteredClients
      .filter(client => selectedClients.has(client.id))
      .map(client => client.username)
      .join(', ');

    if (!confirm(`정말로 선택한 ${selectedClients.size}개 광고주를 삭제하시겠습니까?\n\n선택된 광고주: ${selectedNames}\n\n이 작업은 되돌릴 수 없으며, 해당 광고주의 모든 데이터가 삭제됩니다.`)) {
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedClients),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        fetchClients();
        setSelectedClients(new Set());
        alert(`성공적으로 ${result.successCount || selectedClients.size}개 광고주를 삭제했습니다.`);
      } else {
        const data = await response.json();
        alert(data.error || '일괄 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setBulkProcessing(false);
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
      myexpense: {
        total: (currentQuota.myexpense?.total || 0) + (newQuota.myexpense?.total || 0),
        remaining: (currentQuota.myexpense?.remaining || 0) + (newQuota.myexpense?.remaining || 0),
      },
    };

    // 계약 종료일 기준으로 연장 (계약 시작일은 유지)
    const currentEndDate = parseDate(renewingClient.contractEndDate) || new Date();
    
    // 계약 종료일이 과거인 경우 오늘 날짜부터 시작
    const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
    
    // 새로운 종료일 계산 (기존 종료일 또는 오늘 + 재계약 기간)
    const months = parseInt(renewPlanType, 10);
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    const endDateString = newEndDate.toISOString().split('T')[0];
    // 계약 시작일은 변경하지 않음 (기존 값 유지)

    try {
      const response = await fetch(`/api/users/${renewingClient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // contractStartDate는 전송하지 않음 (기존 값 유지)
          contractEndDate: endDateString,
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
            <div className="flex gap-2">
              <button
                onClick={downloadExcelTemplate}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                📥 엑셀 템플릿 다운로드
              </button>
              <label
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm cursor-pointer"
              >
                📤 엑셀 일괄 등록
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={bulkUploading}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                + 광고주 추가
              </button>
            </div>
          </div>
        </div>

        {/* 일괄 등록 결과 */}
        {bulkUploadResult && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              일괄 등록 결과
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-700 mb-1">전체</div>
                  <div className="text-2xl font-bold text-blue-900">{bulkUploadResult.total}명</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-700 mb-1">성공</div>
                  <div className="text-2xl font-bold text-green-900">{bulkUploadResult.successCount}명</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-700 mb-1">실패</div>
                  <div className="text-2xl font-bold text-red-900">{bulkUploadResult.failedCount}명</div>
                </div>
              </div>
              
              {bulkUploadResult.failed && bulkUploadResult.failed.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">실패 목록</h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">행 번호</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">아이디</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">오류 내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {bulkUploadResult.failed.map((item: any, index: number) => (
                          <tr key={index} className="bg-white">
                            <td className="px-3 py-2 text-gray-900">{item.row}</td>
                            <td className="px-3 py-2 text-gray-900">{item.username}</td>
                            <td className="px-3 py-2 text-red-600">{item.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setBulkUploadResult(null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}

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
                    onChange={(e) => {
                      const selectedPlanType = e.target.value;
                      setFormData({ 
                        ...formData, 
                        planType: selectedPlanType,
                        quota: getQuotaByPlan(selectedPlanType)
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="1">수기입력</option>
                    <option value="3">3개월 (블로그 30개, 영수증 60개, 인기게시물 3개, 맘카페 3개, 당근마켓 3개, 인스타그램 통합 1000개, 체험단 1회)</option>
                    <option value="6">6개월 (블로그 60개, 영수증 120개, 인기게시물 6개, 맘카페 6개, 당근마켓 6개, 인스타그램 통합 2000개, 파워블로그 2회, 체험단 2회)</option>
                  </select>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium mb-1">포함된 작업:</div>
                    {formData.planType === '1' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>블로그 리뷰: 10개</li>
                        <li>영수증 리뷰: 10개</li>
                        <li>인기게시물: 1개</li>
                        <li>맘카페: 1개</li>
                      </ul>
                    )}
                    {formData.planType === '3' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>블로그 리뷰: 30개</li>
                        <li>영수증 리뷰: 60개</li>
                        <li>인기게시물: 3개</li>
                        <li>맘카페: 3개</li>
                        <li>당근마켓: 3개</li>
                        <li>인스타그램 (팔로워/좋아요): 통합 1000개</li>
                        <li>체험단 모집: 1회</li>
                      </ul>
                    )}
                    {formData.planType === '6' && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>블로그 리뷰: 60개</li>
                        <li>영수증 리뷰: 120개</li>
                        <li>인기게시물: 6개</li>
                        <li>맘카페: 6개</li>
                        <li>당근마켓: 6개</li>
                        <li>인스타그램 (팔로워/좋아요): 통합 2000개</li>
                        <li>파워블로그: 2회</li>
                        <li>체험단 모집: 2회</li>
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
              
              {/* 1개월 플랜 할당량 수기 입력 필드 */}
              {formData.planType === '1' && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">할당량 수기 입력</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">인스타 팔로워 (총/남은)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formData.quota.follower.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                follower: {
                                  ...formData.quota.follower,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.follower.total}
                          value={formData.quota.follower.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                follower: {
                                  ...formData.quota.follower,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.like.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                like: {
                                  ...formData.quota.like,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.like.total}
                          value={formData.quota.like.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                like: {
                                  ...formData.quota.like,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.hotpost.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                hotpost: {
                                  ...formData.quota.hotpost,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.hotpost.total}
                          value={formData.quota.hotpost.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                hotpost: {
                                  ...formData.quota.hotpost,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.momcafe.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                momcafe: {
                                  ...formData.quota.momcafe,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.momcafe.total}
                          value={formData.quota.momcafe.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                momcafe: {
                                  ...formData.quota.momcafe,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.blog.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                blog: {
                                  ...formData.quota.blog,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.blog.total}
                          value={formData.quota.blog.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                blog: {
                                  ...formData.quota.blog,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.receipt.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                receipt: {
                                  ...formData.quota.receipt,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.receipt.total}
                          value={formData.quota.receipt.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                receipt: {
                                  ...formData.quota.receipt,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">당근마켓 (총/남은)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formData.quota.daangn.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                daangn: {
                                  ...formData.quota.daangn,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.daangn.total}
                          value={formData.quota.daangn.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                daangn: {
                                  ...formData.quota.daangn,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">체험단 모집 (총/남은)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formData.quota.experience.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                experience: {
                                  ...formData.quota.experience,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.experience.total}
                          value={formData.quota.experience.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                experience: {
                                  ...formData.quota.experience,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
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
                          value={formData.quota.powerblog.total}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                powerblog: {
                                  ...formData.quota.powerblog,
                                  total: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max={formData.quota.powerblog.total}
                          value={formData.quota.powerblog.remaining}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              quota: {
                                ...formData.quota,
                                powerblog: {
                                  ...formData.quota.powerblog,
                                  remaining: parseInt(e.target.value) || 0,
                                },
                              },
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      플레이스 링크 <span className="text-gray-500 text-xs">(선택사항)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.placeLink}
                      onChange={(e) =>
                        setFormData({ ...formData, placeLink: e.target.value })
                      }
                      placeholder="https://place.map.kakao.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      맘카페 신청 시 자동으로 입력됩니다
                    </p>
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
                      placeLink: '',
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
                        daangn: { total: 0, remaining: 0 },
                        experience: { total: 0, remaining: 0 },
                        myexpense: { total: 0, remaining: 0 },
                      },
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

        {/* 일괄 작업 버튼 */}
        {filteredClients.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedClients.size > 0 && selectedClients.size === filteredClients.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  전체 선택 ({selectedClients.size}/{filteredClients.length})
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              {selectedClients.size > 0 && (
                <>
                  <button
                    onClick={() => setShowBulkEditModal(true)}
                    disabled={bulkProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    일괄 수정 ({selectedClients.size})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkProcessing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    일괄 삭제 ({selectedClients.size})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Clients List */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 광고주가 없습니다.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredClients.map((client) => {
                const isExpanded = expandedClients.has(client.id);
                // 타임존 문제를 피하기 위해 날짜 문자열을 직접 비교
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                // 계약 종료일을 날짜 객체로 변환 (로컬 타임존, 시간은 00:00:00)
                const endDate = parseDate(client.contractEndDate);
                
                // 오늘 날짜를 로컬 타임존으로 변환 (시간은 00:00:00)
                const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                // 만료 여부 확인 (날짜만 비교, 시간 무시)
                const isExpired = endDate && endDate < todayDate;
                const isActive = client.isActive !== false && !isExpired;
                
                // 남은 일수 계산
                const daysLeft = endDate ? Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <div key={client.id} className="hover:bg-gray-50 transition-colors">
                    {/* 기본 정보 행 (항상 표시) */}
                    <div 
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => {
                        const newExpanded = new Set(expandedClients);
                        if (newExpanded.has(client.id)) {
                          newExpanded.delete(client.id);
                        } else {
                          newExpanded.add(client.id);
                        }
                        setExpandedClients(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* 체크박스 */}
                          <div 
                            className="flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedClients.has(client.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectClient(client.id, e.target.checked);
                              }}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                          </div>
                          {/* 아이디 */}
                          <div className="font-medium text-gray-900 min-w-[120px]">
                            {client.username}
                          </div>
                          
                          {/* 상호명 */}
                          <div className="text-gray-700 min-w-[150px] truncate">
                            {client.companyName || '-'}
                          </div>
                          
                          {/* 계약 상태 */}
                          <div className="min-w-[120px]">
                            {isExpired ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                만료됨
                              </span>
                            ) : !client.isActive ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                차단됨
                              </span>
                            ) : endDate ? (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  활성
                                </span>
                                <span className="text-xs text-gray-500">
                                  {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 ? `${daysLeft}일 남음` : daysLeft !== null && daysLeft > 30 ? '' : daysLeft !== null && daysLeft <= 0 ? '만료됨' : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </div>
                          
                          {/* 최적화/예약/검수중 상태 */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">최적화:</span>
                              <span className={`text-xs font-medium ${client.optimization ? 'text-green-600' : 'text-gray-400'}`}>
                                {client.optimization ? '완료' : '대기'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">예약:</span>
                              <span className={`text-xs font-medium ${client.reservation ? 'text-green-600' : 'text-gray-400'}`}>
                                {client.reservation ? '완료' : '대기'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">검수중:</span>
                              <span className={`text-xs font-medium ${client.reviewing ? 'text-blue-600' : 'text-gray-400'}`}>
                                {client.reviewing ? '검수중' : '대기'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 펼치기/접기 아이콘 */}
                        <div className="flex items-center gap-3 ml-4">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* 펼쳐진 상세 정보 */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* 업종 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">업종</label>
                            <div className="text-sm text-gray-900">{client.businessType || '-'}</div>
                          </div>
                          
                          {/* 네이버 아이디 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">네이버 아이디</label>
                            <div className="text-sm text-gray-900">{client.naverId || '-'}</div>
                          </div>
                          
                          {/* 네이버 비밀번호 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">네이버 비밀번호</label>
                            <div className="text-sm text-gray-900 font-mono">{client.naverPassword || '-'}</div>
                          </div>
                          
                          {/* 플레이스 링크 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">플레이스 링크</label>
                            <div className="text-sm text-gray-900">
                              {client.placeLink ? (
                                <a
                                  href={client.placeLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-700 underline break-all"
                                >
                                  {client.placeLink}
                                </a>
                              ) : (
                                '-'
                              )}
                            </div>
                          </div>
                          
                          {/* 생성일 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">생성일</label>
                            <div className="text-sm text-gray-900">{formatDate(client.createdAt)}</div>
                          </div>
                          
                          {/* 계약 정보 */}
                          {client.contractEndDate && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">계약 종료일</label>
                              <div className="text-sm text-gray-900">{formatDateSafe(client.contractEndDate)}</div>
                            </div>
                          )}
                          
                          {/* 작업별 남은 개수 */}
                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-medium text-gray-500 mb-2">작업별 남은 개수</label>
                            {client.quota ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-blue-600 mb-1">인기게시물</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.hotpost?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-purple-600 mb-1">맘카페</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.momcafe?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-green-600 mb-1">팔로워</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.follower?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-orange-600 mb-1">좋아요</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.like?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-indigo-600 mb-1">파워블로그</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.powerblog?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-teal-600 mb-1">클립</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.clip?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-pink-600 mb-1">블로그 리뷰</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.blog?.remaining || 0}개</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-red-600 mb-1">영수증 리뷰</div>
                                  <div className="text-lg font-bold text-gray-900">{client.quota.receipt?.remaining || 0}개</div>
                                </div>
                                {client.quota.myexpense && client.quota.myexpense.total > 0 && (
                                  <div className="bg-white p-3 rounded border">
                                    <div className="text-xs text-purple-600 mb-1">내돈내산 리뷰</div>
                                    <div className="text-lg font-bold text-gray-900">{client.quota.myexpense?.remaining || 0}개</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">{client.remainingQuota || 0}건</div>
                            )}
                          </div>
                          
                          {/* 관리 버튼 */}
                          <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClient(client);
                                  const existingQuota = client.quota || {};
                                  setEditForm({
                                    username: client.username,
                                    companyName: client.companyName || '',
                                    notes: client.notes || '',
                                    naverId: client.naverId || '',
                                    naverPassword: client.naverPassword || '',
                                    placeLink: client.placeLink || '',
                                    businessType: client.businessType || '',
                                    optimization: client.optimization || false,
                                    reservation: client.reservation || false,
                                    reviewing: client.reviewing || false,
                                    quota: {
                                      follower: existingQuota.follower || { total: 0, remaining: 0 },
                                      like: existingQuota.like || { total: 0, remaining: 0 },
                                      hotpost: existingQuota.hotpost || { total: 0, remaining: 0 },
                                      momcafe: existingQuota.momcafe || { total: 0, remaining: 0 },
                                      powerblog: existingQuota.powerblog || { total: 0, remaining: 0 },
                                      clip: existingQuota.clip || { total: 0, remaining: 0 },
                                      blog: existingQuota.blog || { total: 0, remaining: 0 },
                                      receipt: existingQuota.receipt || { total: 0, remaining: 0 },
                                      daangn: existingQuota.daangn || { total: 0, remaining: 0 },
                                      experience: existingQuota.experience || { total: 0, remaining: 0 },
                                      myexpense: existingQuota.myexpense || { total: 0, remaining: 0 },
                                    },
                                  });
                                }}
                                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 bg-green-50 text-green-700 font-medium"
                              >
                                수정
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleActive(client);
                                }}
                                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 text-gray-700 font-medium"
                              >
                                {client.isActive !== false ? '차단' : '활성화'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExtendingClient(client);
                                  setExtendDate(client.contractEndDate || '');
                                }}
                                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 text-gray-700 font-medium"
                              >
                                연장
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenewingClient(client);
                                  setRenewPlanType('1');
                                }}
                                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 bg-blue-50 text-blue-700 font-medium"
                              >
                                재계약
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClient(client);
                                }}
                                className="px-3 py-1.5 text-sm rounded border hover:bg-red-50 bg-red-50 text-red-700 font-medium"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                    {formatDateSafe(extendingClient.contractEndDate)}
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
                      const currentEnd = parseDate(extendingClient.contractEndDate);
                      const today = new Date();
                      if (currentEnd && currentEnd > today) {
                        return currentEnd.toISOString().split('T')[0];
                      }
                      return today.toISOString().split('T')[0];
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
                      계약 종료일: {formatDateSafe(getContractEndDate(new Date().toISOString().split('T')[0], renewPlanType))}
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

        {/* 일괄 수정 모달 */}
        {showBulkEditModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowBulkEditModal(false);
              setBulkEditForm({
                businessType: '',
                optimization: null,
                reservation: null,
                reviewing: null,
                isActive: null,
              });
            }}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                일괄 수정 ({selectedClients.size}개 광고주)
              </h2>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                <p>변경할 항목만 선택하세요. 선택하지 않은 항목은 변경되지 않습니다.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    업종
                  </label>
                  <select
                    value={bulkEditForm.businessType}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, businessType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="">변경 안 함</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최적화 상태
                    </label>
                    <select
                      value={bulkEditForm.optimization === null ? '' : bulkEditForm.optimization ? 'true' : 'false'}
                      onChange={(e) => setBulkEditForm({ 
                        ...bulkEditForm, 
                        optimization: e.target.value === '' ? null : e.target.value === 'true' 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="">변경 안 함</option>
                      <option value="true">완료</option>
                      <option value="false">대기</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예약 상태
                    </label>
                    <select
                      value={bulkEditForm.reservation === null ? '' : bulkEditForm.reservation ? 'true' : 'false'}
                      onChange={(e) => setBulkEditForm({ 
                        ...bulkEditForm, 
                        reservation: e.target.value === '' ? null : e.target.value === 'true' 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="">변경 안 함</option>
                      <option value="true">완료</option>
                      <option value="false">대기</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      검수중 상태
                    </label>
                    <select
                      value={bulkEditForm.reviewing === null ? '' : bulkEditForm.reviewing ? 'true' : 'false'}
                      onChange={(e) => setBulkEditForm({ 
                        ...bulkEditForm, 
                        reviewing: e.target.value === '' ? null : e.target.value === 'true' 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="">변경 안 함</option>
                      <option value="true">검수중</option>
                      <option value="false">대기</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      활성화 상태
                    </label>
                    <select
                      value={bulkEditForm.isActive === null ? '' : bulkEditForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setBulkEditForm({ 
                        ...bulkEditForm, 
                        isActive: e.target.value === '' ? null : e.target.value === 'true' 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="">변경 안 함</option>
                      <option value="true">활성화</option>
                      <option value="false">비활성화</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBulkEditModal(false);
                      setBulkEditForm({
                        businessType: '',
                        optimization: null,
                        reservation: null,
                        reviewing: null,
                        isActive: null,
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleBulkUpdate}
                    disabled={bulkProcessing}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {bulkProcessing ? '수정 중...' : '수정하기'}
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
                placeLink: '',
                businessType: '',
                optimization: false,
                reservation: false,
                reviewing: false,
                quota: {
                  follower: { total: 0, remaining: 0 },
                  like: { total: 0, remaining: 0 },
                  hotpost: { total: 0, remaining: 0 },
                  momcafe: { total: 0, remaining: 0 },
                  powerblog: { total: 0, remaining: 0 },
                  clip: { total: 0, remaining: 0 },
                  blog: { total: 0, remaining: 0 },
                  receipt: { total: 0, remaining: 0 },
                  daangn: { total: 0, remaining: 0 },
                  experience: { total: 0, remaining: 0 },
                  myexpense: { total: 0, remaining: 0 },
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
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">당근마켓 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.daangn?.total || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.daangn = {
                                ...newQuota.daangn,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.daangn?.total || 0}
                            value={editForm.quota.daangn?.remaining || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.daangn = {
                                ...newQuota.daangn,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">내돈내산 리뷰 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.myexpense?.total || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.myexpense = {
                                ...newQuota.myexpense,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.myexpense?.total || 0}
                            value={editForm.quota.myexpense?.remaining || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.myexpense = {
                                ...newQuota.myexpense,
                                remaining: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">체험단 모집 (총/남은)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.quota.experience?.total || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.experience = {
                                ...newQuota.experience,
                                total: parseInt(e.target.value) || 0,
                              };
                              setEditForm({ ...editForm, quota: newQuota });
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            max={editForm.quota.experience?.total || 0}
                            value={editForm.quota.experience?.remaining || 0}
                            onChange={(e) => {
                              const newQuota = { ...editForm.quota };
                              newQuota.experience = {
                                ...newQuota.experience,
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      플레이스 링크 <span className="text-gray-500 text-xs">(선택사항)</span>
                    </label>
                    <input
                      type="url"
                      value={editForm.placeLink}
                      onChange={(e) => setEditForm({ ...editForm, placeLink: e.target.value })}
                      placeholder="https://place.map.kakao.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      맘카페 신청 시 자동으로 입력됩니다
                    </p>
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
                  {/* 최적화/예약/검수중 체크박스 */}
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
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.reviewing}
                          onChange={(e) => setEditForm({ ...editForm, reviewing: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">검수중</span>
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
                        placeLink: '',
                        businessType: '',
                        optimization: false,
                        reservation: false,
                        reviewing: false,
                        quota: {
                          follower: { total: 0, remaining: 0 },
                          like: { total: 0, remaining: 0 },
                          hotpost: { total: 0, remaining: 0 },
                          momcafe: { total: 0, remaining: 0 },
                          powerblog: { total: 0, remaining: 0 },
                          clip: { total: 0, remaining: 0 },
                          blog: { total: 0, remaining: 0 },
                          receipt: { total: 0, remaining: 0 },
                          daangn: { total: 0, remaining: 0 },
                          experience: { total: 0, remaining: 0 },
                          myexpense: { total: 0, remaining: 0 },
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
                            placeLink: editForm.placeLink || null,
                            businessType: editForm.businessType || null,
                            optimization: editForm.optimization,
                            reservation: editForm.reservation,
                            reviewing: editForm.reviewing,
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

