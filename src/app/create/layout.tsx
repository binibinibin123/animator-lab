import Link from 'next/link';
import Stepper from '@/components/Stepper';

export default function CreateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f7f8fb]">
            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-wide text-slate-950">Animator Lab</h1>
                            <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">
                                Animation Studio
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="hidden text-right md:block">
                                <p className="text-xs text-gray-400">기본 30초 컷보드</p>
                                <p className="font-semibold text-slate-900">GPT Image 2 + LTX-2.3</p>
                            </div>
                            <Link href="/projects" className="text-gray-500 transition-colors hover:text-slate-950">
                                작품 목록
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4">
                <Stepper />
                <div className="-mt-2 mb-4 grid gap-3 text-xs md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <p className="text-gray-400">Story Bible + Shot Board</p>
                        <p className="font-semibold text-gray-900">컷 단위 제작 흐름</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <p className="text-gray-400">Take-based review</p>
                        <p className="font-semibold text-gray-900">선택 테이크만 렌더 반영</p>
                    </div>
                    <div className="rounded-xl bg-slate-950 px-3 py-2 text-white">
                        <p className="text-slate-300">기본 모델</p>
                        <p className="font-semibold">GPT Image 2 / LTX-2.3 Fast</p>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-5xl px-4 pb-8">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    {children}
                </div>
            </main>
        </div>
    );
}
