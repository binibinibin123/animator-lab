import Stepper from '@/components/Stepper';

export default function CreateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-violet-600">AutoVideo</h1>
                        <span className="text-sm text-gray-500">← 대시보드</span>
                    </div>
                </div>
            </header>

            {/* Stepper */}
            <div className="max-w-5xl mx-auto px-4">
                <Stepper />
            </div>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-xl shadow-sm border p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
