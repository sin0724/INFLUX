import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientsManagement from '@/components/ClientsManagement';

export default async function ClientsPage() {
  const session = await getSession();

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect('/login');
  }

  return <ClientsManagement />;
}

