'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GuideManagePageProps {
  user: any;
}

export default function GuideManagePage({ user }: GuideManagePageProps) {
  const router = useRouter();
  const [blogGuide, setBlogGuide] = useState('');
  const [receiptGuide, setReceiptGuide] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 저장된 가이드 불러오기
  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setBlogGuide(data.user.blogGuide || '');
            setReceiptGuide(data.user.receiptGuide || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch guides:', err);
        setError('가이드를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/guides', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogGuide: blogGuide.trim() || null,
          receiptGuide: receiptGuide.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '가이드 저장에 실패했습니다.');
        setSaving(false);
        return;
      }

      setSuccess('가이드가 성공적으로 저장되었습니다.');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      setError('가이드 저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">고정 가이드 관리</h1>
          <p className="text-gray-600 mt-2">리뷰 신청 시 사용할 고정 가이드를 설정할 수 있습니다</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* 블로그 리뷰 가이드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">블로그 리뷰 가이드</h2>
            <textarea
              value={blogGuide}
              onChange={(e) => setBlogGuide(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              placeholder="블로그 리뷰 신청 시 사용할 고정 가이드를 입력하세요..."
            />
            <p className="text-xs text-gray-500 mt-2">
              리뷰 신청 시 이 가이드를 사용하거나, 매번 다른 가이드를 업로드할 수 있습니다.
            </p>
          </div>

          {/* 영수증 리뷰 가이드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">영수증 리뷰 가이드</h2>
            <textarea
              value={receiptGuide}
              onChange={(e) => setReceiptGuide(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              placeholder="영수증 리뷰 신청 시 사용할 고정 가이드를 입력하세요..."
            />
            <p className="text-xs text-gray-500 mt-2">
              리뷰 신청 시 이 가이드를 사용하거나, 매번 다른 가이드를 업로드할 수 있습니다.
            </p>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

