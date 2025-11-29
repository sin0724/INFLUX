import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ExperienceApplicationForm from '@/components/ExperienceApplicationForm';

export default async function ExperienceApplicationPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ExperienceApplicationForm user={session.user} />;
}

