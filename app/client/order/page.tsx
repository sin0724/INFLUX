import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrderForm from '@/components/OrderForm';

export default async function OrderPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  // 1개월 플랜 체크 먼저 수행 (가장 우선)
  // 1개월 플랜 = quota가 없거나 모든 quota의 total이 0인 경우
  // 또는 totalQuota와 remainingQuota가 모두 0인 경우도 1개월 플랜으로 간주
  const quota = session.user.quota;
  const isOneMonthPlan = (
    // 조건 1: quota가 없거나 모든 quota의 total이 0
    (!quota || (
      (quota.follower?.total || 0) === 0 &&
      (quota.like?.total || 0) === 0 &&
      (quota.hotpost?.total || 0) === 0 &&
      (quota.momcafe?.total || 0) === 0 &&
      (quota.blog?.total || 0) === 0 &&
      (quota.receipt?.total || 0) === 0 &&
      (quota.daangn?.total || 0) === 0 &&
      (quota.experience?.total || 0) === 0 &&
      (quota.powerblog?.total || 0) === 0
    ))
    // 조건 2: totalQuota와 remainingQuota가 모두 0 (하위 호환성)
    || ((session.user.totalQuota === 0 || !session.user.totalQuota) && 
        (session.user.remainingQuota === 0 || !session.user.remainingQuota))
  );
  
  // 1개월 플랜은 모든 체크를 우회하고 바로 접근 허용 (수기 입력이므로)
  if (isOneMonthPlan) {
    return <OrderForm user={session.user} />;
  }
  
  // 1개월 플랜이 아닌 경우에만 계약 만료 체크
  if (session.user.contractEndDate) {
    const endDate = new Date(session.user.contractEndDate);
    const now = new Date();
    if (endDate < now || session.user.isActive === false) {
      redirect('/client');
    }
  }
  
  // 1개월 플랜이 아닌 경우 quota 체크
  if (quota) {
    // remaining이 하나라도 0보다 크면 접근 허용
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
    // quota도 없고 remainingQuota도 0이면 접근 불가
    // 하지만 1개월 플랜은 이미 위에서 처리되었으므로 여기 도달하면 안 됨
    redirect('/client');
  }

  return <OrderForm user={session.user} />;
}

