import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminsManagement from '@/components/AdminsManagement';

export default async function AdminsManagementPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // 최고관리자만 접근 가능
  if (session.user.role !== 'superadmin') {
    redirect('/admin');
  }

  return <AdminsManagement />;
}

