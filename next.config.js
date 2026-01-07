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
    minimumCacheTTL: 60,
    // 프로덕션에서 타임아웃 문제가 지속될 경우 환경 변수로 비활성화 가능
    // DISABLE_IMAGE_OPTIMIZATION=true로 설정하면 이미지 최적화 비활성화
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === 'true',
  },
  // 경로 별칭이 제대로 작동하도록 webpack 설정
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig;

