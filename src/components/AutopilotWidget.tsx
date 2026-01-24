'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const STEPS = [
    { id: 2, path: 'voice', label: '음성' },
    { id: 3, path: 'image', label: '이미지' },
    { id: 4, path: 'video', label: '영상' },
    { id: 5, path: 'thumbnail', label: '썸네일' },
    { id: 6, path: 'preview', label: '완료' },
];

export default function AutopilotWidget() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [targetStep, setTargetStep] = useState<number>(5); // Default to Final Render
    const [isActive, setIsActive] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('rapid-aio-mega-sage');

    // Sync state with URL
    useEffect(() => {
        const autopilot = searchParams.get('autopilot') === 'true';
        const target = searchParams.get('targetStep');

        setIsActive(autopilot);
        if (target) {
            setTargetStep(parseInt(target, 10));
        }

        // Load saved workflow preference
        const savedWorkflow = localStorage.getItem('autovideo_selected_workflow');
        if (savedWorkflow) {
            setSelectedWorkflow(savedWorkflow);
        }
    }, [searchParams]);

    const getCurrentStepId = () => {
        const step = STEPS.find(s => pathname.includes(s.path));
        return step?.id;
    };

    const currentStepId = getCurrentStepId();

    // Only show if we are in a project step (2-5)
    // if (!currentStepId) return null;

    const handleStart = () => {
        if (targetStep < (currentStepId || 0)) {
            alert('목표 단계는 현재 단계보다 뒤여야 합니다.');
            return;
        }

        // Save selected workflow
        localStorage.setItem('autovideo_selected_workflow', selectedWorkflow);

        const params = new URLSearchParams(searchParams.toString());
        params.set('autopilot', 'true');
        params.set('targetStep', targetStep.toString());

        setIsActive(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleStop = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('autopilot');
        params.delete('targetStep');

        setIsActive(false);
        router.push(`${pathname}?${params.toString()}`);
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className={`fixed right-8 bottom-8 z-[9999] p-4 rounded-full shadow-2xl transition-all border-2 border-violet-100 ${isActive ? 'bg-violet-600 text-white animate-pulse' : 'bg-white text-violet-600'
                    }`}
            >
                🚀
            </button>
        );
    }

    return (
        <div className="fixed right-8 bottom-8 z-[9999] w-72 bg-white rounded-2xl shadow-2xl border-2 border-violet-100 overflow-hidden font-sans animate-in slide-in-from-bottom-5">
            <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🚀</span>
                    <span className="font-bold text-gray-800 text-sm">오토 파일럿</span>
                </div>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            <div className="p-4 space-y-4">
                {isActive ? (
                    <div className="space-y-3">
                        <div className="text-center">
                            <div className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold mb-2 animate-pulse">
                                실행 중...
                            </div>
                            <p className="text-xs text-gray-500">
                                현재: <span className="font-bold text-gray-800">{STEPS.find(s => s.id === currentStepId)?.label}</span>
                                {' → '}
                                목표: <span className="font-bold text-violet-600">{STEPS.find(s => s.id === targetStep)?.label}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleStop}
                            className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                        >
                            중지하기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Workflow Selection */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">영상 생성 워크플로우</label>
                            <select
                                value={selectedWorkflow}
                                onChange={(e) => setSelectedWorkflow(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="rapid-aio-mega-sage">Rapid AIO Mega Sage (기본)</option>
                                <option value="rapid-aio-mega-sage-2">Rapid AIO Mega Sage 2 (강력)</option>
                                <option value="rapid-aio-mega">Rapid AIO Mega</option>
                                <option value="lf-i2v-v1.1">LF I2V v1.1</option>
                                <option value="ltx-video-default">LTX Video Default</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">목표 단계 설정</label>
                            <select
                                value={targetStep}
                                onChange={(e) => setTargetStep(parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                {STEPS.filter(s => s.id > (currentStepId || 0)).map(step => (
                                    <option key={step.id} value={step.id}>
                                        {step.id}. {step.label} 까지 완료
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleStart}
                            disabled={STEPS.filter(s => s.id > (currentStepId || 0)).length === 0}
                            className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            오토 파일럿 시작
                        </button>
                    </div>
                )}
            </div>

            {isActive && (
                <div className="h-1 bg-gray-100 w-full">
                    <div className="h-full bg-violet-500 animate-progress-indeterminate"></div>
                </div>
            )}
        </div>
    );
}
