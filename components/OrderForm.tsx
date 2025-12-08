'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';

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
  remainingQuota?: number;
  quota?: Quota;
}

interface OrderFormProps {
  user: User;
}

const TASK_TYPES = [
  { id: 'blog', name: '블로그 리뷰', requiresImage: false, disabled: true, kakaoOnly: true },
  { id: 'receipt', name: '영수증 리뷰', requiresImage: false, disabled: true, kakaoOnly: true },
  { 
    id: 'instagram', 
    name: '인스타그램 (팔로워/좋아요)', 
    requiresImage: false,
    minCount: 10,
    description: '팔로워 또는 좋아요 선택 가능',
    combinedQuota: true
  },
  { id: 'hotpost', name: '인스타그램 인기게시물', requiresImage: true },
  { id: 'momcafe', name: '맘카페', requiresImage: false },
  { id: 'daangn', name: '당근마켓', requiresImage: true, disabled: false },
  { id: 'experience', name: '체험단 신청', requiresImage: false, disabled: false },
  { id: 'powerblog', name: '파워블로그', requiresImage: false, disabled: false }, // 6개월 플랜만 표시됨
  { id: 'myexpense', name: '내돈내산 리뷰', requiresImage: false, disabled: false }, // 관리자가 추가한 경우만 표시됨
  { id: 'eventbanner', name: '이벤트배너/블로그스킨', requiresImage: false, externalLink: 'https://pf.kakao.com/_UxoANn' },
];

