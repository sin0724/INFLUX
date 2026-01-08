const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // 정적 이미지 최적화 설정
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 캐시 TTL 설정 (초 단위) - 이미지 최적화 실패 시 재시도 간격 조정
    minimumCacheTTL: 31536000, // 1년 (최대값) - 캐시를 최대한 활용하여 재요청 감소
    // 프로덕션에서 타임아웃 문제 방지를 위해 기본적으로 이미지 최적화 비활성화
    // ENABLE_IMAGE_OPTIMIZATION=true로 설정하면 이미지 최적화 활성화
    // Supabase Storage에서 이미지를 가져올 때 타임아웃이 발생할 수 있어 기본 비활성화
    unoptimized: process.env.ENABLE_IMAGE_OPTIMIZATION !== 'true',
    // 타임아웃 관련 설정 (Next.js 내부 설정)
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // 경로 별칭이 제대로 작동하도록 webpack 설정
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  // 타임아웃 에러가 발생해도 앱이 크래시되지 않도록 설정
  onDemandEntries: {
    // 페이지를 메모리에 유지하는 시간 (초)
    maxInactiveAge: 25 * 1000,
    // 동시에 유지할 페이지 수
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

