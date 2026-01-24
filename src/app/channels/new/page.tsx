'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { ChannelInsert } from '@/types/database';

const STYLE_PRESETS = [
    { id: 'economy-1', name: 'Economy (Simple Stickman)', desc: '빠르고 경제적인 스틱맨 스타일' },
    { id: 'senior-1', name: 'Senior (Detailed Stickman)', desc: '디테일이 살아있는 고품질 스틱맨' },
    { id: 'anime', name: 'Anime', desc: '일본 애니메이션 스타일' },
    { id: 'realistic', name: 'Realistic', desc: '실사 스타일' },
    { id: '3d-render', name: '3D Render', desc: '3D 렌더링 스타일' },
];

export default function NewChannelPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        style_preset: 'economy-1',
        voice_id: 'JBFqnCBsd6RMkjVDRZzb', // Default: George
        topic_source: 'manual', // manual | rss | random
        rss_url: '',
        visual_persona_url: '',
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const filename = `personas/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('autovideo-media')
                .upload(filename, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('autovideo-media')
                .getPublicUrl(filename);

            setFormData(prev => ({ ...prev, visual_persona_url: publicUrl }));
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('이미지 업로드 실패: ' + (error.message || '알 수 없는 오류'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return alert('채널 이름을 입력해주세요.');

        setIsSubmitting(true);

        try {
            const { error } = await (supabase
                .from('channels') as any)
                .insert({
                    name: formData.name,
                    description: formData.description || null,
                    style_preset: formData.style_preset || null,
                    voice_id: formData.voice_id || null,
                    topic_source: formData.topic_source || null,
                    rss_url: formData.topic_source === 'rss' ? formData.rss_url : null,
                    visual_persona_url: formData.visual_persona_url || null,
                } satisfies ChannelInsert);

            if (error) throw error;

            router.push('/channels');
            router.refresh();
        } catch (error: any) {
            console.error('Create failed:', error);
            alert('채널 생성 실패: ' + error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/channels" className="text-gray-500 hover:text-gray-900">
                            ← 취소
                        </Link>
                        <h1 className="text-xl font-bold">새 채널 만들기</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-8 space-y-8">

                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">기본 정보</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">채널 이름</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="예: 이슈 텔러, 경제 요약봇"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">채널 설명 / AI 페르소나</label>
                            <p className="text-xs text-gray-500 mb-2">랜덤 주제 생성 시 이 설명을 바탕으로 아이디어를 도출합니다.</p>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="이 채널은 2030 직장인을 위한 최신 IT 트렌드를 쉽고 재미있게 전달합니다..."
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none h-24 resize-none"
                            />
                        </div>
                    </section>

                    {/* Visual Identity */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">비주얼 아이덴티티</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">비주얼 페르소나 (레퍼런스 이미지)</label>
                            <div className="flex items-start gap-6">
                                <div className="flex-1">
                                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${uploading ? 'bg-gray-100 border-gray-300' : 'hover:border-violet-500 hover:bg-violet-50 border-gray-300'}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                            className="hidden"
                                            id="persona-upload"
                                        />
                                        <label htmlFor="persona-upload" className="cursor-pointer block w-full h-full">
                                            {uploading ? (
                                                <span className="text-gray-500">업로드 중...</span>
                                            ) : (
                                                <span className="text-violet-600 font-medium">Click to upload reference image</span>
                                            )}
                                        </label>
                                    </div>
                                </div>
                                {formData.visual_persona_url && (
                                    <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img src={formData.visual_persona_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">그림 스타일 프리셋</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {STYLE_PRESETS.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => setFormData({ ...formData, style_preset: preset.id })}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.style_preset === preset.id
                                            ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600'
                                            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="font-bold text-sm text-gray-900">{preset.name}</div>
                                        <div className="text-xs text-gray-500">{preset.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Automation Config */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">자동화 설정</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">목소리 (ElevenLabs Voice ID)</label>
                                <input
                                    type="text"
                                    value={formData.voice_id}
                                    onChange={e => setFormData({ ...formData, voice_id: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">기본값: George (JBFqnCBsd6RMkjVDRZzb)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">주제 소스 (Topic Source)</label>
                                <select
                                    value={formData.topic_source}
                                    onChange={e => setFormData({ ...formData, topic_source: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    <option value="manual">Manual (수동 입력)</option>
                                    <option value="rss">RSS Feed (뉴스 자동화)</option>
                                    <option value="random">Random (AI 랜덤 생성)</option>
                                </select>
                            </div>
                        </div>

                        {formData.topic_source === 'rss' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-violet-700 mb-1">RSS 피드 URL</label>
                                <input
                                    type="url"
                                    value={formData.rss_url}
                                    onChange={e => setFormData({ ...formData, rss_url: e.target.value })}
                                    placeholder="https://example.com/feed.xml"
                                    className="w-full px-4 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-violet-50"
                                    required
                                />
                            </div>
                        )}
                    </section>

                    <div className="pt-6 border-t flex justify-end gap-3">
                        <Link
                            href="/channels"
                            className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            취소
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '생성 중...' : '채널 생성 완료'}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}
