'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const VOICES = [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Male)' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Male)' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Female)' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Female)' },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        default_aspect_ratio: '16:9',
        default_style: 'anime',
        default_voice_id: 'pNInz6obpgDQGcFmaJgB',
        default_duration: 60,
        include_subtitles: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            if (data.settings) {
                setSettings(data.settings);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                setMessage('✅ 설정이 저장되었습니다.');
                setTimeout(() => setMessage(''), 3000);
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            setMessage('❌ 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-12 text-center">로딩 중...</div>;

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">사용자 설정</h1>
                    <p className="text-gray-500 mt-1">오토파일럿 및 새 프로젝트에 적용될 기본값을 설정합니다.</p>
                </div>
                <Link href="/" className="text-sm text-violet-600 hover:underline">← 대시보드로</Link>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm divide-y">
                {/* Aspect Ratio */}
                <div className="p-6 space-y-4">
                    <label className="block font-semibold text-gray-800">기본 영상 비율</label>
                    <div className="flex gap-4">
                        {['16:9', '9:16', '1:1', '3:4'].map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setSettings({ ...settings, default_aspect_ratio: ratio })}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${settings.default_aspect_ratio === ratio
                                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                                        : 'border-gray-100 hover:border-gray-300'
                                    }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Default Style */}
                <div className="p-6 space-y-4">
                    <label className="block font-semibold text-gray-800">기본 영상 스타일</label>
                    <select
                        value={settings.default_style}
                        onChange={(e) => setSettings({ ...settings, default_style: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 outline-none"
                    >
                        <option value="anime">애니메이션</option>
                        <option value="realistic">실사</option>
                        <option value="digital-art">디지털 아트</option>
                        <option value="cinematic">시네마틱</option>
                        <option value="cartoon">카툰</option>
                    </select>
                </div>

                {/* Default Voice */}
                <div className="p-6 space-y-4">
                    <label className="block font-semibold text-gray-800">기본 AI 보이스</label>
                    <div className="grid grid-cols-2 gap-3">
                        {VOICES.map((voice) => (
                            <button
                                key={voice.id}
                                onClick={() => setSettings({ ...settings, default_voice_id: voice.id })}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${settings.default_voice_id === voice.id
                                        ? 'border-violet-600 bg-violet-50'
                                        : 'border-gray-100 hover:border-gray-300 bg-gray-50'
                                    }`}
                            >
                                <span className="text-sm font-medium">{voice.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subtitles Toggle */}
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <label className="block font-semibold text-gray-800">자막 포함 여부</label>
                        <p className="text-sm text-gray-500">영상 생성 시 자막을 기본으로 포함할지 결정합니다.</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, include_subtitles: !settings.include_subtitles })}
                        className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.include_subtitles ? 'bg-violet-600' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform ${settings.include_subtitles ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                    </button>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-violet-200"
                >
                    {isSaving ? '저장 중...' : '설정 저장하기'}
                </button>
                {message && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2">{message}</span>}
            </div>
        </div>
    );
}
