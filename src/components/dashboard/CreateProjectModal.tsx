'use client';

import { useState } from 'react';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: ProjectConfig) => void;
    isTestRun?: boolean;
    channelName?: string;
}

export interface ProjectConfig {
    duration: number; // seconds
    topicOverride?: string;
}

export default function CreateProjectModal({ isOpen, onClose, onStart, isTestRun, channelName }: CreateProjectModalProps) {
    const [duration, setDuration] = useState(60); // Default 60s
    const [topic, setTopic] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart({
            duration,
            topicOverride: topic.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="bg-violet-600 px-6 py-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {isTestRun ? '🧪 테스트 실행 설정' : '⚡ 자동 영상 생성 설정'}
                    </h3>
                    <p className="text-violet-100 text-sm opacity-90">
                        {channelName ? `channel: ${channelName}` : '채널 기반 영상 생성'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Duration Selection */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700">
                                영상 길이 목표
                            </label>
                            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                                현재: {duration}초
                            </span>
                        </div>

                        {/* Presets */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: '⚡ 30초 쇼츠', value: 30 },
                                { label: '📹 3분 롱폼', value: 180 },
                                { label: '🎬 6분 롱폼', value: 360 },
                                { label: '🎥 10분 롱폼', value: 600 },
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setDuration(preset.value)}
                                    className={`px-3 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                                        duration === preset.value
                                            ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Manual Input */}
                        <div className="relative group">
                            <label className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium group-focus-within:text-violet-600 transition-colors">
                                직접 입력
                            </label>
                            <input
                                type="number"
                                min="10"
                                value={duration}
                                onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
                                className="w-full pl-20 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">
                                초
                            </span>
                        </div>
                    </div>

                    {/* Topic Override */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            주제 직접 입력 (선택사항)
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="채널의 주제 소스를 무시하고, 이 주제로 영상을 만듭니다."
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none h-24"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {isTestRun ? '🧪 테스트 시작' : '⚡ 생성 시작'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
