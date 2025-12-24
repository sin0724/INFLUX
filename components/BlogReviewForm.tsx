'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';
import FileUpload from './FileUpload';

interface BlogReviewFormProps {
  user: any;
}

export default function BlogReviewForm({ user }: BlogReviewFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [guideFileUrl, setGuideFileUrl] = useState<string | null>(null);
  const [guideFileName, setGuideFileName] = useState<string | null>(null);
  const [useSavedGuide, setUseSavedGuide] = useState(false);
  const [savedGuide, setSavedGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 저장된 가이드 불러오기
  useEffect(() => {
    const fetchUserGuide = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.blogGuide) {
            setSavedGuide(data.user.blogGuide);
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved guide:', err);
      }
    };
    fetchUserGuide();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 사진 또는 동영상 중 하나는 필수
      if (images.length === 0 && !videoUrl) {
        setError('사진 또는 동영상 중 하나는 업로드해주세요.');
        setLoading(false);
        return;
      }

      // 가이드 필수 (저장된 가이드 사용 또는 파일 업로드)
      if (!useSavedGuide && !guideFileUrl) {
        setError('가이드를 업로드하거나 저장된 가이드를 사용해주세요.');
        setLoading(false);
        return;
      }

      if (useSavedGuide && !savedGuide) {
        setError('저장된 가이드가 없습니다. 가이드 파일을 업로드해주세요.');
        setLoading(false);
        return;
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
          guideFileUrl: useSavedGuide ? null : guideFileUrl,
          useSavedGuide: useSavedGuide,
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
          <p className="text-gray-600 mt-2">사진 또는 동영상과 가이드를 업로드해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 업로드 (선택)
            </label>
            <ImageUpload 
              images={images} 
              onImagesChange={setImages}
              maxImages={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              사진과 동영상 중 하나는 반드시 업로드해주세요.
            </p>
          </div>

          {/* 동영상 업로드 */}
          <div>
            <VideoUpload 
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
            />
            <p className="text-xs text-gray-500 mt-1">
              사진과 동영상 중 하나는 반드시 업로드해주세요.
            </p>
          </div>

          {/* 가이드 선택 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가이드 <span className="text-red-500">*</span>
            </label>

            {/* 저장된 가이드 사용 옵션 */}
            {savedGuide && (
              <div className="flex items-center">
                <input
                  type="radio"
                  id="useSavedGuide"
                  name="guideType"
                  checked={useSavedGuide}
                  onChange={() => setUseSavedGuide(true)}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="useSavedGuide" className="ml-2 text-sm text-gray-700">
                  저장된 가이드 사용
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
            )}

            {/* 새 가이드 파일 업로드 */}
            <div className="flex items-center">
              <input
                type="radio"
                id="uploadNewGuide"
                name="guideType"
                checked={!useSavedGuide}
                onChange={() => setUseSavedGuide(false)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="uploadNewGuide" className="ml-2 text-sm text-gray-700">
                새 가이드 파일 업로드
              </label>
            </div>

            {!useSavedGuide && (
              <FileUpload
                fileUrl={guideFileUrl}
                fileName={guideFileName || null}
                onFileChange={(url, fileName) => {
                  setGuideFileUrl(url);
                  setGuideFileName(fileName || null);
                }}
                label="가이드 파일"
                accept="*/*"
              />
            )}
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

