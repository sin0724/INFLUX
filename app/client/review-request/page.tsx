import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ReviewRequestPage from '@/components/ReviewRequestPage';

export default async function Page() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ReviewRequestPage user={session.user} />;
}

