'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
  created_at: string;
  expires_at: string | null;
}

export default function ClientAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        // 우선순위와 생성일 기준으로 정렬
        const sorted = (data.announcements || []).sort((a: Announcement, b: Announcement) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setAnnouncements(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '높음';
      case 'low':
        return '낮음';
      default:
        return '보통';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <a
            href="/client"
            className="text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← 뒤로가기
          </a>
          <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
          <p className="text-sm text-gray-600 mt-1">
            중요한 공지사항을 확인하세요
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-gray-600">현재 활성화된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedAnnouncement(announcement)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {announcement.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                          announcement.priority
                        )}`}
                      >
                        {getPriorityLabel(announcement.priority)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(announcement.created_at)}
                      {announcement.expires_at && (
                        <span className="ml-2">
                          • 만료: {formatDateTime(announcement.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-gray-700 line-clamp-2">
                  {announcement.content}
                </div>
                <div className="mt-3 text-sm text-primary-600 font-medium">
                  자세히 보기 →
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 상세 모달 */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">공지사항</h2>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedAnnouncement.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                        selectedAnnouncement.priority
                      )}`}
                    >
                      {getPriorityLabel(selectedAnnouncement.priority)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    {formatDateTime(selectedAnnouncement.created_at)}
                    {selectedAnnouncement.expires_at && (
                      <span className="ml-2">
                        • 만료: {formatDateTime(selectedAnnouncement.expires_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedAnnouncement.content}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

