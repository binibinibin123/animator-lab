'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PreviewRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    useEffect(() => {
        if (projectId) {
            router.replace(`/project/${projectId}/preview`);
        } else {
            router.replace('/create/new');
        }
    }, [projectId, router]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">리다이렉트 중...</p>
            </div>
        </div>
    );
}

export default function PreviewRedirect() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PreviewRedirectContent />
        </Suspense>
    );
}
