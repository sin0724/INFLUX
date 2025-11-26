import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PointChargePageClient from './page-client';

export default async function PointChargePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'client') {
    redirect('/client');
  }

  return <PointChargePageClient />;
}

