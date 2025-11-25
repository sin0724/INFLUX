'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // maxImages가 1일 때는 기존 이미지를 대체
    const filesToProcess = maxImages === 1 ? Array.from(files).slice(0, 1) : Array.from(files);

    if (maxImages > 1 && images.length + filesToProcess.length > maxImages) {
      setError(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadPromises = filesToProcess.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
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
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      // maxImages가 1이면 기존 이미지 대체, 아니면 추가
      onImagesChange(maxImages === 1 ? urls : [...images, ...urls]);
    } catch (err: any) {
      setError(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이미지 업로드 ({images.length}/{maxImages})
        </label>
        <input
          type="file"
          accept="image/*"
          multiple={maxImages > 1}
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {maxImages === 1 && (
          <p className="text-xs text-gray-500 mt-1">
            1:1 비율의 사진 1장만 업로드 가능합니다.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-gray-600">이미지 업로드 중...</div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

