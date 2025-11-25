import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientOrdersList from '@/components/ClientOrdersList';

export default async function ClientOrdersPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ClientOrdersList />;
}

