'use client';

import { useState, useEffect } from 'react';
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

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(user);
  const [loading, setLoading] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    // Fetch latest user data to get updated quota
    fetchUserData();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">인플루언서컴퍼니</h1>
              <p className="text-sm text-gray-600">{formatDate(today)}</p>
              {currentUser.companyName && (
                <p className="text-sm font-medium text-gray-800 mt-1">
                  {currentUser.companyName}
                </p>
              )}
            </div>
            <LogoutButton />
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">남은 작업</div>
            {currentUser.quota ? (
              <div className="grid grid-cols-2 gap-3">
                {/* 블로그 리뷰 (맨 위) */}
                <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-pink-200">
                  <div className="text-xs font-medium text-pink-800 mb-1">블로그 리뷰</div>
                  <div className="text-2xl font-bold text-pink-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.blog?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 영수증 리뷰 (맨 위) */}
                <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-red-200">
                  <div className="text-xs font-medium text-red-800 mb-1">영수증 리뷰</div>
                  <div className="text-2xl font-bold text-red-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.receipt?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 인스타 팔로워+좋아요 합계 */}
                <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-green-200">
                  <div className="text-xs font-medium text-green-800 mb-1">인스타그램</div>
                  <div className="text-2xl font-bold text-green-900 flex items-baseline gap-1">
                    <span>{(currentUser.quota.follower?.remaining || 0) + (currentUser.quota.like?.remaining || 0)}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                  <div className="text-xs text-green-700 mt-1">팔로워+좋아요</div>
                </div>
                {/* 인기게시물 */}
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-blue-200">
                  <div className="text-xs font-medium text-blue-800 mb-1">인기게시물</div>
                  <div className="text-2xl font-bold text-blue-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.hotpost?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 맘카페 */}
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-purple-200">
                  <div className="text-xs font-medium text-purple-800 mb-1">맘카페</div>
                  <div className="text-2xl font-bold text-purple-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.momcafe?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 당근마켓 */}
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-yellow-200">
                  <div className="text-xs font-medium text-yellow-800 mb-1">당근마켓</div>
                  <div className="text-2xl font-bold text-yellow-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.daangn?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 체험단 */}
                <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-indigo-200">
                  <div className="text-xs font-medium text-indigo-800 mb-1">체험단</div>
                  <div className="text-2xl font-bold text-indigo-900 flex items-baseline gap-1">
                    <span>{currentUser.quota.experience?.remaining || 0}</span>
                    <span className="text-base font-medium">개</span>
                  </div>
                </div>
                {/* 파워블로그 (6개월 플랜만) */}
                {currentUser.quota.powerblog && currentUser.quota.powerblog.total > 0 && (
                  <div className="bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-teal-200">
                    <div className="text-xs font-medium text-teal-800 mb-1">파워블로그</div>
                    <div className="text-2xl font-bold text-teal-900 flex items-baseline gap-1">
                      <span>{currentUser.quota.powerblog.remaining || 0}</span>
                      <span className="text-base font-medium">개</span>
                    </div>
                  </div>
                )}
                {/* 내돈내산 리뷰 (관리자가 추가한 경우만) */}
                {currentUser.quota.myexpense && currentUser.quota.myexpense.total > 0 && (
                  <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-amber-200">
                    <div className="text-xs font-medium text-amber-800 mb-1">내돈내산 리뷰</div>
                    <div className="text-2xl font-bold text-amber-900 flex items-baseline gap-1">
                      <span>{currentUser.quota.myexpense.remaining || 0}</span>
                      <span className="text-base font-medium">개</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 shadow-sm">
                <div className="text-2xl font-bold text-primary-700">
                  {currentUser.remainingQuota || 0}건
                </div>
                {currentUser.totalQuota && (
                  <div className="text-xs text-primary-600 mt-1 font-medium">
                    전체 {currentUser.totalQuota}건 중
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 신청하기 버튼 */}
        <div className="mb-6">
          <Link
            href="/client/order"
            onClick={(e) => {
              console.log('신청하기 버튼 클릭됨 (Link)');
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
            className="block w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] text-center relative z-10"
            style={{ pointerEvents: 'auto', textDecoration: 'none' }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              신청하기
            </span>
          </Link>
        </div>

        {/* Menu */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/client/orders')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">발주 목록</div>
                <div className="text-sm text-gray-600 mt-0.5">작업 신청 내역 확인</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/guide')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">가이드</div>
                <div className="text-sm text-gray-600 mt-0.5">작업 신청 방법 안내</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* 포인트 정보 */}
          <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-xl p-5 mb-3 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90 mb-2 font-medium">현재 포인트</div>
                <div className="text-3xl font-bold">
                  {currentUser.points !== undefined
                    ? currentUser.points.toLocaleString()
                    : '0'}P
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/client/points/charge')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">포인트 충전 신청</div>
                <div className="text-sm text-gray-600 mt-0.5">포인트 충전 신청하기</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/points/history')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">포인트 충전 내역</div>
                <div className="text-sm text-gray-600 mt-0.5">충전 신청 상태 확인</div>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/settings')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">계정 설정</div>
                <div className="text-sm text-gray-600 mt-0.5">계정 정보 관리</div>
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

