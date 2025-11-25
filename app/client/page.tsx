import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientDashboard from '@/components/ClientDashboard';

export default async function ClientPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'client') {
    redirect('/admin');
  }

  // 계약 만료 체크
  if (session.user.contractEndDate) {
    const endDate = new Date(session.user.contractEndDate);
    const now = new Date();
    if (endDate < now || session.user.isActive === false) {
      // 만료된 경우 - 클라이언트에서 모달 표시하도록 user 정보 전달
    }
  }

  return <ClientDashboard user={session.user} />;
}

