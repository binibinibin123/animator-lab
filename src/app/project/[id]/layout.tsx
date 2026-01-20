'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import AutopilotWidget from '@/components/AutopilotWidget';

// Steps for project editing (영상 설정 제외)
const PROJECT_STEPS = [
    { id: 1, path: 'script', label: '대본 작성' },
    { id: 2, path: 'voice', label: '음성 생성' },
    { id: 3, path: 'image', label: '이미지 생성' },
    { id: 4, path: 'video', label: '영상 생성' },
    { id: 5, path: 'preview', label: '영상 확인' },
    { id: 6, path: 'upscale', label: '업스케일' },
] as const;

function ProjectStepper({ projectId, currentPath }: { projectId: string; currentPath: string }) {
    const getCurrentStep = () => {
        const step = PROJECT_STEPS.find(s => currentPath.includes(s.path));
        return step?.id || 1;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-center gap-2">
                {PROJECT_STEPS.map((step, index) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div key={step.id} className="flex items-center">
                            <Link
                                href={`/project/${projectId}/${step.path}`}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                                    transition-all duration-200
                                    ${isCompleted
                                        ? 'bg-violet-600 text-white'
                                        : isCurrent
                                            ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-600'
                                            : 'bg-gray-100 text-gray-400'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    step.id
                                )}
                            </Link>
                            <span className={`ml-2 text-sm ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                {step.label}
                            </span>
                            {index < PROJECT_STEPS.length - 1 && (
                                <div className={`w-12 h-0.5 mx-3 ${isCompleted ? 'bg-violet-600' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) {
                setError('프로젝트 ID가 없습니다.');
                setIsLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (fetchError || !data) {
                setError('프로젝트를 찾을 수 없습니다.');
            } else {
                setProject(data as Project);
            }
            setIsLoading(false);
        };

        fetchProject();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">프로젝트 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Link href="/" className="text-violet-600 hover:underline">
                        대시보드로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-xl font-bold text-violet-600">AutoVideo</Link>
                            {project && (
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {project.title || '제목 없음'}
                                </span>
                            )}
                        </div>
                        <Link href="/" className="text-sm text-gray-500 hover:text-violet-600">
                            ← 대시보드
                        </Link>
                    </div>
                </div>
            </header>

            {/* Stepper */}
            <div className="max-w-5xl mx-auto px-4">
                <ProjectStepper projectId={projectId} currentPath={typeof window !== 'undefined' ? window.location.pathname : ''} />
            </div>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-xl shadow-sm border p-8">
                    {children}
                </div>
            </main>
            <AutopilotWidget />
        </div>
    );
}
