import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INFLUX 캠페인 발주 시스템',
  description: '광고주 캠페인 발주 관리 시스템',
  openGraph: {
    title: 'INFLUX 캠페인 발주 시스템',
    description: '광고주 캠페인 발주 관리 시스템',
    url: 'https://influx-production.up.railway.app',
    siteName: 'INFLUX',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'INFLUX 캠페인 발주 시스템',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INFLUX 캠페인 발주 시스템',
    description: '광고주 캠페인 발주 관리 시스템',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

