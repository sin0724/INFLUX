'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';

interface ReceiptReviewFormProps {
  user: any;
}

interface ReceiptItem {
  id: string;
  images: string[];
  companyName: string;
  placeLink: string;
  reviewContent: string;
  additionalRequests: string;
}

export default function ReceiptReviewForm({ user }: ReceiptReviewFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<ReceiptItem[]>([
    { 
      id: Date.now().toString(), 
      images: [], 
      companyName: '',
      placeLink: '',
      reviewContent: '',
      additionalRequests: '',
    },
  ]);
  const [useSavedGuide, setUseSavedGuide] = useState(false);
  const [savedGuide, setSavedGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittingItems, setSubmittingItems] = useState<Set<string>>(new Set());

  // 저장된 가이드 불러오기
  useEffect(() => {
    const fetchUserGuide = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.receiptGuide) {
            setSavedGuide(data.user.receiptGuide);
            // 저장된 가이드가 있으면 자동으로 사용
            setUseSavedGuide(true);
            // 저장된 가이드 내용을 파싱하여 첫 번째 항목에 채우기 (옵션)
            try {
              // JSON 형식이 아닌 경우 텍스트 그대로 사용
            } catch (e) {
              // 파싱 실패 시 그대로 사용
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved guide:', err);
      }
    };
    fetchUserGuide();
  }, []);

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      images: [], 
      companyName: '',
      placeLink: '',
      reviewContent: '',
      additionalRequests: '',
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setError('최소 1건은 신청해야 합니다.');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ReceiptItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 각 항목 검증
      for (const item of items) {
        if (useSavedGuide) {
          // 저장된 가이드 사용 시 사진만 필수
          if (item.images.length === 0) {
            setError('각 항목마다 사진을 1장 이상 업로드해주세요.');
            setLoading(false);
            return;
          }
        } else {
          // 새 가이드 입력 시 필수 필드 검증
          if (!item.companyName.trim()) {
            setError('각 항목마다 업체명을 입력해주세요.');
            setLoading(false);
            return;
          }

          if (!item.reviewContent.trim()) {
            setError('각 항목마다 방문자 리뷰에 들어갈 내용을 입력해주세요.');
            setLoading(false);
            return;
          }

          if (item.images.length === 0) {
            setError('사진과 함께 작성을 원할 시 사진 자료를 첨부해주세요.');
            setLoading(false);
            return;
          }
        }
      }

      if (useSavedGuide && !savedGuide) {
        setError('저장된 가이드가 없습니다. 각 항목에 가이드를 입력해주세요.');
        setLoading(false);
        return;
      }

      // 각 항목을 순차적으로 제출
      const results = [];
      for (const item of items) {
        setSubmittingItems(prev => new Set(prev).add(item.id));
        
        try {
          let guideText: string | null = null;
          
          if (useSavedGuide) {
            guideText = savedGuide;
          } else {
            // 가이드 텍스트 구성
            guideText = `[ 영수증 리뷰 가이드 ]

1. 업체명 : ${item.companyName}

2. 플레이스 링크 : ${item.placeLink || '(생략)'}

3. 방문자 리뷰에 들어갈 내용 : ${item.reviewContent}

4. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 : ${item.additionalRequests || '(없음)'}`;
          }

          const response = await fetch('/api/orders/review-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskType: 'receipt_review',
              imageUrls: item.images,
              guideText: guideText,
              useSavedGuide: useSavedGuide,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '영수증 리뷰 신청에 실패했습니다.');
          }

          results.push(data);
        } catch (err: any) {
          setError(`${item.id === items[0].id ? '첫 번째' : '일부'} 항목 신청 실패: ${err.message}`);
          setSubmittingItems(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setLoading(false);
          return;
        } finally {
          setSubmittingItems(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      }

      // 모든 항목 성공 - 첫 번째 주문의 success 페이지로 이동
      if (results.length > 0) {
        router.push(`/client/order/success?id=${results[0].order.id}&count=${results.length}`);
      }
    } catch (err: any) {
      setError(err.message || '영수증 리뷰 신청 중 오류가 발생했습니다.');
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
          <h1 className="text-2xl font-bold text-gray-900">영수증 리뷰 신청</h1>
          <p className="text-gray-600 mt-2">여러 건의 영수증 리뷰를 신청할 수 있습니다</p>
        </div>

        {/* 유의사항 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📌 유의사항</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>사진 자료와 함께 작성을 원할 시 사진 자료 첨부하여 전달 부탁드립니다.</li>
            <li>플레이스 링크는 생략해주셔도 됩니다.</li>
            <li>방문자 리뷰 임의 작성으로 원할 시 컨펌 없이 계약 기간과 총수량에 맞추어 임의 발행됩니다.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 저장된 가이드 사용 옵션 (전체 공통) */}
          {savedGuide && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useSavedGuideGlobal"
                  checked={useSavedGuide}
                  onChange={(e) => setUseSavedGuide(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="useSavedGuideGlobal" className="ml-2 text-sm text-gray-700">
                  모든 항목에 저장된 가이드 사용
                </label>
                {useSavedGuide && (
                  <a
                    href="/client/guide/manage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-sm text-primary-600 hover:text-primary-700"
                  >
                    가이드 수정
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 신청 항목들 */}
          {items.map((item, index) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">항목 {index + 1}</h3>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* 가이드 입력 섹션 (저장된 가이드 사용하지 않는 경우만) */}
              {!useSavedGuide && (
                <div className="space-y-4 pb-4 border-b border-gray-200">
                  <h4 className="text-md font-medium text-gray-800">영수증 리뷰 가이드</h4>

                  {/* 업체명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. 업체명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.companyName}
                      onChange={(e) => updateItem(item.id, { companyName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="업체명을 입력해주세요"
                    />
                  </div>

                  {/* 플레이스 링크 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. 플레이스 링크 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <input
                      type="url"
                      value={item.placeLink}
                      onChange={(e) => updateItem(item.id, { placeLink: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="플레이스 링크를 입력해주세요 (생략 가능)"
                    />
                    <p className="text-xs text-gray-500 mt-1">플레이스 링크는 생략해주셔도 됩니다.</p>
                  </div>

                  {/* 방문자 리뷰에 들어갈 내용 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3. 방문자 리뷰에 들어갈 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={item.reviewContent}
                      onChange={(e) => updateItem(item.id, { reviewContent: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="방문자 리뷰에 들어갈 내용을 입력해주세요"
                    />
                  </div>

                  {/* 추가적인 요청사항 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      4. 추가적인 요청사항 & 컨셉 & 필수삽입 내용 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <textarea
                      value={item.additionalRequests}
                      onChange={(e) => updateItem(item.id, { additionalRequests: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="추가적인 요청사항, 컨셉, 필수 삽입 내용 등을 입력해주세요"
                    />
                  </div>
                </div>
              )}

              {/* 사진 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 <span className="text-red-500">*</span>
                </label>
                <ImageUpload 
                  images={item.images} 
                  onImagesChange={(urls) => updateItem(item.id, { images: urls })}
                  maxImages={20}
                />
                <p className="text-xs text-gray-500 mt-1">
                  사진 자료와 함께 작성을 원할 시 사진 자료를 첨부해주세요.
                </p>
              </div>
            </div>
          ))}

          {/* 항목 추가 버튼 */}
          <button
            type="button"
            onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition"
          >
            + 항목 추가
          </button>

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
              disabled={loading || submittingItems.size > 0}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || submittingItems.size > 0 
                ? `신청 중... (${submittingItems.size}/${items.length})` 
                : `전체 ${items.length}건 신청하기`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
