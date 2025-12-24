import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ReviewDraftViewer from '@/components/ReviewDraftViewer';

export default async function ReviewDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ReviewDraftViewer user={session.user} orderId={id} />;
}

