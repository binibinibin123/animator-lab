'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChannelForm, { ChannelFormData } from '@/components/channel/ChannelForm';

export default function EditChannelPage() {
    const params = useParams();
    const id = params.id as string;

    const [initialData, setInitialData] = useState<ChannelFormData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChannel = async () => {
            const { data, error } = await supabase
                .from('channels')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching channel:', error);
                alert('채널 정보를 불러오는데 실패했습니다.');
                return;
            }

            if (data) {
                setInitialData({
                    name: data.name,
                    description: data.description || '',
                    style_preset: data.style_preset || 'economy-1',
                    voice_id: data.voice_id || '',
                    topic_source: data.topic_source || 'manual',
                    rss_url: data.rss_url || '',
                    visual_persona_url: data.visual_persona_url || '',
                });
            }
            setLoading(false);
        };

        if (id) {
            fetchChannel();
        }
    }, [id]);

    if (loading) return <div className="p-12 text-center text-gray-500">로딩 중...</div>;
    if (!initialData) return <div className="p-12 text-center text-gray-500">채널을 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/channels" className="text-gray-500 hover:text-gray-900">
                            ← 취소
                        </Link>
                        <h1 className="text-xl font-bold">채널 수정</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <ChannelForm initialData={initialData} channelId={id} />
            </main>
        </div>
    );
}
