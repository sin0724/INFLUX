'use client';

import { useState } from 'react';

interface FileUploadProps {
  fileUrl: string | null;
  fileName?: string | null;
  onFileChange: (url: string | null, fileName?: string | null) => void;
  label?: string;
  accept?: string;
}

export default function FileUpload({
  fileUrl,
  fileName,
  onFileChange,
  label = '파일 업로드',
  accept = '*/*',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = '업로드 실패';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          errorMessage = `업로드 실패 (상태 코드: ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('업로드된 파일 URL을 받지 못했습니다.');
      }
      onFileChange(data.url, file.name);
    } catch (err: any) {
      setError(err.message || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeFile = () => {
    onFileChange(null, null);
  };

  const getFileName = (url: string) => {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1] || '파일';
    } catch {
      return '파일';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-gray-600">파일 업로드 중...</div>
      )}

      {fileUrl && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900">{fileName || getFileName(fileUrl)}</div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                파일 보기
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
