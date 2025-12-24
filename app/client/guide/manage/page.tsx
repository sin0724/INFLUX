import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import GuideManagePage from '@/components/GuideManagePage';

export default async function Page() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <GuideManagePage user={session.user} />;
}

