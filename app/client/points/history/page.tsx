import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PointChargeHistoryClient from './page-client';

export default async function PointChargeHistoryPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'client') {
    redirect('/client');
  }

  return <PointChargeHistoryClient />;
}

