'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface Admin {
  id: string;
  username: string;
  role: 'superadmin' | 'admin';
  isActive?: boolean;
  createdAt: string;
}

export default function AdminsManagement() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // admin과 superadmin만 필터링 (superadmin 자신은 제외)
        const adminList = data.users.filter(
          (u: any) => (u.role === 'admin' || u.role === 'superadmin')
        );
        setAdmins(adminList);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || '관리자 생성에 실패했습니다.');
        setFormLoading(false);
        return;
      }

      // Reset form and refresh list
      setFormData({ username: '', password: '' });
      setShowCreateForm(false);
      fetchAdmins();
      setFormLoading(false);
    } catch (error: any) {
      setFormError('관리자 생성 중 오류가 발생했습니다.');
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (adminId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${adminId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchAdmins();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to toggle admin status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              {showCreateForm ? '취소' : '+ 관리자 추가'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">새 관리자 추가</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이디 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                    minLength={4}
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {formLoading ? '생성 중...' : '생성'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    아이디
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {admin.username}
                      {admin.role === 'superadmin' && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          최고관리자
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.role === 'superadmin' ? '최고관리자' : '일반관리자'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {admin.isActive !== false ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          활성
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {admin.role !== 'superadmin' && (
                        <button
                          onClick={() => handleToggleActive(admin.id, admin.isActive !== false)}
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            admin.isActive !== false
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {admin.isActive !== false ? '비활성화' : '활성화'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

