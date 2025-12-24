import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import BlogReviewForm from '@/components/BlogReviewForm';

export default async function BlogReviewPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return <BlogReviewForm user={session.user} />;
}

