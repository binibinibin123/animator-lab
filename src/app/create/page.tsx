'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 기존 /create URL을 /create/new로 리다이렉트
export default function CreateRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/create/new');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">리다이렉트 중...</p>
            </div>
        </div>
    );
}
