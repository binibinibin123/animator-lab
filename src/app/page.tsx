'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'completed'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 필터링 및 정렬된 프로젝트
  const filteredProjects = projects
    .filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.title?.toLowerCase().includes(q) || p.topic?.toLowerCase().includes(q);
      }
      return true;
    })
    .filter(p => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'completed') return p.status === 'completed';
      return p.status !== 'completed';
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return (a.title || '').localeCompare(b.title || '');
    });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setIsLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('이 프로젝트를 삭제하시겠습니까?\n관련된 모든 데이터가 삭제됩니다.')) return;

    try {
      const res = await fetch(`/api/project?id=${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id: projectId }),
      });
      if (!res.ok) throw new Error('복제 실패');
      await fetchProjects();
    } catch (error) {
      alert('프로젝트 복제에 실패했습니다.');
    }
  };

  const handleRename = async (projectId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch('/api/project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, title: editTitle }),
      });
      if (!res.ok) throw new Error('이름 변경 실패');
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: editTitle } : p));
    } catch (error) {
      alert('이름 변경에 실패했습니다.');
    }
    setEditingId(null);
  };

  const startEditing = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(project.id);
    setEditTitle(project.title || '');
  };

  const toggleSelect = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 프로젝트를 삭제하시겠습니까?`)) return;

    try {
      for (const id of selectedIds) {
        await fetch(`/api/project?id=${id}`, { method: 'DELETE' });
      }
      setProjects(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-600';
      case 'draft': return 'bg-gray-100 text-gray-600';
      case 'script': return 'bg-blue-100 text-blue-600';
      case 'voice': return 'bg-purple-100 text-purple-600';
      case 'image': return 'bg-orange-100 text-orange-600';
      case 'video': return 'bg-pink-100 text-pink-600';
      default: return 'bg-violet-100 text-violet-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-violet-600">AutoVideo</h1>
            <div className="flex items-center gap-6">
              <Link href="/settings" className="text-gray-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <span className="text-lg">⚙️</span>
                <span className="text-sm font-medium">설정</span>
              </Link>
              <Link href="/create/autopilot" className="group flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all">
                <span>✨</span>
                <span>오토파일럿</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            주제 하나로 완성하는
            <span className="text-violet-600"> AI 영상</span>
          </h2>
          <p className="text-lg text-gray-600">
            대본 → 음성 → 이미지 → 영상까지 완전 자동화
          </p>
        </div>

        {/* Create New Project Card */}
        <div className="max-w-md mx-auto mb-16">
          <Link
            href="/create/new"
            className="block p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-violet-600 transition-all group"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-violet-200 transition-colors">
                <span className="text-3xl">🎬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">새 프로젝트 만들기</h3>
              <p className="text-gray-500">주제를 입력하고 AI가 영상을 만들어드립니다</p>
            </div>
          </Link>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>프로젝트</span>
              <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full text-xs">{filteredProjects.length}</span>
            </h3>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none w-40"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-violet-300 outline-none"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="name">이름순</option>
              </select>

              {/* Filter tabs */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['all', 'draft', 'completed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === status
                      ? 'bg-white text-violet-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {status === 'all' ? '전체' : status === 'draft' ? '작업중' : '완료'}
                  </button>
                ))}
              </div>

              {/* Select Mode Toggle */}
              <button
                onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isSelectMode ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                ☑️ 선택
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {isSelectMode && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredProjects.length && filteredProjects.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span>전체 선택 ({selectedIds.size}/{filteredProjects.length})</span>
              </label>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  🗑️ {selectedIds.size}개 삭제
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-dashed text-center text-gray-400">
              <p className="text-lg mb-2 text-gray-300">🎬</p>
              <p>{searchQuery || filterStatus !== 'all' ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다. 첫 영상을 만들어보세요!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id} className="group relative">
                  <Link
                    href={`/project/${project.id}/script`}
                    className="block bg-white p-5 rounded-2xl border hover:border-violet-300 hover:shadow-md transition-all"
                  >
                    <div className="aspect-video bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
                      {project.thumbnail_url ? (
                        <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-3xl">🎞️</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      {/* Checkbox for select mode */}
                      {isSelectMode && (
                        <div
                          onClick={(e) => toggleSelect(e, project.id)}
                          className="absolute top-2 left-2 cursor-pointer"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(project.id)
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'bg-white/90 border-gray-300'
                            }`}>
                            {selectedIds.has(project.id) && <span className="text-xs">✓</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(project.id)}
                        onClick={(e) => e.preventDefault()}
                        autoFocus
                        className="w-full font-bold text-gray-900 border-b-2 border-violet-600 outline-none bg-transparent"
                      />
                    ) : (
                      <h4 className="font-bold text-gray-900 group-hover:text-violet-600 truncate mb-1">
                        {project.title || '제목 없음'}
                      </h4>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {project.topic || '주제 정보 없음'}
                    </p>
                    <div className="mt-4 pt-4 border-t flex justify-between text-[10px] text-gray-400">
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      <span className="font-bold">{project.aspect_ratio}</span>
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => startEditing(e, project)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-md hover:bg-violet-100 text-gray-600 hover:text-violet-600"
                      title="이름 변경"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, project.id)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-md hover:bg-violet-100 text-gray-600 hover:text-violet-600"
                      title="복제"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-md hover:bg-red-100 text-gray-600 hover:text-red-600"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

