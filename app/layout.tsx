import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '인플루언서컴퍼니 캠페인 발주 시스템',
  description: '광고주 캠페인 발주 관리 시스템',
  openGraph: {
    title: '인플루언서컴퍼니 캠페인 발주 시스템',
    description: '광고주 캠페인 발주 관리 시스템',
    url: 'https://influx-production.up.railway.app',
    siteName: '인플루언서컴퍼니',
    images: [
      {
        url: 'https://influx-production.up.railway.app/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '인플루언서컴퍼니 캠페인 발주 시스템',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '인플루언서컴퍼니 캠페인 발주 시스템',
    description: '광고주 캠페인 발주 관리 시스템',
    images: ['https://influx-production.up.railway.app/og-image.jpg'],
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

