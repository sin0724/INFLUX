import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrderForm from '@/components/OrderForm';

export default async function OrderPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  // 계약 만료 체크 (1개월 플랜은 계약 만료일이 없을 수 있으므로 체크)
  // 1개월 플랜 체크 먼저 수행
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
  
  // 계약 만료 체크 (1개월 플랜이 아닌 경우만)
  if (!isOneMonthPlan && session.user.contractEndDate) {
    const endDate = new Date(session.user.contractEndDate);
    const now = new Date();
    if (endDate < now || session.user.isActive === false) {
      redirect('/client');
    }
  }

  // 1개월 플랜은 quota 체크를 우회 (수기 입력이므로 모든 작업 가능) - 바로 접근 허용
  if (isOneMonthPlan) {
    // 1개월 플랜은 모든 작업 가능하므로 바로 OrderForm 표시
    return <OrderForm user={session.user} />;
  }
  
  // 1개월 플랜이 아닌 경우 quota 체크
  if (quota) {
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
  } else if (!session.user.remainingQuota || session.user.remainingQuota <= 0) {
    // quota도 없고 remainingQuota도 없으면 접근 불가
    redirect('/client');
  }

  return <OrderForm user={session.user} />;
}

