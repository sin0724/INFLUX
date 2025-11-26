import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChecklistManagement from '@/components/ChecklistManagement';

export default async function ChecklistPage() {
  const session = await getSession();

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect('/login');
  }

  return <ChecklistManagement />;
}
