import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrderForm from '@/components/OrderForm';

export default async function OrderPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  // 계약 만료 체크
  if (session.user.contractEndDate) {
    const endDate = new Date(session.user.contractEndDate);
    const now = new Date();
    if (endDate < now || session.user.isActive === false) {
      redirect('/client');
    }
  }

  // 작업별 quota 체크 (새 시스템 우선)
  if (session.user.quota) {
    const quota = session.user.quota;
    const hasAnyQuota = (quota.follower?.remaining || 0) > 0 ||
                        (quota.like?.remaining || 0) > 0 ||
                        (quota.hotpost?.remaining || 0) > 0 ||
                        (quota.momcafe?.remaining || 0) > 0;
    if (!hasAnyQuota) {
      redirect('/client');
    }
  } else if (!session.user.remainingQuota || session.user.remainingQuota <= 0) {
    redirect('/client');
  }

  return <OrderForm user={session.user} />;
}

