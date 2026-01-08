import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ReviewOrdersManagement from '@/components/ReviewOrdersManagement';

export default async function AdminReviewOrdersPage() {
  const session = await getSession();

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect('/login');
  }

  return <ReviewOrdersManagement />;
}

