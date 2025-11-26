'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  admin_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  admin: {
    id: string;
    username: string;
  } | null;
  completedByUser: {
    id: string;
    username: string;
  } | null;
}

interface User {
  id: string;
  username: string;
}

export default function ChecklistManagement() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchItems();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checklist');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch checklist items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          dueDate: formData.dueDate || null,
          priority: formData.priority,
        }),
      });

      if (response.ok) {
        fetchItems();
        setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
        setShowAddForm(false);
      } else {
        const data = await response.json();
        alert(data.error || '체크리스트를 생성하는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create checklist item:', error);
      alert('체크리스트를 생성하는 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/checklist/${editingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          dueDate: formData.dueDate || null,
          priority: formData.priority,
        }),
      });

      if (response.ok) {
        fetchItems();
        setEditingItem(null);
        setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
      } else {
        const data = await response.json();
        alert(data.error || '체크리스트를 수정하는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update checklist item:', error);
      alert('체크리스트를 수정하는 중 오류가 발생했습니다.');
    }
  };

  const handleToggleComplete = async (item: ChecklistItem) => {
    try {
      const response = await fetch(`/api/checklist/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isCompleted: !item.is_completed,
        }),
      });

      if (response.ok) {
        fetchItems();
      } else {
        const data = await response.json();
        alert(data.error || '체크리스트 상태를 변경하는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
      alert('체크리스트 상태를 변경하는 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 체크리스트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/checklist/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchItems();
      } else {
        const data = await response.json();
        alert(data.error || '체크리스트를 삭제하는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
      alert('체크리스트를 삭제하는 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      dueDate: item.due_date || '',
      priority: item.priority,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '높음';
      case 'medium':
        return '보통';
      case 'low':
        return '낮음';
      default:
        return priority;
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today && !items.find(item => item.due_date === dueDate)?.is_completed;
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'pending') return !item.is_completed;
    if (filter === 'completed') return item.is_completed;
    return true;
  });

  const completedCount = items.filter((item) => item.is_completed).length;
  const pendingCount = items.filter((item) => !item.is_completed).length;
  const completionRate = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">체크리스트</h1>
          <p className="text-sm text-gray-600">
            작업 체크리스트를 관리하고 스케줄링하세요
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">전체</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200 bg-blue-50">
            <div className="text-sm text-blue-700">진행중</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
            <div className="text-sm text-green-700">완료</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{completedCount}</div>
            <div className="text-xs text-green-600 mt-1">({completionRate}%)</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'pending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              진행중 ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'completed'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              완료 ({completedCount})
            </button>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingItem(null);
              setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
          >
            + 추가
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingItem ? '체크리스트 수정' : '새 체크리스트 추가'}
            </h2>
            <form onSubmit={editingItem ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="체크리스트 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  특이사항/설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  placeholder="특이사항이나 설명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                >
                  {editingItem ? '수정' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                    setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Checklist Items */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'all' ? '체크리스트가 없습니다.' : '해당 상태의 체크리스트가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border-2 p-4 transition ${
                  item.is_completed
                    ? 'border-green-200 bg-green-50'
                    : isOverdue(item.due_date)
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => handleToggleComplete(item)}
                    className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className={`font-medium flex-1 ${
                          item.is_completed
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                            item.priority
                          )}`}
                        >
                          {getPriorityLabel(item.priority)}
                        </span>
                        {isOverdue(item.due_date) && !item.is_completed && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            마감 초과
                          </span>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        작성자: <span className="font-medium">{item.admin?.username || '-'}</span>
                      </span>
                      {item.due_date && (
                        <span>
                          마감일: <span className="font-medium">{new Date(item.due_date).toLocaleDateString('ko-KR')}</span>
                        </span>
                      )}
                      {item.is_completed && item.completedByUser && (
                        <span>
                          완료자: <span className="font-medium">{item.completedByUser.username}</span>
                          {item.completed_at && (
                            <span className="ml-1">
                              ({new Date(item.completed_at).toLocaleDateString('ko-KR')})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!item.is_completed && (
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition"
                      >
                        수정
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 text-xs text-red-700 hover:bg-red-50 rounded transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
