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
  // 1개월 플랜 체크: quota가 없거나 모든 quota가 0이면 1개월 플랜(기획상품)으로 간주
  const quota = session.user.quota;
  const isOneMonthPlan = !quota || (
    (quota.follower?.total || 0) === 0 &&
    (quota.like?.total || 0) === 0 &&
    (quota.hotpost?.total || 0) === 0 &&
    (quota.momcafe?.total || 0) === 0 &&
    (quota.blog?.total || 0) === 0 &&
    (quota.receipt?.total || 0) === 0 &&
    (quota.daangn?.total || 0) === 0 &&
    (quota.experience?.total || 0) === 0 &&
    (quota.powerblog?.total || 0) === 0
  );
  
  // 1개월 플랜은 quota 체크를 우회 (수기 입력이므로 모든 작업 가능)
  if (!isOneMonthPlan && quota) {
    const hasAnyQuota = (quota.follower?.remaining || 0) > 0 ||
                        (quota.like?.remaining || 0) > 0 ||
                        (quota.hotpost?.remaining || 0) > 0 ||
                        (quota.momcafe?.remaining || 0) > 0 ||
                        (quota.daangn?.remaining || 0) > 0 ||
                        (quota.experience?.remaining || 0) > 0 ||
                        (quota.powerblog?.remaining || 0) > 0;
    if (!hasAnyQuota) {
      redirect('/client');
    }
  } else if (!quota && (!session.user.remainingQuota || session.user.remainingQuota <= 0)) {
    // quota도 없고 remainingQuota도 없으면 접근 불가 (1개월 플랜은 quota가 0이지만 존재해야 함)
    redirect('/client');
  }

  return <OrderForm user={session.user} />;
}

