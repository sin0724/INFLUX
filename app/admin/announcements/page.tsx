import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AnnouncementManagement from '@/components/AnnouncementManagement';

export default async function AnnouncementsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
    redirect('/client');
  }

  return <AnnouncementManagement />;
}

