/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // 경로 별칭이 제대로 작동하도록 설정
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;

