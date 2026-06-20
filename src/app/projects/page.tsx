'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'completed'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const ITEMS_PER_PAGE = 6;

  const monthlyCredits = 6000;
  const usedCredits = projects.reduce((sum, p) => sum + (p.status === 'completed' ? 730 : 220), 0);
  const remainingCredits = Math.max(0, monthlyCredits - usedCredits);
  const completionRate = projects.length > 0
    ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100)
    : 0;

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

  // 페이지네이션
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filterSignature = `${searchQuery}|${filterStatus}|${sortBy}`;

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setIsLoading(false);
  }, []);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    if (filterSignature.length >= 0) {
      setCurrentPage(1);
    }
  }, [filterSignature]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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

  const handleSyncThumbnails = async () => {
    try {
      const res = await fetch('/api/project/sync-thumbnails', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`썸네일 동기화 완료! ${data.updated}개 업데이트`);
        fetchProjects(); // Refresh to see thumbnails
      } else {
        alert('동기화 실패: ' + data.error);
      }
    } catch (error) {
      alert('동기화 중 오류 발생');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-950">Animator Lab</h1>
                <span className="px-2 py-1 text-[10px] font-bold tracking-wide rounded-full bg-slate-100 text-slate-700">Works</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">{session?.user?.email || '내 계정'}</p>
                  <p className="text-xs font-semibold text-violet-600">월 기준 6,000 크레딧</p>
                </div>
                <button
                  onClick={handleSyncThumbnails}
                  type="button"
                  className="text-gray-400 hover:text-violet-600 transition-colors text-sm"
                  title="썸네일 동기화"
                >
                🖼️
              </button>
              <Link href="/settings" className="text-gray-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <span className="text-lg">⚙️</span>
                <span className="text-sm font-medium">설정</span>
              </Link>
              <Link href="/channels" className="text-gray-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <span className="text-lg">📺</span>
                <span className="text-sm font-medium">채널</span>
              </Link>
              <Link href="/create/autopilot" className="group flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all">
                <span>✨</span>
                <span>오토파일럿</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/?login=1' })}
                className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="mb-5 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            Animation production workspace
          </div>
          <h2 className="mb-3 text-4xl font-black tracking-tight text-slate-950">
            AI Animation Works from story to render
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-slate-600">
            Build Story Bible, Shot Board, image takes, motion takes, subtitles, transitions, and final Remotion exports.
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            주제 하나로 완성하는
            <span className="text-violet-600"> AI 영상</span>
          </h2>
          <p className="text-lg text-gray-600">
            대본 → 음성 → 이미지 → 영상까지 완전 자동화
          </p>
        </div>

        {/* Paid-SaaS style visibility cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">이번 달 남은 크레딧</p>
            <p className="text-2xl font-bold text-violet-700">{remainingCredits.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">사용 {usedCredits.toLocaleString()} / 6,000</p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">완료율</p>
            <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
            <p className="text-xs text-gray-400 mt-1">완료 {projects.filter(p => p.status === 'completed').length} / 전체 {projects.length}</p>
          </div>
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs opacity-80 mb-1">생산량 가이드</p>
            <p className="text-xl font-bold">30초 기준 약 8편</p>
            <p className="text-xs opacity-80 mt-1">6,000 크레딧 기준 예상 제작량</p>
          </div>
        </div>

        {/* Onboarding checklist */}
        <div className="bg-white rounded-2xl border p-5 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">빠른 시작 체크리스트</h3>
            <span className="text-xs text-gray-500">첫 가치 경험까지 3단계</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <Link href="/create/new" className="p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-colors">
              <p className="font-semibold text-gray-900">1. 프로젝트 생성</p>
              <p className="text-gray-500 mt-1">비율/스타일 선택 후 시작</p>
            </Link>
            <Link href="/create/autopilot" className="p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-colors">
              <p className="font-semibold text-gray-900">2. 오토파일럿 실행</p>
              <p className="text-gray-500 mt-1">주제만 입력해 전체 생성</p>
            </Link>
            <Link href="/settings" className="p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-colors">
              <p className="font-semibold text-gray-900">3. 세부 설정 점검</p>
              <p className="text-gray-500 mt-1">음성/출력/운영 옵션 확인</p>
            </Link>
          </div>
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
                    type="button"
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
                type="button"
                onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isSelectMode ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                ☑️ 선택
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2 py-1 text-sm rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="그리드 뷰"
                >
                  ▦
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 text-sm rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  title="리스트 뷰"
                >
                  ☰
                </button>
              </div>
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
                  type="button"
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
          ) : paginatedProjects.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-dashed text-center text-gray-400">
              <p className="text-lg mb-2 text-gray-300">🎬</p>
              <p>{searchQuery || filterStatus !== 'all' ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다. 첫 영상을 만들어보세요!'}</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedProjects.map((project) => (
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
                            <button
                              type="button"
                              onClick={(e) => toggleSelect(e, project.id)}
                              className="absolute top-2 left-2 cursor-pointer"
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(project.id)
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'bg-white/90 border-gray-300'
                                }`}>
                                {selectedIds.has(project.id) && <span className="text-xs">✓</span>}
                              </div>
                            </button>
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
                          type="button"
                          onClick={(e) => startEditing(e, project)}
                          className="p-1.5 bg-white/90 backdrop-blur rounded-md hover:bg-violet-100 text-gray-600 hover:text-violet-600"
                          title="이름 변경"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(e, project.id)}
                          className="p-1.5 bg-white/90 backdrop-blur rounded-md hover:bg-violet-100 text-gray-600 hover:text-violet-600"
                          title="복제"
                        >
                          📋
                        </button>
                        <button
                          type="button"
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
              ) : (
                /* List View */
                <div className="space-y-3">
                  {paginatedProjects.map((project) => (
                    <div key={project.id} className="group relative">
                      <Link
                        href={`/project/${project.id}/script`}
                        className="flex items-center gap-4 bg-white p-4 rounded-xl border hover:border-violet-300 hover:shadow-md transition-all"
                      >
                        {isSelectMode && (
                          <button type="button" onClick={(e) => toggleSelect(e, project.id)} className="cursor-pointer">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(project.id) ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-300'
                              }`}>
                              {selectedIds.has(project.id) && <span className="text-xs">✓</span>}
                            </div>
                          </button>
                        )}
                        <div className="w-24 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {project.thumbnail_url ? (
                            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🎞️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === project.id ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleRename(project.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRename(project.id)}
                              onClick={(e) => e.preventDefault()}
                              className="w-full font-bold text-gray-900 border-b-2 border-violet-600 outline-none bg-transparent"
                            />
                          ) : (
                            <h4 className="font-bold text-gray-900 group-hover:text-violet-600 truncate">{project.title || '제목 없음'}</h4>
                          )}
                          <p className="text-xs text-gray-500 truncate">{project.topic || '주제 정보 없음'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(project.status)}`}>{project.status}</span>
                        <span className="text-xs text-gray-400">{new Date(project.created_at).toLocaleDateString()}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={(e) => startEditing(e, project)} className="p-1.5 rounded hover:bg-violet-100" title="이름 변경">✏️</button>
                          <button type="button" onClick={(e) => handleDuplicate(e, project.id)} className="p-1.5 rounded hover:bg-violet-100" title="복제">📋</button>
                          <button type="button" onClick={(e) => handleDelete(e, project.id)} className="p-1.5 rounded hover:bg-red-100" title="삭제">🗑️</button>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← 이전
                  </button>
                  <span className="text-sm text-gray-600">
                    <span className="font-bold text-violet-600">{currentPage}</span> / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

