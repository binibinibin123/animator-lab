'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">AI 영상 자동화 에이전트</span>
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
            href="/create"
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
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>최근 프로젝트</span>
            <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full text-xs">{projects.length}</span>
          </h3>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-dashed text-center text-gray-400">
              <p className="text-lg mb-2 text-gray-300">🎬</p>
              <p>아직 프로젝트가 없습니다. 첫 영상을 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/create/preview?projectId=${project.id}`}
                  className="group bg-white p-5 rounded-2xl border hover:border-violet-300 hover:shadow-md transition-all flex flex-col"
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
                      <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-violet-600 uppercase">
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-violet-600 truncate mb-1">
                    {project.title || '제목 없음'}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {project.topic || '주제 정보 없음'}
                  </p>
                  <div className="mt-4 pt-4 border-t flex justify-between text-[10px] text-gray-400">
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    <span className="font-bold">{project.aspect_ratio}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
