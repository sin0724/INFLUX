'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
  featuredImageIndex?: number;
  onFeaturedImageChange?: (index: number) => void;
  showFeaturedImageOption?: boolean;
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  featuredImageIndex = 0,
  onFeaturedImageChange,
  showFeaturedImageOption = false,
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
      const newImages = maxImages === 1 ? urls : [...images, ...urls];
      onImagesChange(newImages);
      
      // 첫 번째 이미지가 추가되고 대표사진이 없으면 첫 번째 이미지를 대표사진으로 설정
      if (showFeaturedImageOption && onFeaturedImageChange && images.length === 0 && newImages.length > 0) {
        onFeaturedImageChange(0);
      }
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
    
    // 삭제된 이미지가 대표사진이었고, 이미지가 남아있으면 첫 번째 이미지를 대표사진으로 설정
    if (showFeaturedImageOption && onFeaturedImageChange) {
      if (index === featuredImageIndex) {
        // 삭제된 이미지가 대표사진이었으면 첫 번째 이미지를 대표사진으로
        if (newImages.length > 0) {
          onFeaturedImageChange(0);
        }
      } else if (index < featuredImageIndex) {
        // 삭제된 이미지가 대표사진보다 앞에 있으면 인덱스 조정
        onFeaturedImageChange(featuredImageIndex - 1);
      }
    }
  };
  
  const setFeaturedImage = (index: number) => {
    if (onFeaturedImageChange) {
      onFeaturedImageChange(index);
    }
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
          {images.map((url, index) => {
            const isFeatured = showFeaturedImageOption && index === featuredImageIndex;
            return (
              <div key={index} className="relative group">
                <div 
                  className={`aspect-square relative rounded-lg overflow-hidden border-2 transition-all ${
                    isFeatured 
                      ? 'border-primary-500 ring-2 ring-primary-200' 
                      : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {isFeatured && (
                    <div className="absolute top-2 left-2 bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      대표사진
                    </div>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {showFeaturedImageOption && (
                    <button
                      type="button"
                      onClick={() => setFeaturedImage(index)}
                      className={`rounded-full w-7 h-7 flex items-center justify-center transition-opacity ${
                        isFeatured 
                          ? 'bg-primary-500 text-white opacity-100' 
                          : 'bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100'
                      }`}
                      title="대표사진으로 지정"
                    >
                      {isFeatured ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

