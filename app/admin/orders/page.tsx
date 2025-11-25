import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrdersManagement from '@/components/OrdersManagement';

export default async function AdminOrdersPage() {
  const session = await getSession();

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect('/login');
  }

  return <OrdersManagement />;
}

