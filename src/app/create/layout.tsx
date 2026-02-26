import Stepper from '@/components/Stepper';
import Link from 'next/link';

export default function CreateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f7f8fb]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-wide text-violet-600">AutoVideo</h1>
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">Create Flow</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="hidden md:block text-right">
                                <p className="text-gray-400 text-xs">예상 30초 소모</p>
                                <p className="font-semibold text-violet-700">약 730 크레딧</p>
                            </div>
                            <Link href="/projects" className="text-gray-500 hover:text-violet-600 transition-colors">← 프로젝트</Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stepper */}
            <div className="max-w-5xl mx-auto px-4">
                <Stepper />
                <div className="-mt-2 mb-4 grid md:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                        <p className="text-gray-400">Script + TTS + Image + Video</p>
                        <p className="font-semibold text-gray-900">단계별 차감 방식</p>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                        <p className="text-gray-400">잔여 크레딧 기준</p>
                        <p className="font-semibold text-gray-900">부족 시 생성 차단</p>
                    </div>
                    <div className="rounded-xl bg-violet-600 text-white px-3 py-2">
                        <p className="text-violet-100">참고</p>
                        <p className="font-semibold">30초 기준 1편 ≈ 730</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
