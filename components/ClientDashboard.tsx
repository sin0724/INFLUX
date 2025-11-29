'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    // 계약 만료 체크
    if (currentUser.contractEndDate) {
      const endDate = new Date(currentUser.contractEndDate);
      const now = new Date();
      if (endDate < now || !currentUser.isActive) {
        setShowExpiredModal(true);
      }
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
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
              <div className="grid grid-cols-2 gap-2">
                {/* 블로그 리뷰 (맨 위) */}
                <div className="bg-pink-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">블로그 리뷰</div>
                  <div className="text-lg font-bold text-pink-700">
                    {currentUser.quota.blog?.remaining || 0}개
                  </div>
                </div>
                {/* 영수증 리뷰 (맨 위) */}
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">영수증 리뷰</div>
                  <div className="text-lg font-bold text-red-700">
                    {currentUser.quota.receipt?.remaining || 0}개
                  </div>
                </div>
                {/* 인스타 팔로워+좋아요 합계 (최대 1000개) */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">인스타그램</div>
                  <div className="text-lg font-bold text-green-700">
                    {Math.min((currentUser.quota.follower?.remaining || 0) + (currentUser.quota.like?.remaining || 0), 1000)}개
                  </div>
                  <div className="text-xs text-gray-500 mt-1">팔로워+좋아요</div>
                </div>
                {/* 인기게시물 */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">인기게시물</div>
                  <div className="text-lg font-bold text-blue-700">
                    {currentUser.quota.hotpost?.remaining || 0}개
                  </div>
                </div>
                {/* 맘카페 */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">맘카페</div>
                  <div className="text-lg font-bold text-purple-700">
                    {currentUser.quota.momcafe?.remaining || 0}개
                  </div>
                </div>
                {/* 당근마켓 */}
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">당근마켓</div>
                  <div className="text-lg font-bold text-yellow-700">
                    {currentUser.quota.daangn?.remaining || 0}개
                  </div>
                </div>
                {/* 체험단 */}
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">체험단</div>
                  <div className="text-lg font-bold text-indigo-700">
                    {currentUser.quota.experience?.remaining || 0}개
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-700">
                  {currentUser.remainingQuota || 0}건
                </div>
                {currentUser.totalQuota && (
                  <div className="text-xs text-gray-500 mt-1">
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
          <button
            onClick={() => router.push('/client/order')}
            className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition shadow-lg"
          >
            신청하기
          </button>
        </div>

        {/* Menu */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/client/orders')}
            className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900">발주 목록</div>
            <div className="text-sm text-gray-600 mt-1">작업 신청 내역 확인</div>
          </button>

          <button
            onClick={() => router.push('/client/guide')}
            className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900">가이드</div>
            <div className="text-sm text-gray-600 mt-1">작업 신청 방법 안내</div>
          </button>

          {/* 포인트 정보 */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 mb-3 text-white">
            <div className="text-sm opacity-90 mb-1">현재 포인트</div>
            <div className="text-2xl font-bold">
              {currentUser.points !== undefined
                ? currentUser.points.toLocaleString()
                : '0'}P
            </div>
          </div>

          <button
            onClick={() => router.push('/client/points/charge')}
            className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900">포인트 충전 신청</div>
            <div className="text-sm text-gray-600 mt-1">포인트 충전 신청하기</div>
          </button>

          <button
            onClick={() => router.push('/client/points/history')}
            className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900">포인트 충전 내역</div>
            <div className="text-sm text-gray-600 mt-1">충전 신청 상태 확인</div>
          </button>

          <button
            onClick={() => router.push('/client/settings')}
            className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <div className="font-medium text-gray-900">계정 설정</div>
            <div className="text-sm text-gray-600 mt-1">계정 정보 관리</div>
          </button>
        </div>
      </div>
    </div>
  );
}

