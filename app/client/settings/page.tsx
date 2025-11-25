import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientSettings from '@/components/ClientSettings';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ClientSettings user={session.user} />;
}

