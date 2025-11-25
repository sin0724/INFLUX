import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role === 'admin' || session.user.role === 'superadmin') {
    redirect('/admin');
  } else {
    redirect('/client');
  }
}

