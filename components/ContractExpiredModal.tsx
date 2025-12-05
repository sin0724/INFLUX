'use client';

import { formatDateSafe } from '@/lib/utils';

interface ContractExpiredModalProps {
  contractEndDate: string;
  onClose: () => void;
}

export default function ContractExpiredModal({
  contractEndDate,
  onClose,
}: ContractExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            계약이 만료되었습니다
          </h2>
          <p className="text-gray-600 mb-4">
            계약 종료일: {formatDateSafe(contractEndDate)}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            계약 갱신이 필요합니다. 관리자에게 문의해주세요.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

