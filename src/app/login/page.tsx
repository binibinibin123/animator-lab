'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?login=1');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">로그인 모달로 이동 중...</p>
      </div>
    </div>
  );
}