export default function OrderForm({ user }: OrderFormProps) {
  const router = useRouter();
  const [taskType, setTaskType] = useState('');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userQuota, setUserQuota] = useState<Quota | undefined>(user.quota);
  const formSectionRef = useRef<HTMLDivElement>(null);

  // 사용자 정보 가져오기 (quota, placeLink 포함)
  const [currentUser, setCurrentUser] = useState(user);
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user?.quota) {
            setUserQuota(data.user.quota);
          }
        }
      })
      .catch(console.error);
  }, []);

  // 맘카페 선택 시 플레이스 링크 자동 입력
  useEffect(() => {
    if (taskType === 'momcafe' && currentUser?.placeLink) {
      setMomcafePlaceLink(currentUser.placeLink);
    }
  }, [taskType, currentUser]);

  // 작업별 입력 필드
  const [postLink, setPostLink] = useState(''); // 좋아요: 게시글 링크
  const [likeCount, setLikeCount] = useState(''); // 좋아요: 좋아요 갯수
  const [instagramNickname, setInstagramNickname] = useState(''); // 팔로워: 인스타 닉네임
  const [followerCount, setFollowerCount] = useState(''); // 팔로워: 팔로워 갯수
  const [instagramType, setInstagramType] = useState<'follower' | 'like'>('follower'); // 인스타그램 타입
  // 인기게시물 필드
  const [hotpostNickname, setHotpostNickname] = useState(''); // 인기게시물: 인스타 닉네임
  const [mainHashtag, setMainHashtag] = useState(''); // 인기게시물: 메인해시태그
  const [businessName, setBusinessName] = useState(''); // 인기게시물: 상호명
  // 맘카페 필드
  const [momcafeBusinessName, setMomcafeBusinessName] = useState(''); // 맘카페: 상호명
  const [momcafeCafeName, setMomcafeCafeName] = useState(''); // 맘카페: 카페이름 or 주소
  const [momcafePlaceLink, setMomcafePlaceLink] = useState(''); // 맘카페: 플레이스 링크
  const [momcafePostGuideline, setMomcafePostGuideline] = useState(''); // 맘카페: 게시글 가이드라인
  const [momcafeCommentGuideline, setMomcafeCommentGuideline] = useState(''); // 맘카페: 댓글 가이드라인
  // 당근마켓 필드
  const [daangnBusinessProfile, setDaangnBusinessProfile] = useState(''); // 당근마켓: 비지니스 프로필 주소
  // 체험단 필드
  const [experienceCompanyName, setExperienceCompanyName] = useState(''); // 체험단: 상호명
  const [experiencePlace, setExperiencePlace] = useState(''); // 체험단: 플레이스
  const [experienceReservationPhone, setExperienceReservationPhone] = useState(''); // 체험단: 예약 조율 가능한 번호
  const [experienceDesiredParticipants, setExperienceDesiredParticipants] = useState(''); // 체험단: 희망모집인원
  const [experienceProvidedDetails, setExperienceProvidedDetails] = useState(''); // 체험단: 제공내역
  const [experienceKeywords, setExperienceKeywords] = useState(''); // 체험단: 키워드
  const [experienceBlogMissionRequired, setExperienceBlogMissionRequired] = useState(false); // 체험단: 블로그미션 부가유무
  const [experienceAdditionalNotes, setExperienceAdditionalNotes] = useState(''); // 체험단: 기타전달사항
  // 파워블로그/클립 필드
  const [customTaskCaption, setCustomTaskCaption] = useState(''); // 파워블로그/클립: 작업 내용

  const selectedTask = TASK_TYPES.find((t) => t.id === taskType);
  const requiresImage = selectedTask?.requiresImage || false;
  const minCount = selectedTask?.minCount;

  const handleTaskSelect = (type: string) => {
    const task = TASK_TYPES.find((t) => t.id === type);
    
    // 외부 링크가 있는 경우 (이벤트배너/블로그스킨)
    if (task?.externalLink) {
      window.open(task.externalLink, '_blank');
      return;
    }
    
    if (task?.disabled) {
      if ((task as any).comingSoon) {
        alert('준비중입니다.');
      } else if (task.kakaoOnly) {
        alert('블로그 리뷰와 영수증 리뷰는 관리자가 완료 링크를 입력할 때 자동으로 차감됩니다.\n추가 신청은 단톡방으로 신청 부탁드립니다.');
      } else {
        alert('이 작업은 담당자를 통해 카카오톡으로 신청부탁드립니다.');
      }
      return;
    }
    
    // 1개월 플랜 체크: quota가 없거나 모든 quota가 0이면 1개월 플랜(기획상품)으로 간주
    const isOneMonthPlan = !userQuota || (
      (userQuota.follower?.total || 0) === 0 &&
      (userQuota.like?.total || 0) === 0 &&
      (userQuota.hotpost?.total || 0) === 0 &&
      (userQuota.momcafe?.total || 0) === 0 &&
      (userQuota.blog?.total || 0) === 0 &&
      (userQuota.receipt?.total || 0) === 0 &&
      (userQuota.daangn?.total || 0) === 0 &&
      (userQuota.experience?.total || 0) === 0 &&
      (userQuota.powerblog?.total || 0) === 0 &&
      (userQuota.myexpense?.total || 0) === 0
    );
    
    // 1개월 플랜은 quota 체크를 우회 (수기 입력이므로 모든 작업 가능)
    if (!isOneMonthPlan && userQuota) {
      if (type === 'instagram') {
        // 인스타그램 통합 쿼터 체크 (팔로워 + 좋아요 합계)
        const totalInstagram = (userQuota.follower?.remaining || 0) + (userQuota.like?.remaining || 0);
        if (totalInstagram <= 0) {
          alert('인스타그램 작업의 남은 개수가 없습니다.');
          return;
        }
      } else {
        const taskQuota = userQuota[type as keyof Quota];
        if (!taskQuota || taskQuota.remaining <= 0) {
          alert('이 작업의 남은 개수가 없습니다.');
          return;
        }
      }
    } else if (!isOneMonthPlan && !userQuota && user.remainingQuota !== undefined && user.remainingQuota <= 0) {
      // 1개월 플랜이 아니고 quota도 없고 remainingQuota도 없으면 안내
      alert('남은 작업 가능 갯수가 없습니다.');
      return;
    }
    
    setTaskType(type);
    setError('');
    // 필드 초기화
    setPostLink('');
    setLikeCount('');
    setInstagramNickname('');
    setFollowerCount('');
    setInstagramType('follower');
    setHotpostNickname('');
    setMainHashtag('');
    setBusinessName('');
    setMomcafeBusinessName('');
    setMomcafeCafeName('');
    setMomcafePlaceLink('');
    setMomcafePostGuideline('');
    setMomcafeCommentGuideline('');
    setDaangnBusinessProfile('');
    setExperienceCompanyName('');
    setExperiencePlace('');
    setExperienceReservationPhone('');
    setExperienceDesiredParticipants('');
    setExperienceProvidedDetails('');
    setExperienceKeywords('');
    setExperienceBlogMissionRequired(false);
    setExperienceAdditionalNotes('');
    setCaption('');
    setCustomTaskCaption('');
    setImages([]);
    
    // 양식 섹션으로 스크롤 (모바일 최적화)
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskType) {
      setError('작업 종류를 선택해주세요.');
      return;
    }

    // 작업별 유효성 검사
    if (taskType === 'instagram') {
      // 인스타그램 통합 처리
      if (instagramType === 'like') {
        if (!postLink.trim()) {
          setError('게시글 링크를 입력해주세요.');
          return;
        }
        const count = parseInt(likeCount);
        if (!likeCount || isNaN(count) || count < 10) {
          setError('좋아요 갯수는 최소 10개 이상이어야 합니다.');
          return;
        }
        // 인스타그램 통합 쿼터 체크
        if (userQuota) {
          const totalInstagram = (userQuota.follower?.remaining || 0) + (userQuota.like?.remaining || 0);
          if (count > totalInstagram) {
            setError(`인스타그램 작업의 남은 개수가 부족합니다. (남은 개수: ${totalInstagram}개)`);
            return;
          }
        }
      } else {
        if (!instagramNickname.trim()) {
          setError('인스타그램 닉네임을 입력해주세요.');
          return;
        }
        const count = parseInt(followerCount);
        if (!followerCount || isNaN(count) || count < 50) {
          setError('팔로워 갯수는 최소 50개 이상이어야 합니다.');
          return;
        }
        // 인스타그램 통합 쿼터 체크
        if (userQuota) {
          const totalInstagram = (userQuota.follower?.remaining || 0) + (userQuota.like?.remaining || 0);
          if (count > totalInstagram) {
            setError(`인스타그램 작업의 남은 개수가 부족합니다. (남은 개수: ${totalInstagram}개)`);
            return;
          }
        }
      }
    }

    if (taskType === 'daangn') {
      if (!daangnBusinessProfile.trim()) {
        setError('당근 비지니스 프로필 주소를 입력해주세요.');
        return;
      }
      if (images.length !== 1) {
        setError('사진 1장을 업로드해주세요.');
        return;
      }
    }

    if (taskType === 'experience') {
      if (!experienceCompanyName.trim()) {
        setError('상호명을 입력해주세요.');
        return;
      }
      if (!experiencePlace.trim()) {
        setError('플레이스를 입력해주세요.');
        return;
      }
      if (!experienceReservationPhone.trim()) {
        setError('예약 조율 가능한 번호를 입력해주세요.');
        return;
      }
      if (!experienceDesiredParticipants || parseInt(experienceDesiredParticipants) < 1) {
        setError('희망모집인원을 입력해주세요.');
        return;
      }
      if (!experienceProvidedDetails.trim()) {
        setError('제공내역을 입력해주세요.');
        return;
      }
      if (!experienceKeywords.trim()) {
        setError('키워드를 입력해주세요.');
        return;
      }
      // 체험단 할당량 체크
      if (userQuota?.experience && userQuota.experience.remaining <= 0) {
        setError('체험단 신청의 남은 개수가 없습니다.');
        return;
      }
    }

    if (taskType === 'hotpost') {
      if (!hotpostNickname.trim()) {
        setError('인스타그램 닉네임을 입력해주세요.');
        return;
      }
      if (!mainHashtag.trim()) {
        setError('메인해시태그를 입력해주세요.');
        return;
      }
      if (!businessName.trim()) {
        setError('상호명을 입력해주세요.');
        return;
      }
      if (images.length !== 1) {
        setError('1:1 비율의 사진 1장을 업로드해주세요.');
        return;
      }
    }

    // hotpost만 이미지 필수 (momcafe는 선택)
    if (taskType === 'hotpost' && images.length === 0) {
      setError('1:1 비율의 사진 1장을 업로드해주세요.');
      return;
    }

    // caption에 구조화된 데이터 저장
    let orderCaption = '';
    let finalTaskType = taskType;
    
    if (taskType === 'instagram') {
      // 인스타그램 통합 처리 - 실제 taskType을 결정
      if (instagramType === 'like') {
        finalTaskType = 'like';
        orderCaption = `게시글 링크: ${postLink}\n좋아요 갯수: ${likeCount}`;
      } else {
        finalTaskType = 'follower';
        orderCaption = `작업할 인스타 닉네임: ${instagramNickname}\n팔로워 갯수: ${followerCount}`;
      }
    } else if (taskType === 'daangn') {
      orderCaption = `당근 비지니스 프로필 주소: ${daangnBusinessProfile}`;
    } else if (taskType === 'hotpost') {
      orderCaption = `인스타그램 닉네임: ${hotpostNickname}\n메인해시태그: ${mainHashtag}\n상호명: ${businessName}`;
    } else if (taskType === 'momcafe') {
      if (!momcafeBusinessName.trim()) {
        setError('상호명을 입력해주세요.');
        return;
      }
      orderCaption = `상호명: ${momcafeBusinessName}\n원하시는 카페이름 or 주소: ${momcafeCafeName || '(미기재)'}\n플레이스 링크: ${momcafePlaceLink || '(미기재)'}\n게시글 가이드라인: ${momcafePostGuideline || '(미기재)'}\n댓글 가이드라인: ${momcafeCommentGuideline || '(미기재)'}`;
    } else if (taskType === 'powerblog' || taskType === 'clip' || taskType === 'myexpense') {
      // 파워블로그/클립/내돈내산 리뷰는 작업 내용 입력 없이 바로 신청 가능
      orderCaption = '';
    } else {
      orderCaption = caption || '';
    }

    setLoading(true);

    try {
      // 체험단은 별도 API 사용
      if (taskType === 'experience') {
        const response = await fetch('/api/experience-applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: experienceCompanyName,
            place: experiencePlace,
            reservationPhone: experienceReservationPhone,
            desiredParticipants: parseInt(experienceDesiredParticipants),
            providedDetails: experienceProvidedDetails,
            keywords: experienceKeywords,
            blogMissionRequired: experienceBlogMissionRequired,
            additionalNotes: experienceAdditionalNotes || null,
            imageUrls: images.length > 0 ? images : null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || '체험단 신청에 실패했습니다.');
          setLoading(false);
          return;
        }
        
        if (!data.success) {
          setError(data.error || '체험단 신청에 실패했습니다.');
          setLoading(false);
          return;
        }

        alert('체험단 신청이 완료되었습니다.');
        router.push('/client');
        return;
      }

      // 신청 개수 추출 (follower, like의 경우)
      let requestCount = 1; // 기본값: hotpost, momcafe는 1개
      if (taskType === 'instagram') {
        if (instagramType === 'like') {
          requestCount = parseInt(likeCount) || 1;
        } else {
          requestCount = parseInt(followerCount) || 1;
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: finalTaskType,
          caption: orderCaption || null,
          imageUrls: images,
          requestCount, // 신청 개수 전달
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '주문 신청에 실패했습니다.');
        setLoading(false);
        return;
      }

      // Success - redirect to success page
      router.push(`/client/order/success?id=${data.order.id}`);
    } catch (err) {
      setError('주문 신청 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">작업 신청</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Task Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              작업 종류
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TASK_TYPES.map((task) => {
                // 파워블로그는 6개월 플랜(파워블로그 할당량이 있는 경우)만 표시
                if (task.id === 'powerblog') {
                  if (!userQuota?.powerblog || userQuota.powerblog.total <= 0) {
                    return null;
                  }
                }
                
                // 내돈내산 리뷰는 할당량이 있는 경우만 표시
                if (task.id === 'myexpense') {
                  if (!userQuota?.myexpense || userQuota.myexpense.total <= 0) {
                    return null;
                  }
                }
                
                // 작업별 quota 체크
                let isDisabled = task.disabled;
                let remainingCount = 0;
                const hasExternalLink = !!task.externalLink;
                
                // 1개월 플랜 체크: quota가 없거나 모든 quota가 0이면 1개월 플랜(기획상품)으로 간주
                const isOneMonthPlan = !userQuota || (
                  (userQuota.follower?.total || 0) === 0 &&
                  (userQuota.like?.total || 0) === 0 &&
                  (userQuota.hotpost?.total || 0) === 0 &&
                  (userQuota.momcafe?.total || 0) === 0 &&
                  (userQuota.blog?.total || 0) === 0 &&
                  (userQuota.receipt?.total || 0) === 0 &&
                  (userQuota.daangn?.total || 0) === 0 &&
                  (userQuota.experience?.total || 0) === 0 &&
                  (userQuota.powerblog?.total || 0) === 0 &&
                  (userQuota.myexpense?.total || 0) === 0
                );
                
                // 1개월 플랜은 quota 체크를 우회 (수기 입력이므로 모든 작업 가능)
                if (isOneMonthPlan && !task.kakaoOnly && !hasExternalLink) {
                  isDisabled = false;
                } else if (userQuota && !hasExternalLink) {
                  if (task.id === 'instagram' && task.combinedQuota) {
                    // 인스타그램 통합 쿼터 (팔로워 + 좋아요 합계)
                    const totalInstagram = (userQuota.follower?.remaining || 0) + (userQuota.like?.remaining || 0);
                    remainingCount = totalInstagram;
                    if (remainingCount <= 0) {
                      isDisabled = true;
                    }
                  } else {
                    const taskQuota = userQuota[task.id as keyof Quota];
                    if (taskQuota) {
                      remainingCount = taskQuota.remaining || 0;
                    }
                    // 블로그/영수증 리뷰는 항상 비활성화 (남은 개수는 표시)
                    if (!task.kakaoOnly && (!taskQuota || taskQuota.remaining <= 0)) {
                      isDisabled = true;
                    }
                  }
                } else if (user.remainingQuota !== undefined && user.remainingQuota <= 0 && !hasExternalLink && !task.disabled && !task.kakaoOnly && task.id !== 'instagram') {
                  isDisabled = true;
                }
                
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskSelect(task.id)}
                    disabled={isDisabled}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      taskType === task.id && !hasExternalLink
                        ? 'border-primary-500 bg-primary-50'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                        : hasExternalLink
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{task.name}</div>
                    {!hasExternalLink && userQuota && (remainingCount > 0 || task.kakaoOnly || (task.id === 'instagram' && remainingCount === 0 && task.combinedQuota)) && (
                      <div className={`text-xs mt-1 font-medium ${task.kakaoOnly ? 'text-gray-600' : 'text-primary-600'}`}>
                        {task.id === 'instagram' && task.combinedQuota 
                          ? `남은 개수: ${remainingCount}개 (팔로워+좋아요 합계)`
                          : `남은 개수: ${remainingCount}개`
                        }
                      </div>
                    )}
                    {task.minCount && (
                      <div className="text-xs text-gray-600 mt-1">
                        최소 {task.minCount}개부터
                      </div>
                    )}
                    {task.requiresImage && (
                      <div className="text-xs text-gray-500 mt-1">이미지 필요</div>
                    )}
                    {task.disabled && !(task as any).comingSoon && !task.kakaoOnly && (
                      <div className="text-xs text-orange-600 mt-1">
                        카카오톡 신청
                      </div>
                    )}
                    {task.kakaoOnly && (
                      <div className="text-xs text-gray-500 mt-1">
                        단톡방 신청
                      </div>
                    )}
                    {(task as any).comingSoon && (
                      <div className="text-xs text-gray-500 mt-1">
                        준비중
                      </div>
                    )}
                    {task.externalLink && (
                      <div className="text-xs text-blue-600 mt-1">
                        카카오톡 채널로 이동
                      </div>
                    )}
                    {!hasExternalLink && !task.disabled && userQuota && remainingCount === 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        남은 개수 없음
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 양식 섹션 (스크롤 타겟) */}
          <div ref={formSectionRef}>
          {/* 인스타그램 통합 입력 필드 */}
          {taskType === 'instagram' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 종류 선택 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setInstagramType('follower')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition ${
                      instagramType === 'follower'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">팔로워</div>
                    <div className="text-xs text-gray-600 mt-1">최소 50개부터</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstagramType('like')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition ${
                      instagramType === 'like'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">좋아요</div>
                    <div className="text-xs text-gray-600 mt-1">최소 10개부터</div>
                  </button>
                </div>
                {userQuota && (
                  <div className="mt-2 text-xs text-gray-600">
                    남은 개수: {(userQuota.follower?.remaining || 0) + (userQuota.like?.remaining || 0)}개 (팔로워+좋아요 합계)
                  </div>
                )}
              </div>

              {/* 팔로워 입력 */}
              {instagramType === 'follower' && (
                <>
                  <div>
                    <label
                      htmlFor="instagramNickname"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      작업할 인스타 닉네임 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="instagramNickname"
                      type="text"
                      value={instagramNickname}
                      onChange={(e) => setInstagramNickname(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="예: incom_seoul"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="followerCount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      팔로워 갯수 <span className="text-red-500">*</span>
                      <span className="text-sm text-gray-500 ml-2">(최소 50개 이상)</span>
                    </label>
                    <input
                      id="followerCount"
                      type="number"
                      value={followerCount}
                      onChange={(e) => setFollowerCount(e.target.value)}
                      min="50"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="50"
                    />
                  </div>
                </>
              )}

              {/* 좋아요 입력 */}
              {instagramType === 'like' && (
                <>
                  <div>
                    <label
                      htmlFor="postLink"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      게시글 링크 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postLink"
                      type="url"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="https://www.instagram.com/p/..."
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="likeCount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      좋아요 갯수 <span className="text-red-500">*</span>
                      <span className="text-sm text-gray-500 ml-2">(최소 10개 이상)</span>
                    </label>
                    <input
                      id="likeCount"
                      type="number"
                      value={likeCount}
                      onChange={(e) => setLikeCount(e.target.value)}
                      min="10"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="10"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 인스타그램 좋아요 입력 필드 (기존, 호환성 유지) */}
          {taskType === 'like' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="postLink"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  게시글 링크 <span className="text-red-500">*</span>
                </label>
                <input
                  id="postLink"
                  type="url"
                  value={postLink}
                  onChange={(e) => setPostLink(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="https://www.instagram.com/p/..."
                />
              </div>
              <div>
                <label
                  htmlFor="likeCount"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  좋아요 갯수 <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 ml-2">(최소 10개 이상)</span>
                </label>
                <input
                  id="likeCount"
                  type="number"
                  value={likeCount}
                  onChange={(e) => setLikeCount(e.target.value)}
                  min="10"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="10"
                />
              </div>
            </div>
          )}

          {/* 인스타그램 팔로워 입력 필드 */}
          {taskType === 'follower' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="instagramNickname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  작업할 인스타 닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  id="instagramNickname"
                  type="text"
                  value={instagramNickname}
                  onChange={(e) => setInstagramNickname(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: incom_seoul"
                />
              </div>
              <div>
                <label
                  htmlFor="followerCount"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  팔로워 갯수 <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 ml-2">(최소 50개 이상)</span>
                </label>
                <input
                  id="followerCount"
                  type="number"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                  min="50"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="50"
                />
              </div>
            </div>
          )}

          {/* 인기게시물 입력 필드 */}
          {taskType === 'hotpost' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="hotpostNickname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  인스타그램 닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  id="hotpostNickname"
                  type="text"
                  value={hotpostNickname}
                  onChange={(e) => setHotpostNickname(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: incom_seoul"
                />
              </div>
              <div>
                <label
                  htmlFor="mainHashtag"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  메인해시태그 <span className="text-red-500">*</span>
                </label>
                <input
                  id="mainHashtag"
                  type="text"
                  value={mainHashtag}
                  onChange={(e) => setMainHashtag(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: 김포맛집"
                />
              </div>
              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  상호명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: 인플루언서컴퍼니"
                />
              </div>
            </div>
          )}

          {/* 맘카페 입력 필드 */}
          {taskType === 'momcafe' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="momcafeBusinessName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  상호명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="momcafeBusinessName"
                  type="text"
                  value={momcafeBusinessName}
                  onChange={(e) => setMomcafeBusinessName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="상호명을 입력하세요"
                />
              </div>
              <div>
                <label
                  htmlFor="momcafeCafeName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  원하시는 카페이름 or 주소 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <input
                  id="momcafeCafeName"
                  type="text"
                  value={momcafeCafeName}
                  onChange={(e) => setMomcafeCafeName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="카페이름 또는 주소를 입력하세요 (미기재 시 추천 카페로 작업)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  미기재 시 추천 카페로 작업됩니다
                </p>
              </div>
              <div>
                <label
                  htmlFor="momcafePlaceLink"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  플레이스 링크 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <input
                  id="momcafePlaceLink"
                  type="url"
                  value={momcafePlaceLink}
                  onChange={(e) => setMomcafePlaceLink(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="플레이스 링크를 입력하세요 (예: https://place.map.kakao.com/...)"
                />
              </div>
              <div>
                <label
                  htmlFor="momcafePostGuideline"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  게시글 가이드라인 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <textarea
                  id="momcafePostGuideline"
                  value={momcafePostGuideline}
                  onChange={(e) => setMomcafePostGuideline(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="게시글 가이드라인을 입력하세요 (공란 시 임의로 작업)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  공란으로 비워두시면 임의로 작업드리고 있습니다
                </p>
              </div>
              <div>
                <label
                  htmlFor="momcafeCommentGuideline"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  댓글 가이드라인 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <textarea
                  id="momcafeCommentGuideline"
                  value={momcafeCommentGuideline}
                  onChange={(e) => setMomcafeCommentGuideline(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="댓글 가이드라인을 입력하세요 (공란 시 임의로 작업)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  공란으로 비워두시면 임의로 작업드리고 있습니다
                </p>
              </div>
            </div>
          )}


          {/* 당근마켓 입력 필드 */}
          {taskType === 'daangn' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="daangnBusinessProfile"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  당근 비지니스 프로필 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  id="daangnBusinessProfile"
                  type="url"
                  value={daangnBusinessProfile}
                  onChange={(e) => setDaangnBusinessProfile(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="https://www.daangn.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 <span className="text-red-500">*</span>
                </label>
                <ImageUpload 
                  images={images} 
                  onImagesChange={setImages}
                  maxImages={1}
                />
              </div>
            </div>
          )}

          {/* 당근마켓 유의사항 */}
          {taskType === 'daangn' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ 유의사항
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>당근 비지니스 프로필 주소를 정확히 입력해주세요.</li>
                <li>사진 1장을 업로드해주세요.</li>
              </ul>
            </div>
          )}

          {/* 체험단 신청 입력 필드 */}
          {taskType === 'experience' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="experienceCompanyName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  상호명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="experienceCompanyName"
                  type="text"
                  value={experienceCompanyName}
                  onChange={(e) => setExperienceCompanyName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="상호명을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="experiencePlace"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  플레이스 <span className="text-red-500">*</span>
                </label>
                <input
                  id="experiencePlace"
                  type="text"
                  value={experiencePlace}
                  onChange={(e) => setExperiencePlace(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="플레이스명을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="experienceReservationPhone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  예약 조율 가능한 번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="experienceReservationPhone"
                  type="tel"
                  value={experienceReservationPhone}
                  onChange={(e) => setExperienceReservationPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: 010-1234-5678"
                />
              </div>

              <div>
                <label
                  htmlFor="experienceDesiredParticipants"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  희망모집인원 <span className="text-red-500">*</span>
                </label>
                <input
                  id="experienceDesiredParticipants"
                  type="number"
                  min="1"
                  value={experienceDesiredParticipants}
                  onChange={(e) => setExperienceDesiredParticipants(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: 10"
                />
              </div>

              <div>
                <label
                  htmlFor="experienceProvidedDetails"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  제공내역 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="experienceProvidedDetails"
                  value={experienceProvidedDetails}
                  onChange={(e) => setExperienceProvidedDetails(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="체험단에게 제공할 내역을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="experienceKeywords"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  키워드 <span className="text-red-500">*</span>
                </label>
                <input
                  id="experienceKeywords"
                  type="text"
                  value={experienceKeywords}
                  onChange={(e) => setExperienceKeywords(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="예: 맛집, 데이트, 카페"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={experienceBlogMissionRequired}
                    onChange={(e) => setExperienceBlogMissionRequired(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    블로그미션 부가유무
                  </span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="experienceAdditionalNotes"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  기타전달사항
                </label>
                <textarea
                  id="experienceAdditionalNotes"
                  value={experienceAdditionalNotes}
                  onChange={(e) => setExperienceAdditionalNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="기타 전달사항을 입력하세요 (선택사항)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  캠페인 대표사진 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <ImageUpload 
                  images={images} 
                  onImagesChange={setImages}
                  maxImages={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  캠페인 대표사진 3-5장을 업로드해주세요
                </p>
              </div>
            </div>
          )}

          {/* 체험단 유의사항 */}
          {taskType === 'experience' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ 유의사항
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>캠페인 대표사진 3-5장을 넣어주세요.</li>
                <li>체험단 신청 후 검토 과정을 거쳐 승인됩니다.</li>
                <li>승인 후 체험단 모집이 시작됩니다.</li>
              </ul>
            </div>
          )}

          {/* Image Upload - hotpost는 필수, momcafe는 선택 */}
          {(taskType === 'hotpost' || taskType === 'momcafe') && (
            <ImageUpload 
              images={images} 
              onImagesChange={setImages}
              maxImages={taskType === 'hotpost' ? 1 : 4}
            />
          )}

          {/* 인기게시물 유의사항 */}
          {taskType === 'hotpost' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                ⚠️ 유의사항
              </h3>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>인기게시물 작업 시 게시글 수정은 불가능 하오니 신중히 작성 부탁드립니다.</li>
                <li>1:1 비율의 사진 1장 필수입니다.</li>
              </ul>
            </div>
          )}

          {/* 맘카페 유의사항 */}
          {taskType === 'momcafe' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ 유의사항
              </h3>
              
              <div className="text-sm text-yellow-800 space-y-2">
                <div>
                  <p className="font-medium mb-1">• [게시글1+댓글1] 한세트 작업입니다</p>
                  <p className="text-xs text-yellow-700 ml-2">• 공란으로 비워두시면 임의로 작업드리고 있습니다</p>
                  <p className="text-xs text-yellow-700 ml-2">• 작업 기간은 영업일 기준 3-14일 소요되고 작업 상황이나 특이사항에 따라 변동이 있습니다</p>
                </div>
                
                <div className="border-t border-yellow-300 pt-2">
                  <p className="font-medium mb-1">📌 추가 안내사항:</p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside ml-2">
                    <li>닉네임 지정, 게시판 지정이 필요한 경우 꼭 가이드에 기재 부탁드립니다</li>
                    <li>카페 규정에 따라 광고성으로 분류될 경우, Q&A로 작업드립니다</li>
                    <li>카페 규정/등업 조건에 따라 작업이 불가한 카페가 있으므로 규정 확인 후 작업드립니다 (쪽지전달/간접 언급/상호 언급불가등)</li>
                    <li>2번 항목 미기재 시 추천 카페로 작업드립니다</li>
                    <li>작업일 기준 24시간내에 삭제 시 다른 카페로 1회 AS가능합니다</li>
                    <li>게시글 작업을 추천댓글 작업 2회로 대체하여 작업 가능합니다</li>
                  </ul>
                </div>

                <div className="border-t border-yellow-300 pt-2">
                  <p className="font-medium mb-1 text-red-700">❌ 작업 불가카페 예시:</p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside ml-2">
                    <li>아이 사진, 지역 사진, 여성 인증이 필요한 카페</li>
                    <li>매니저 1:1 대화 후 인증이 필요한 카페</li>
                    <li>앱설치, 구매내역 인증등 등업조건에 비용이 발생하는 카페</li>
                    <li>작업 소요가 큰 카페 (방문자, 게시글, 댓글등)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 인스타그램 통합 유의사항 */}
          {taskType === 'instagram' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ 공통 유의사항
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>좋아요/팔로워 작업은 이탈 현상이 발생할 수 있습니다.</li>
                <li>최초 1회 AS 작업 가능하며, 이탈 현상 발생 시 카카오톡방으로 말씀주시면 1회 재작업 드리도록 하겠습니다.</li>
                <li>팔로워와 좋아요는 통합 쿼터로 관리되며, 합계 1000개 내에서 사용 가능합니다.</li>
                <li>이점 참고하시어 작업 신청 부탁드립니다.</li>
              </ul>
            </div>
          )}

          {/* 공통 유의사항 (좋아요/팔로워 - 기존, 호환성 유지) */}
          {(taskType === 'like' || taskType === 'follower') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ 공통 유의사항
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>좋아요/팔로워 작업은 이탈 현상이 발생할 수 있습니다.</li>
                <li>최초 1회 AS 작업 가능하며, 이탈 현상 발생 시 카카오톡방으로 말씀주시면 1회 재작업 드리도록 하겠습니다.</li>
                <li>이점 참고하시어 작업 신청 부탁드립니다.</li>
              </ul>
            </div>
          )}

          {/* 파워블로그/클립/내돈내산 리뷰 유의사항 */}
          {(taskType === 'powerblog' || taskType === 'clip' || taskType === 'myexpense') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                ℹ️ 안내사항
              </h3>
              <p className="text-sm text-blue-700">
                신청 후 카카오톡방으로 문의해주세요.
              </p>
            </div>
          )}

          </div>
          {/* End of form section */}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !taskType}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

