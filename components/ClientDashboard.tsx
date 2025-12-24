'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import LogoutButton from './LogoutButton';
import ContractExpiredModal from './ContractExpiredModal';

interface Quota {
  follower?: { total: number; remaining: number };
  like?: { total: number; remaining: number };
  hotpost?: { total: number; remaining: number };
  momcafe?: { total: number; remaining: number };
  powerblog?: { total: number; remaining: number };
  clip?: { total: number; remaining: number };
  blog?: { total: number; remaining: number };
  receipt?: { total: number; remaining: number };
  daangn?: { total: number; remaining: number };
  experience?: { total: number; remaining: number };
  myexpense?: { total: number; remaining: number };
}

interface User {
  id: string;
  username: string;
  companyName?: string;
  role: string;
  remainingQuota?: number;
  totalQuota?: number;
  quota?: Quota;
  contractStartDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
  points?: number;
}

interface ClientDashboardProps {
  user: User;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(user);
  const [loading, setLoading] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Fetch latest user data to get updated quota
    fetchUserData();
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!currentUser.id) return;
    
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        // 사용자별로 localStorage 키 구분
        const storageKey = `hiddenAnnouncements_${currentUser.id}`;
        const activeAnnouncements = (data.announcements || []).filter((ann: Announcement) => {
          // localStorage에서 "다시 보지 않기" 체크
          const hiddenAnnouncements = localStorage.getItem(storageKey);
          if (hiddenAnnouncements) {
            const hiddenIds = JSON.parse(hiddenAnnouncements);
            return !hiddenIds.includes(ann.id);
          }
          return true;
        });
        
        // 우선순위와 생성일 기준으로 정렬
        activeAnnouncements.sort((a: Announcement, b: Announcement) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return 0;
        });
        
        setAnnouncements(activeAnnouncements);
        
        // 활성화된 공지사항이 있으면 모달 표시
        if (activeAnnouncements.length > 0) {
          setShowAnnouncementModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    // 사용자 정보가 로드된 후 공지사항 가져오기
    if (currentUser.id) {
      fetchAnnouncements();
    }
  }, [currentUser.id, fetchAnnouncements]);

  const handleCloseAnnouncement = () => {
    if (dontShowAgain && announcements[currentAnnouncementIndex]) {
      // "다시 보지 않기" 체크 시 사용자별 localStorage에 저장
      const storageKey = `hiddenAnnouncements_${currentUser.id}`;
      const hiddenAnnouncements = localStorage.getItem(storageKey);
      const hiddenIds = hiddenAnnouncements ? JSON.parse(hiddenAnnouncements) : [];
      if (!hiddenIds.includes(announcements[currentAnnouncementIndex].id)) {
        hiddenIds.push(announcements[currentAnnouncementIndex].id);
        localStorage.setItem(storageKey, JSON.stringify(hiddenIds));
      }
    }
    
    // 다음 공지사항이 있으면 다음으로, 없으면 모달 닫기
    if (currentAnnouncementIndex < announcements.length - 1) {
      setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
      setDontShowAgain(false);
    } else {
      setShowAnnouncementModal(false);
      setCurrentAnnouncementIndex(0);
      setDontShowAgain(false);
    }
  };

  useEffect(() => {
    // 계약 만료 체크 (타임존 문제 해결)
    if (currentUser.contractEndDate) {
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const [year, month, day] = currentUser.contractEndDate.split('-').map(Number);
      const endDate = new Date(year, month - 1, day);
      if (endDate < todayDate || !currentUser.isActive) {
        setShowExpiredModal(true);
      }
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      // 캐시 방지를 위해 timestamp 추가
      const response = await fetch(`/api/auth/me?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        // 디버깅: 인스타그램 할당량 로그
        if (data.user?.quota) {
          console.log('Instagram quota:', {
            follower: data.user.quota.follower,
            like: data.user.quota.like,
            total: (data.user.quota.follower?.remaining || 0) + (data.user.quota.like?.remaining || 0),
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 계약 만료 모달 */}
      {showExpiredModal && currentUser.contractEndDate && (
        <ContractExpiredModal
          contractEndDate={currentUser.contractEndDate}
          onClose={() => {
            setShowExpiredModal(false);
            router.push('/login');
          }}
        />
      )}

      {/* 공지사항 팝업 모달 */}
      {showAnnouncementModal && announcements[currentAnnouncementIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* 헤더 (고정) */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">공지사항</h2>
                {announcements.length > 1 && (
                  <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    ({currentAnnouncementIndex + 1}/{announcements.length})
                  </span>
                )}
              </div>
              <button
                onClick={handleCloseAnnouncement}
                className="text-gray-400 hover:text-gray-600 transition ml-2 flex-shrink-0 p-1"
                aria-label="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 콘텐츠 영역 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                  {announcements[currentAnnouncementIndex].title}
                </h3>
                <div className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                  {announcements[currentAnnouncementIndex].content}
                </div>
              </div>
            </div>

            {/* 하단 버튼 영역 (고정) */}
            <div className="flex items-center justify-between p-4 sm:p-6 pt-4 border-t border-gray-200 flex-shrink-0 gap-3">
              <label className="flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-600 whitespace-nowrap">다시 보지 않기</span>
              </label>
              <button
                onClick={handleCloseAnnouncement}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm sm:text-base flex-shrink-0"
              >
                {currentAnnouncementIndex < announcements.length - 1 ? '다음' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">인플루언서컴퍼니</h1>
              <p className="text-xs text-gray-600">{formatDate(today)}</p>
              {currentUser.companyName && (
                <p className="text-xs font-medium text-gray-700 mt-0.5">
                  {currentUser.companyName}
                </p>
              )}
            </div>
            <LogoutButton />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">남은 작업</div>
            {currentUser.quota ? (
              <div className="grid grid-cols-2 gap-2">
                {/* 블로그 리뷰 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">블로그 리뷰</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.blog?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 영수증 리뷰 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">영수증 리뷰</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.receipt?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 인스타 팔로워+좋아요 합계 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">인스타그램</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{(currentUser.quota.follower?.remaining || 0) + (currentUser.quota.like?.remaining || 0)}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">팔로워+좋아요</div>
                </div>
                {/* 인기게시물 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">인기게시물</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.hotpost?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 맘카페 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">맘카페</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.momcafe?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 당근마켓 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">당근마켓 후기</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.daangn?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 체험단 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">체험단</div>
                  <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.experience?.remaining || 0}</span>
                    <span className="text-sm font-normal">개</span>
                  </div>
                </div>
                {/* 파워블로그 (6개월 플랜만) */}
                {currentUser.quota.powerblog && currentUser.quota.powerblog.total > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">파워블로그</div>
                    <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                      <span>{currentUser.quota.powerblog.remaining || 0}</span>
                      <span className="text-sm font-normal">개</span>
                    </div>
                  </div>
                )}
                {/* 내돈내산 리뷰 (관리자가 추가한 경우만) */}
                {currentUser.quota.myexpense && currentUser.quota.myexpense.total > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">내돈내산 리뷰</div>
                    <div className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                      <span>{currentUser.quota.myexpense.remaining || 0}</span>
                      <span className="text-sm font-normal">개</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-xl font-bold text-gray-900">
                  {currentUser.remainingQuota || 0}건
                </div>
                {currentUser.totalQuota && (
                  <div className="text-xs text-gray-600 mt-1">
                    전체 {currentUser.totalQuota}건 중
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* 신청 버튼 영역 */}
        <div className="mb-5 space-y-2">
          <Link
            href="/client/order"
            onClick={(e) => {
              console.log('2차 작업 신청 버튼 클릭됨 (Link)');
              console.log('Current user:', currentUser);
              
              // 1개월 플랜 체크
              const isOneMonthPlan = !currentUser.quota || (
                (currentUser.quota?.follower?.total || 0) === 0 &&
                (currentUser.quota?.like?.total || 0) === 0 &&
                (currentUser.quota?.hotpost?.total || 0) === 0 &&
                (currentUser.quota?.momcafe?.total || 0) === 0 &&
                (currentUser.quota?.blog?.total || 0) === 0 &&
                (currentUser.quota?.receipt?.total || 0) === 0 &&
                (currentUser.quota?.daangn?.total || 0) === 0 &&
                (currentUser.quota?.experience?.total || 0) === 0 &&
                (currentUser.quota?.powerblog?.total || 0) === 0 &&
                (currentUser.quota?.myexpense?.total || 0) === 0
              );
              console.log('1개월 플랜 여부:', isOneMonthPlan);
              console.log('페이지 이동 시작: /client/order');
              
              // 1개월 플랜은 항상 접근 허용
              if (!isOneMonthPlan) {
                // 다른 플랜의 경우 추가 체크 (필요시)
                console.log('다른 플랜 사용자');
              }
            }}
            className="block w-full bg-primary-600 text-white py-3 rounded-lg font-medium text-base hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-center"
            style={{ pointerEvents: 'auto', textDecoration: 'none' }}
          >
            2차 작업 신청
          </Link>
          
          <Link
            href="/client/review-request"
            className="block w-full bg-white border-2 border-primary-600 text-primary-600 py-3 rounded-lg font-medium text-base hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-center"
            style={{ pointerEvents: 'auto', textDecoration: 'none' }}
          >
            리뷰 신청
          </Link>
        </div>

        {/* Menu */}
        <div className="space-y-2">
          <button
            onClick={() => router.push('/client/orders')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">발주 목록</div>
                <div className="text-xs text-gray-500 mt-0.5">작업 신청 내역 확인</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/guide')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">가이드</div>
                <div className="text-xs text-gray-500 mt-0.5">작업 신청 방법 안내</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/announcements')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">공지사항</div>
                <div className="text-xs text-gray-500 mt-0.5">중요한 공지사항 확인</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* 포인트 정보 */}
          <div className="bg-primary-600 rounded-lg p-4 mb-2 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/90 mb-1">현재 포인트</div>
                <div className="text-2xl font-bold">
                  {currentUser.points !== undefined
                    ? currentUser.points.toLocaleString()
                    : '0'}P
                </div>
              </div>
              <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <button
            onClick={() => router.push('/client/points/charge')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">포인트 충전 신청</div>
                <div className="text-xs text-gray-500 mt-0.5">포인트 충전 신청하기</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/points/history')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">포인트 충전 내역</div>
                <div className="text-xs text-gray-500 mt-0.5">충전 신청 상태 확인</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/settings')}
            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-gray-900">계정 설정</div>
                <div className="text-xs text-gray-500 mt-0.5">계정 정보 관리</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

