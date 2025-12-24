'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils';

interface ReviewDraftViewerProps {
  user: any;
  orderId: string;
}

interface ReviewOrder {
  id: string;
  taskType: string;
  imageUrls: string[];
  videoUrl?: string | null;
  guideFileUrl?: string | null;
  guideText?: string | null;
  draftText?: string | null;
  revisionRequest?: string | null;
  revisionText?: string | null;
  completedLink?: string | null;
  status: string;
  createdAt: string;
}

const TASK_TYPE_NAMES: Record<string, string> = {
  blog_review: '블로그 리뷰 신청',
  receipt_review: '영수증 리뷰 신청',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '대기중',
  draft_uploaded: '원고 업로드 완료',
  draft_revised: '원고 수정완료',
  client_approved: '승인완료',
  published: '발행 완료',
};

export default function ReviewDraftViewer({ user, orderId }: ReviewDraftViewerProps) {
  const router = useRouter();
  const [order, setOrder] = useState<ReviewOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [revisionRequestText, setRevisionRequestText] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('주문을 불러올 수 없습니다.');
      }
      const data = await response.json();
      setOrder(data.order);
      setEditedText(data.order.draftText || '');
      setRevisionRequestText(data.order.revisionRequest || '');
    } catch (err: any) {
      setError(err.message || '주문을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'request_revision' | 'save_edit') => {
    if (!order) return;

    setActionLoading(true);
    setError('');

    try {
      let updateData: any = {};

      if (action === 'approve') {
        // 승인 버튼 클릭 시 승인 완료로 변경 (관리자가 발행 링크 입력 후 발행 완료 처리)
        updateData.status = 'client_approved';
      } else if (action === 'request_revision') {
        // 수정 요청 버튼 클릭 시 revision_requested 상태로 변경하고 수정 요청 사유 저장
        if (!revisionRequestText.trim()) {
          setError('수정 요청 내용을 입력해주세요.');
          setActionLoading(false);
          return;
        }
        updateData.status = 'revision_requested';
        updateData.revisionRequest = revisionRequestText;
      } else if (action === 'save_edit') {
        // 직접 수정 버튼 클릭 시 수정한 원고 저장하고 승인 완료로 변경 (자동 승인)
        if (!editedText.trim()) {
          setError('원고 내용을 입력해주세요.');
          setActionLoading(false);
          return;
        }
        updateData.revisionText = editedText;
        updateData.status = 'client_approved'; // 직접 수정한 경우 자동 승인되어 승인 완료로
        setIsEditing(false);
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '처리에 실패했습니다.');
      }

      await fetchOrder();
    } catch (err: any) {
      setError(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">주문을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const canEdit = order.status === 'draft_uploaded' || order.status === 'draft_revised';
  const showDraft = order.draftText || order.revisionText;
  const currentDraftText = order.revisionText || order.draftText || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {TASK_TYPE_NAMES[order.taskType] || order.taskType} - 원고 확인
          </h1>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'client_approved' ? 'bg-purple-100 text-purple-800' :
              order.status === 'published' ? 'bg-green-100 text-green-800' :
              order.status === 'draft_revised' ? 'bg-purple-100 text-purple-800' :
              order.status === 'revision_requested' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {STATUS_NAMES[order.status] || order.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 업로드된 사진/동영상 */}
        {(order.imageUrls.length > 0 || order.videoUrl) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">업로드된 자료</h2>
            
            {order.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {order.imageUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={url}
                      alt={`업로드된 이미지 ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {order.videoUrl && (
              <div className="mt-4">
                <video
                  src={order.videoUrl}
                  controls
                  className="w-full rounded-lg border border-gray-200"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
          </div>
        )}

        {/* 가이드 */}
        {(order.guideFileUrl || order.guideText) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">가이드</h2>
            {order.guideFileUrl ? (
              <a
                href={order.guideFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                가이드 파일 보기
              </a>
            ) : (
              <div className="text-gray-700 whitespace-pre-wrap">{order.guideText}</div>
            )}
          </div>
        )}

        {/* 원고 텍스트 */}
        {showDraft && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? '원고 수정' : '원고'}
              </h2>
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  직접 수정
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="원고 내용을 입력하세요"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(currentDraftText);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleAction('save_edit')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {currentDraftText || '원고가 아직 업로드되지 않았습니다.'}
              </div>
            )}

            {order.revisionText && order.revisionText !== order.draftText && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">수정된 원고</div>
                <div className="text-sm text-blue-800 whitespace-pre-wrap">{order.revisionText}</div>
              </div>
            )}
          </div>
        )}

        {/* 수정 요청 내용 */}
        {order.revisionRequest && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4">수정 요청 내용</h2>
            <div className="text-yellow-800 whitespace-pre-wrap">{order.revisionRequest}</div>
          </div>
        )}

        {/* 액션 버튼 */}
        {canEdit && (order.status === 'draft_uploaded' || order.status === 'draft_revised') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">수정 요청</h2>
            <textarea
              value={revisionRequestText}
              onChange={(e) => setRevisionRequestText(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none mb-4"
              placeholder="수정이 필요한 부분을 자세히 설명해주세요"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('request_revision')}
                disabled={actionLoading || !revisionRequestText.trim()}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                수정 요청
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                승인
              </button>
            </div>
          </div>
        )}

        {/* 발행 완료 상태일 때 */}
        {order.status === 'published' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="text-green-800 font-medium">발행이 완료되었습니다.</div>
            {order.completedLink && (
              <div className="mt-2">
                <a
                  href={order.completedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-800 underline"
                >
                  발행된 리뷰 보기
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

