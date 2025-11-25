import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INFLUX 캠페인 발주 시스템',
  description: '광고주 캠페인 발주 관리 시스템',
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

