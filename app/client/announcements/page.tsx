import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientAnnouncements from '@/components/ClientAnnouncements';

export default async function AnnouncementsPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ClientAnnouncements />;
}

