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
  { 
    id: 'follower', 
    name: '인스타그램 팔로워', 
    requiresImage: false,
    minCount: 50,
    description: '최소 50개부터 작업 가능'
  },
  { 
    id: 'like', 
    name: '인스타그램 좋아요', 
    requiresImage: false,
    minCount: 10,
    description: '최소 10개부터 작업 가능'
  },
  { id: 'hotpost', name: '인스타그램 인기게시물', requiresImage: true },
  { id: 'momcafe', name: '맘카페', requiresImage: false },
  { id: 'eventbanner', name: '이벤트배너/블로그스킨', requiresImage: false, externalLink: 'https://pf.kakao.com/_UxoANn' },
  { id: 'daangn', name: '당근마켓', requiresImage: false, disabled: true, comingSoon: true },
  { id: 'powerblog', name: '파워블로그', requiresImage: false },
  { id: 'clip', name: '클립', requiresImage: false },
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

  // 사용자 quota 정보 가져오기
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.quota) {
          setUserQuota(data.user.quota);
        }
      })
      .catch(console.error);
  }, []);

  // 작업별 입력 필드
  const [postLink, setPostLink] = useState(''); // 좋아요: 게시글 링크
  const [likeCount, setLikeCount] = useState(''); // 좋아요: 좋아요 갯수
  const [instagramNickname, setInstagramNickname] = useState(''); // 팔로워: 인스타 닉네임
  const [followerCount, setFollowerCount] = useState(''); // 팔로워: 팔로워 갯수
  // 인기게시물 필드
  const [hotpostNickname, setHotpostNickname] = useState(''); // 인기게시물: 인스타 닉네임
  const [mainHashtag, setMainHashtag] = useState(''); // 인기게시물: 메인해시태그
  const [businessName, setBusinessName] = useState(''); // 인기게시물: 상호명
  // 맘카페 필드
  const [momcafeBusinessName, setMomcafeBusinessName] = useState(''); // 맘카페: 상호명
  const [momcafeCafeName, setMomcafeCafeName] = useState(''); // 맘카페: 카페이름 or 주소
  const [momcafePostGuideline, setMomcafePostGuideline] = useState(''); // 맘카페: 게시글 가이드라인
  const [momcafeCommentGuideline, setMomcafeCommentGuideline] = useState(''); // 맘카페: 댓글 가이드라인
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
      if (task.comingSoon) {
        alert('준비중입니다.');
      } else {
        alert('이 작업은 담당자를 통해 카카오톡으로 신청부탁드립니다.');
      }
      return;
    }
    
    // 작업별 quota 체크
    if (userQuota) {
      const taskQuota = userQuota[type as keyof Quota];
      if (!taskQuota || taskQuota.remaining <= 0) {
        alert('이 작업의 남은 개수가 없습니다.');
        return;
      }
    } else if (user.remainingQuota !== undefined && user.remainingQuota <= 0) {
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
    setHotpostNickname('');
    setMainHashtag('');
    setBusinessName('');
    setMomcafeBusinessName('');
    setMomcafeCafeName('');
    setMomcafePostGuideline('');
    setMomcafeCommentGuideline('');
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
    if (taskType === 'like') {
      if (!postLink.trim()) {
        setError('게시글 링크를 입력해주세요.');
        return;
      }
      const count = parseInt(likeCount);
      if (!likeCount || isNaN(count) || count < 10) {
        setError('좋아요 갯수는 최소 10개 이상이어야 합니다.');
        return;
      }
    }

    if (taskType === 'follower') {
      if (!instagramNickname.trim()) {
        setError('인스타그램 닉네임을 입력해주세요.');
        return;
      }
      const count = parseInt(followerCount);
      if (!followerCount || isNaN(count) || count < 50) {
        setError('팔로워 갯수는 최소 50개 이상이어야 합니다.');
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
    if (taskType === 'like') {
      orderCaption = `게시글 링크: ${postLink}\n좋아요 갯수: ${likeCount}`;
    } else if (taskType === 'follower') {
      orderCaption = `작업할 인스타 닉네임: ${instagramNickname}\n팔로워 갯수: ${followerCount}`;
    } else if (taskType === 'hotpost') {
      orderCaption = `인스타그램 닉네임: ${hotpostNickname}\n메인해시태그: ${mainHashtag}\n상호명: ${businessName}`;
    } else if (taskType === 'momcafe') {
      if (!momcafeBusinessName.trim()) {
        setError('상호명을 입력해주세요.');
        return;
      }
      orderCaption = `상호명: ${momcafeBusinessName}\n원하시는 카페이름 or 주소: ${momcafeCafeName || '(미기재)'}\n게시글 가이드라인: ${momcafePostGuideline || '(미기재)'}\n댓글 가이드라인: ${momcafeCommentGuideline || '(미기재)'}`;
    } else if (taskType === 'powerblog' || taskType === 'clip') {
      if (!customTaskCaption.trim()) {
        setError('작업 내용을 입력해주세요.');
        return;
      }
      orderCaption = customTaskCaption;
    } else {
      orderCaption = caption || '';
    }

    setLoading(true);

    try {
      // 신청 개수 추출 (follower, like의 경우)
      let requestCount = 1; // 기본값: hotpost, momcafe는 1개
      if (taskType === 'like') {
        requestCount = parseInt(likeCount) || 1;
      } else if (taskType === 'follower') {
        requestCount = parseInt(followerCount) || 1;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType,
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
                // 작업별 quota 체크
                let isDisabled = task.disabled;
                let remainingCount = 0;
                const hasExternalLink = !!task.externalLink;
                
                if (userQuota && !hasExternalLink) {
                  const taskQuota = userQuota[task.id as keyof Quota];
                  if (!taskQuota || taskQuota.remaining <= 0) {
                    isDisabled = true;
                  } else {
                    remainingCount = taskQuota.remaining;
                  }
                } else if (user.remainingQuota !== undefined && user.remainingQuota <= 0 && !hasExternalLink) {
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
                    {userQuota && remainingCount > 0 && (
                      <div className="text-xs text-primary-600 mt-1 font-medium">
                        남은 개수: {remainingCount}개
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
                    {task.disabled && !task.comingSoon && (
                      <div className="text-xs text-orange-600 mt-1">
                        카카오톡 신청
                      </div>
                    )}
                    {task.comingSoon && (
                      <div className="text-xs text-gray-500 mt-1">
                        준비중
                      </div>
                    )}
                    {task.externalLink && (
                      <div className="text-xs text-blue-600 mt-1">
                        카카오톡 채널로 이동
                      </div>
                    )}
                    {!task.disabled && userQuota && remainingCount === 0 && (
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
          {/* 인스타그램 좋아요 입력 필드 */}
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

          {/* 파워블로그/클립 입력 필드 */}
          {(taskType === 'powerblog' || taskType === 'clip') && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="customTaskCaption"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  작업 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="customTaskCaption"
                  value={customTaskCaption}
                  onChange={(e) => setCustomTaskCaption(e.target.value)}
                  rows={6}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="작업 내용을 상세히 입력해주세요. (가이드라인, 요구사항 등)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  담당자가 확인 후 작업을 진행합니다.
                </p>
              </div>
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

          {/* 공통 유의사항 (좋아요/팔로워) */}
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

          {/* 파워블로그/클립 유의사항 */}
          {(taskType === 'powerblog' || taskType === 'clip') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                ℹ️ 안내사항
              </h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>작업 내용을 상세히 입력해주시면 담당자가 확인 후 작업을 진행합니다.</li>
                <li>작업 완료 후 완료 링크가 입력되면 발주 목록에서 확인할 수 있습니다.</li>
                <li>사용한 개수는 발주 목록에서 확인 가능합니다.</li>
              </ul>
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

