import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
// import ReviewOrdersManagement from '@/components/ReviewOrdersManagement';

export default async function AdminReviewOrdersPage() {
  const session = await getSession();

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">리뷰 발주 내역 관리</h1>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600">리뷰 발주 관리 기능이 일시적으로 비활성화되었습니다.</p>
        </div>
      </div>
    </div>
  );
  // return <ReviewOrdersManagement />;
}

