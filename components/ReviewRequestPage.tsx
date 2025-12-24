'use client';

import { useRouter } from 'next/navigation';

interface ReviewRequestPageProps {
  user: any;
}

const REVIEW_TYPES = [
  {
    id: 'blog_review',
    name: '블로그 리뷰 신청',
    description: '블로그 리뷰를 신청합니다. 사진과 가이드를 업로드해주세요.',
    icon: '📝',
    path: '/client/review-request/blog',
  },
  {
    id: 'receipt_review',
    name: '영수증 리뷰 신청',
    description: '영수증 리뷰를 신청합니다. 사진과 가이드를 업로드해주세요.',
    icon: '🧾',
    path: '/client/review-request/receipt',
  },
];

export default function ReviewRequestPage({ user }: ReviewRequestPageProps) {
  const router = useRouter();

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
          <h1 className="text-2xl font-bold text-gray-900">리뷰 신청</h1>
          <p className="text-gray-600 mt-2">리뷰 종류를 선택해주세요</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REVIEW_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => router.push(type.path)}
              className="p-6 border-2 border-gray-200 rounded-xl text-left hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="text-3xl mb-3">{type.icon}</div>
              <div className="font-semibold text-gray-900 mb-2">{type.name}</div>
              <div className="text-sm text-gray-600">{type.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

