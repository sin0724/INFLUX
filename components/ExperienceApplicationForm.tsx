'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ExperienceApplicationFormProps {
  user: {
    id: string;
    username: string;
  };
}

export default function ExperienceApplicationForm({ user }: ExperienceApplicationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    place: '',
    reservationPhone: '',
    desiredParticipants: '',
    providedDetails: '',
    keywords: '',
    blogMissionRequired: false,
    additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/experience-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '체험단 신청에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      alert('체험단 신청이 완료되었습니다.');
      router.push('/client');
    } catch (err) {
      setError('체험단 신청 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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
          <h1 className="text-2xl font-bold text-gray-900">체험단 신청</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              상호명 <span className="text-red-500">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="상호명을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-2">
              플레이스 <span className="text-red-500">*</span>
            </label>
            <input
              id="place"
              name="place"
              type="text"
              value={formData.place}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="플레이스명을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="reservationPhone" className="block text-sm font-medium text-gray-700 mb-2">
              예약 조율 가능한 번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="reservationPhone"
              name="reservationPhone"
              type="tel"
              value={formData.reservationPhone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="예: 010-1234-5678"
            />
          </div>

          <div>
            <label htmlFor="desiredParticipants" className="block text-sm font-medium text-gray-700 mb-2">
              희망모집인원 <span className="text-red-500">*</span>
            </label>
            <input
              id="desiredParticipants"
              name="desiredParticipants"
              type="number"
              min="1"
              value={formData.desiredParticipants}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="예: 10"
            />
          </div>

          <div>
            <label htmlFor="providedDetails" className="block text-sm font-medium text-gray-700 mb-2">
              제공내역 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="providedDetails"
              name="providedDetails"
              value={formData.providedDetails}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="체험단에게 제공할 내역을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              키워드 <span className="text-red-500">*</span>
            </label>
            <input
              id="keywords"
              name="keywords"
              type="text"
              value={formData.keywords}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="예: 맛집, 데이트, 카페"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="blogMissionRequired"
                checked={formData.blogMissionRequired}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                블로그미션 부가유무
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
              기타전달사항
            </label>
            <textarea
              id="additionalNotes"
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="기타 전달사항을 입력하세요 (선택사항)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

