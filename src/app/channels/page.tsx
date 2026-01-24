'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Channel } from '@/types/database';

export default function ChannelsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setChannels(data as Channel[]);
        }
        setIsLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, channelId: string) => {
        e.preventDefault();
        if (!confirm('이 채널을 삭제하시겠습니까?\n연결된 프로젝트는 삭제되지 않지만, 채널 정보가 사라집니다.')) return;

        try {
            const { error } = await supabase.from('channels').delete().eq('id', channelId);
            if (error) throw error;
            setChannels(prev => prev.filter(c => c.id !== channelId));
        } catch (error) {
            alert('채널 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link href="/" className="text-2xl font-bold text-gray-400 hover:text-violet-600 transition-colors">
                                AutoVideo
                            </Link>
                            <span className="text-gray-300 text-2xl">/</span>
                            <h1 className="text-2xl font-bold text-violet-600">Channels</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-gray-500 hover:text-violet-600 text-sm font-medium">
                                ← 프로젝트 목록
                            </Link>
                            <Link
                                href="/channels/new"
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-bold shadow-sm"
                            >
                                <span>➕</span>
                                <span>새 채널 만들기</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        나만의 <span className="text-violet-600">콘텐츠 공장</span>
                    </h2>
                    <p className="text-gray-600">
                        채널별 페르소나와 스타일을 설정하고, 원클릭으로 영상을 생산하세요.
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : channels.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-6xl mb-4">🏭</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">아직 채널이 없습니다</h3>
                        <p className="text-gray-500 mb-8">첫 번째 채널을 만들고 자동화를 시작해보세요.</p>
                        <Link
                            href="/channels/new"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            채널 생성하기
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {channels.map((channel) => (
                            <div key={channel.id} className="group bg-white rounded-2xl border hover:border-violet-300 hover:shadow-xl transition-all overflow-hidden flex flex-col h-full">
                                {/* Visual Persona Header */}
                                <div className="h-40 bg-gray-100 relative overflow-hidden">
                                    {channel.visual_persona_url ? (
                                        <img
                                            src={channel.visual_persona_url}
                                            alt={channel.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-violet-50 text-violet-200">
                                            <span className="text-5xl">👤</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <h3 className="text-xl font-bold shadow-black drop-shadow-md">{channel.name}</h3>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">
                                        {channel.description || '설명 없음'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-gray-500">
                                        <div className="bg-gray-50 p-2 rounded-lg">
                                            <span className="block text-gray-400 mb-1">토픽 소스</span>
                                            <span className="font-bold text-gray-700 uppercase">{channel.topic_source || 'MANUAL'}</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-lg">
                                            <span className="block text-gray-400 mb-1">스타일</span>
                                            <span className="font-bold text-gray-700 truncate">{channel.style_preset || 'Standard'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex gap-2">
                                        <button className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                                            <span>⚡</span> 자동 생성
                                        </button>
                                        <button className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
                                            🧪 테스트
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, channel.id)}
                                            className="px-3 py-2.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
