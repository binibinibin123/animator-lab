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
                    {/* Duration Slider */}
                    <div className="space-y-2">
                        <label className="flex justify-between text-sm font-medium text-gray-700">
                            <span>영상 길이 목표</span>
                            <span className="text-violet-600 font-bold">{duration}초</span>
                        </label>
                        <input
                            type="range"
                            min="30"
                            max="180"
                            step="10"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>30s</span>
                            <span>60s</span>
                            <span>90s</span>
                            <span>120s</span>
                            <span>180s</span>
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
