import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PointChargesPageClient from './page-client';

export default async function PointChargesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
    redirect('/admin');
  }

  return <PointChargesPageClient />;
}
