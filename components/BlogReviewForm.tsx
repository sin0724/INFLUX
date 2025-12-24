'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';

interface BlogReviewFormProps {
  user: any;
}

// JSON 형식의 가이드를 읽기 쉬운 텍스트 형식으로 변환하는 헬퍼 함수
const formatGuideText = (jsonGuide: string, companyName: string): string => {
  try {
    const parsed = JSON.parse(jsonGuide);
    return `[ 블로그 리뷰 가이드 ]

1. 업체명 : ${companyName}

2. 플레이스 링크 : ${parsed.placeLink || '(생략)'}

3. 블로그 작성 키워드 : ${parsed.keywords || ''}

4. 업장의 강점 / 원하시는 내용 : ${parsed.strengths || ''}

5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${parsed.additionalRequests || '(없음)'}`;
  } catch (e) {
    return jsonGuide;
  }
};

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
  const [savingGuide, setSavingGuide] = useState(false);

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
            // 저장된 가이드가 있으면 자동으로 사용하도록 제안 (기본값은 false로 두고 사용자가 선택)
            // 저장된 가이드 내용을 파싱하여 필드에 채우기 (업체명 제외)
            try {
              const guideText = data.user.blogGuide;
              
              // JSON 형식인 경우 (하위 호환성)
              if (guideText.trim().startsWith('{')) {
                const parsed = JSON.parse(guideText);
                setPlaceLink(parsed.placeLink || '');
                setKeywords(parsed.keywords || '');
                setStrengths(parsed.strengths || '');
                setAdditionalRequests(parsed.additionalRequests || '');
              } else {
                // 텍스트 형식인 경우 파싱하여 필드에 채우기
                const lines = guideText.split('\n');
                for (const line of lines) {
                  if (line.includes('플레이스 링크 :')) {
                    const match = line.match(/플레이스 링크 :\s*(.+)/);
                    if (match && match[1] && match[1] !== '(생략)') {
                      setPlaceLink(match[1].trim());
                    }
                  } else if (line.includes('블로그 작성 키워드 :')) {
                    const match = line.match(/블로그 작성 키워드 :\s*(.+)/);
                    if (match && match[1]) {
                      setKeywords(match[1].trim());
                    }
                  } else if (line.includes('업장의 강점 / 원하시는 내용 :')) {
                    const match = line.match(/업장의 강점 \/ 원하시는 내용 :\s*(.+)/);
                    if (match && match[1]) {
                      setStrengths(match[1].trim());
                    }
                  } else if (line.includes('추가적인 요청사항')) {
                    const match = line.match(/추가적인 요청사항[^:]*:\s*(.+)/);
                    if (match && match[1] && match[1] !== '(없음)') {
                      setAdditionalRequests(match[1].trim());
                    }
                  }
                }
              }
            } catch (e) {
              // 파싱 실패 시 필드 초기화 (사용자가 직접 입력하도록)
              console.error('Failed to parse saved guide:', e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved guide:', err);
      }
    };
    fetchUserGuide();
  }, [user]);

  const handleSaveCurrentGuide = async () => {
    // 현재 입력한 내용을 읽기 쉬운 텍스트 형식으로 저장
    const guideText = `[ 블로그 리뷰 가이드 ]

1. 업체명 : (자동 입력)

2. 플레이스 링크 : ${placeLink || '(생략)'}

3. 블로그 작성 키워드 : ${keywords}

4. 업장의 강점 / 원하시는 내용 : ${strengths}

5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${additionalRequests || '(없음)'}`;
    
    setSavingGuide(true);
    try {
      const response = await fetch('/api/users/guides', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogGuide: guideText,
        }),
      });

      if (response.ok) {
        setSavedGuide(guideText);
        alert('고정 가이드가 저장되었습니다. 다음부터는 저장된 가이드를 사용할 수 있습니다.');
      } else {
        const data = await response.json();
        alert(data.error || '가이드 저장에 실패했습니다.');
      }
    } catch (err) {
      alert('가이드 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingGuide(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 필수 필드 검증 (저장된 가이드 사용하지 않는 경우에만)
      if (!useSavedGuide) {
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
      } else if (!savedGuide) {
        setError('저장된 가이드가 없습니다. 직접 입력해주세요.');
        setLoading(false);
        return;
      }

      // 사진 검증 제거 (선택 사항으로 변경)

      // 가이드 텍스트 구성 (저장된 가이드 사용 여부에 따라)
      let guideText: string | null = null;
      
      if (useSavedGuide && savedGuide) {
        // 저장된 가이드 사용 (JSON 형식이면 변환)
        if (savedGuide.trim().startsWith('{')) {
          guideText = formatGuideText(savedGuide, companyName);
        } else {
          // 텍스트 형식이면 업체명만 교체
          guideText = savedGuide.replace(/업체명 : \(자동 입력\)/g, `업체명 : ${companyName}`);
        }
      } else {
        // 현재 입력한 내용으로 가이드 구성
        guideText = `[ 블로그 리뷰 가이드 ]

1. 업체명 : ${companyName}

2. 플레이스 링크 : ${placeLink || '(생략)'}

3. 블로그 작성 키워드 : ${keywords}

4. 업장의 강점 / 원하시는 내용 : ${strengths}

5. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${additionalRequests || '(없음)'}`;
      }

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
          useSavedGuide: useSavedGuide && savedGuide ? true : false,
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
            <li>블로그 리뷰에는 사진 자료 최소 4장 이상 권장됩니다. (선택 사항)</li>
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

          {/* 저장된 가이드 사용 옵션 */}
          {savedGuide && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useSavedGuide"
                    checked={useSavedGuide}
                    onChange={(e) => setUseSavedGuide(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <label htmlFor="useSavedGuide" className="ml-2 text-sm text-gray-700">
                    저장된 가이드 사용
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/client/guide/manage')}
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  가이드 관리
                </button>
              </div>
            </div>
          )}

          {/* 가이드 입력 섹션 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">블로그 리뷰 가이드</h2>
              {!useSavedGuide && (
                <button
                  type="button"
                  onClick={handleSaveCurrentGuide}
                  disabled={savingGuide || !keywords.trim() || !strengths.trim()}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {savingGuide ? '저장 중...' : '현재 내용을 고정 가이드로 저장'}
                </button>
              )}
            </div>

            {useSavedGuide && savedGuide ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">저장된 가이드를 사용합니다.</p>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{savedGuide}</div>
                <button
                  type="button"
                  onClick={() => setUseSavedGuide(false)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700"
                >
                  직접 입력하기
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 업로드 <span className="text-gray-400 text-xs">(선택, 권장 4장 이상)</span>
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

