'use client';

import Link from 'next/link';
import ChannelForm from '@/components/channel/ChannelForm';
import { useState } from 'react'; // Added useState import

export default function NewChannelPage() {
    const [importUrl, setImportUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedData, setAnalyzedData] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!importUrl) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/analyze-youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: importUrl })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Map gender to default voice
            const defaultMaleVoice = 'JBFqnCBsd6RMkjVDRZzb'; // George
            const defaultFemaleVoice = '21m00Tcm4TlvDq8ikWAM'; // Rachel
            const voiceId = data.voice_gender === 'female' ? defaultFemaleVoice : defaultMaleVoice;

            // Prepare Initial Data for Form
            const newData = {
                name: data.name,
                description: data.description,
                style_preset: data.style_preset,
                voice_id: voiceId,
                topic_source: 'manual',
                rss_url: '',
                visual_persona_url: ''
            };

            setAnalyzedData(newData);

            alert('분석 완료! 설정을 확인해주세요.');
        } catch (error: any) {
            alert('분석 실패: ' + error.message);
        } finally {
            setIsAnalyzing(false);
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
                {/* YouTube Import Section */}
                <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🎬</span> 유튜브 영상으로 시작하기
                    </h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="유튜브 영상 주소를 붙여넣으세요 (https://youtube.com/...)"
                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !importUrl}
                            className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                    분석 중...
                                </>
                            ) : (
                                '분석 & 가져오기'
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        영상의 스타일, 어조, 타겟 독자를 분석하여 채널 설정을 자동으로 채워줍니다.
                    </p>
                </div>

                <ChannelForm
                    key={analyzedData ? 'analyzed' : 'new'}
                    initialData={analyzedData}
                />
            </main>
        </div>
    );
}
