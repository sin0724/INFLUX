import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminActivityLogs from '@/components/AdminActivityLogs';

export default async function AdminLogsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // 관리자 이상만 접근 가능
  if (session.user.role !== 'superadmin' && session.user.role !== 'admin') {
    redirect('/admin');
  }

  return <AdminActivityLogs />;
}

