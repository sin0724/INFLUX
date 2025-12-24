import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ReceiptReviewForm from '@/components/ReceiptReviewForm';

export default async function ReceiptReviewPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <ReceiptReviewForm user={session.user} />;
}

