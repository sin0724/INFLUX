'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';

interface BlogReviewFormProps {
  user: any;
}

export default function BlogReviewForm({ user }: BlogReviewFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [placeLink, setPlaceLink] = useState('');
  const [keywords, setKeywords] = useState('');
  const [strengths, setStrengths] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');
  const [useSavedGuide, setUseSavedGuide] = useState(false);
  const [savedGuide, setSavedGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 사용자 정보 및 저장된 가이드 불러오기
  useEffect(() => {
    // 업체명 자동 입력
    if (user?.companyName) {
      setCompanyName(user.companyName);
    }

    const fetchUserGuide = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.blogGuide) {
            setSavedGuide(data.user.blogGuide);
            // 저장된 가이드가 있으면 자동으로 사용
            setUseSavedGuide(true);
            // 저장된 가이드 내용을 파싱하여 필드에 채우기 (업체명 제외)
            try {
              const parsed = JSON.parse(data.user.blogGuide);
              // 업체명은 user.companyName을 사용하므로 제외
              setPlaceLink(parsed.placeLink || '');
              setKeywords(parsed.keywords || '');
              setStrengths(parsed.strengths || '');
              setAdditionalRequests(parsed.additionalRequests || '');
            } catch (e) {
              // JSON 파싱 실패 시 텍스트 그대로 사용 (기존 방식)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved guide:', err);
      }
    };
    fetchUserGuide();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 필수 필드 검증
      if (!companyName.trim()) {
        setError('업체명을 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!keywords.trim()) {
        setError('블로그 작성 키워드를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!strengths.trim()) {
        setError('업장의 강점 / 원하시는 내용을 입력해주세요.');
        setLoading(false);
        return;
      }

      // 사진 최소 5장 검증 (동영상이 없을 경우)
      if (images.length < 5 && !videoUrl) {
        setError('블로그 리뷰에는 사진 자료 최소 5장이 필요합니다. (또는 동영상 업로드)');
        setLoading(false);
        return;
      }

      // 가이드 텍스트 구성
      const guideText = `[ 블로그 리뷰 가이드 ]

1. 업체명 : ${companyName}

2. 플레이스 링크 : ${placeLink || '(생략)'}

3. 블로그 작성 키워드 : ${keywords}

4. 업장의 강점 / 원하시는 내용 : ${strengths}

5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${additionalRequests || '(없음)'}`;

      const response = await fetch('/api/orders/review-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: 'blog_review',
          imageUrls: images,
          videoUrl: videoUrl,
          guideText: guideText,
          useSavedGuide: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '블로그 리뷰 신청에 실패했습니다.');
        setLoading(false);
        return;
      }

      // Success - redirect to success page
      router.push(`/client/order/success?id=${data.order.id}`);
    } catch (err) {
      setError('블로그 리뷰 신청 중 오류가 발생했습니다.');
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
          <h1 className="text-2xl font-bold text-gray-900">블로그 리뷰 신청</h1>
          <p className="text-gray-600 mt-2">가이드를 입력하고 사진 또는 동영상을 업로드해주세요</p>
        </div>

        {/* 유의사항 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📌 유의사항</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>블로그 리뷰에는 사진 자료 최소 5장이 필요합니다.</li>
            <li>플레이스 링크는 생략해주셔도 됩니다.</li>
            <li>보내주신 가이드라인 토대로 원고를 작성하여 보내드릴 예정입니다.</li>
            <li>원고 컨펌 후 블로그 수정이 어려우니 꼼꼼하게 작성 부탁드립니다.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 가이드 입력 섹션 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">블로그 리뷰 가이드</h2>

            {/* 업체명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. 업체명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                placeholder="업체명이 자동으로 입력됩니다"
                required
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">업체명은 계정 정보에서 자동으로 가져옵니다.</p>
            </div>

            {/* 플레이스 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. 플레이스 링크 <span className="text-gray-400 text-xs">(선택)</span>
              </label>
              <input
                type="url"
                value={placeLink}
                onChange={(e) => setPlaceLink(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="플레이스 링크를 입력해주세요 (생략 가능)"
              />
              <p className="text-xs text-gray-500 mt-1">플레이스 링크는 생략해주셔도 됩니다.</p>
            </div>

            {/* 블로그 작성 키워드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. 블로그 작성 키워드 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="블로그에 포함될 키워드를 입력해주세요"
                required
              />
            </div>

            {/* 업장의 강점 / 원하시는 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. 업장의 강점 / 원하시는 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="업장의 강점이나 원하시는 리뷰 내용을 입력해주세요"
                required
              />
            </div>

            {/* 추가적인 요청사항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 <span className="text-gray-400 text-xs">(선택)</span>
              </label>
              <textarea
                value={additionalRequests}
                onChange={(e) => setAdditionalRequests(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="추가적인 요청사항, 컨셉, 필수 삽입 내용 등을 입력해주세요"
              />
            </div>
          </div>

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 업로드 <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(최소 5장)</span>
            </label>
            <ImageUpload 
              images={images} 
              onImagesChange={setImages}
              maxImages={20}
            />
          </div>

          {/* 동영상 업로드 */}
          <div>
            <VideoUpload 
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

