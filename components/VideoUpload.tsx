'use client';

import { useState } from 'react';

interface VideoUploadProps {
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
}

export default function VideoUpload({
  videoUrl,
  onVideoChange,
}: VideoUploadProps) {
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

      const response = await fetch('/api/upload/video', {
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
        throw new Error('업로드된 동영상 URL을 받지 못했습니다.');
      }
      onVideoChange(data.url);
    } catch (err: any) {
      setError(err.message || '동영상 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeVideo = () => {
    onVideoChange(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          동영상 업로드 (선택)
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading || !!videoUrl}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          동영상 형식: mp4, mpeg, mov, avi, webm (최대 100MB)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-gray-600">동영상 업로드 중...</div>
      )}

      {videoUrl && (
        <div className="relative">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg border border-gray-200"
            style={{ maxHeight: '400px' }}
          />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

