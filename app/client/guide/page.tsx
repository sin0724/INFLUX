import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function GuidePage() {
  const session = await getSession();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <a
            href="/client"
            className="text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← 뒤로가기
          </a>
          <h1 className="text-2xl font-bold text-gray-900">가이드</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              작업 신청 방법
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>홈 화면에서 "신청하기" 버튼을 클릭합니다.</li>
              <li>원하는 작업 종류를 선택합니다.</li>
              <li>필요한 경우 추가 내용을 입력하고 이미지를 업로드합니다.</li>
              <li>"신청하기" 버튼을 클릭하여 작업을 제출합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              작업 종류 안내
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  인스타그램 팔로워
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  인스타그램 계정의 팔로워 수를 늘리는 작업입니다.
                </p>
              </div>
              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-medium text-gray-900">인스타그램 좋아요</h3>
                <p className="text-sm text-gray-600 mt-1">
                  인스타그램 게시물에 좋아요를 받는 작업입니다.
                </p>
              </div>
              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  인스타그램 인기게시물
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  인스타그램 게시물을 인기게시물로 만드는 작업입니다. 이미지
                  업로드가 필요합니다.
                </p>
              </div>
              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-medium text-gray-900">맘카페</h3>
                <p className="text-sm text-gray-600 mt-1">
                  맘카페 게시물 홍보 작업입니다. 이미지 업로드가 필요합니다.
                </p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-medium text-gray-900">파워블로그</h3>
                <p className="text-sm text-gray-600 mt-1">
                  이 작업은 담당자를 통해 카카오톡으로 신청부탁드립니다.
                </p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-medium text-gray-900">클립</h3>
                <p className="text-sm text-gray-600 mt-1">
                  이 작업은 담당자를 통해 카카오톡으로 신청부탁드립니다.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              주의사항
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>
                작업 신청 시 남은 작업 가능 갯수가 자동으로 차감됩니다.
              </li>
              <li>
                이미지 업로드가 필요한 작업은 반드시 이미지를 첨부해주세요.
              </li>
              <li>
                작업 상태는 "발주 목록"에서 확인할 수 있습니다.
              </li>
              <li>
                남은 작업 가능 갯수가 0건이면 새로운 작업을 신청할 수 없습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              문의
            </h2>
            <p className="text-gray-700">
              추가 문의사항이 있으시면 관리자에게 연락해주세요.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

