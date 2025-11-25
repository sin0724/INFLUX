import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
    redirect('/client');
  }

  return <AdminDashboard user={session.user} />;
}

