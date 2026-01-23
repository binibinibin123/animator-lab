'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DebugDBPage() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
    const [projectCount, setProjectCount] = useState<number | null>(null);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [envInfo, setEnvInfo] = useState<any>({});

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setStatus('loading');
        try {
            // Check Environment
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            setEnvInfo({
                url: url ? `${url.slice(0, 8)}...${url.slice(-5)}` : 'Mission',
                keyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            });

            // Check Data
            const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });

            if (error) throw error;
            setProjectCount(count);

            // Fetch Recent
            const { data } = await supabase
                .from('projects')
                .select('id, title, status, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentProjects(data || []);
            setStatus('connected');

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        🛠️ DB Connection Debugger
                    </h1>
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
                        ← Back to Home
                    </Link>
                </div>

                {/* Status Card */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Status</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${status === 'connected' ? 'bg-green-100 text-green-700' :
                                status === 'error' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                            }`}>
                            {status.toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-gray-500 mb-1">Supabase URL</div>
                            <div className="font-mono font-bold text-gray-800">{envInfo.url || 'Not Set'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-gray-500 mb-1">Anon Key</div>
                            <div className="font-mono font-bold text-gray-800">{envInfo.keyPresent ? '✅ Present' : '❌ Missing'}</div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-mono break-all">
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Projects Data */}
                {status === 'connected' && (
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Projects Found</h2>
                            <span className="text-2xl font-bold text-violet-600">{projectCount}</span>
                        </div>

                        <div className="space-y-2">
                            {recentProjects.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{p.title || '(No Title)'}</span>
                                        <span className="text-xs text-gray-400 font-mono">{p.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600">{p.status}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recentProjects.length === 0 && (
                                <div className="text-center text-gray-400 py-8">
                                    No projects found in this database.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="text-center space-y-8">
                    <button
                        onClick={checkConnection}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        🔄 Refresh Connection
                    </button>

                    <div className="pt-8 border-t text-left">
                        <h3 className="text-lg font-bold mb-4">Add Project ID Inspector (Check Videos)</h3>
                        <ProjectInspector />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectInspector() {
    const [id, setId] = useState('');
    const [segments, setSegments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const fetchSegments = async () => {
        if (!id) return;
        setLoading(true);
        setMsg('');
        setSegments([]);
        try {
            const { data, error } = await supabase
                .from('segments')
                .select('*')
                .eq('project_id', id)
                .order('order_index');

            if (error) throw error;
            setSegments(data || []);
            setMsg(`Found ${data?.length || 0} segments.`);
        } catch (e: any) {
            setMsg('Error: ' + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4 p-4 bg-white rounded-xl border">
            <div className="flex gap-2">
                <input
                    value={id}
                    onChange={e => setId(e.target.value)}
                    placeholder="Enter Project ID UUID"
                    className="flex-1 px-4 py-2 border rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                    onClick={fetchSegments}
                    disabled={loading}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg disabled:opacity-50 hover:bg-violet-700 transition"
                >
                    {loading ? '...' : 'Inspect'}
                </button>
            </div>
            {msg && <div className="text-sm font-medium text-gray-700">{msg}</div>}

            {segments.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {segments.map((s, i) => (
                        <div key={s.id} className="p-3 bg-gray-50 rounded border text-xs font-mono space-y-1">
                            <div className="font-bold flex justify-between">
                                <span>Segment #{s.order_index}</span>
                                <span className="text-gray-400">{s.id.slice(0, 8)}</span>
                            </div>
                            <div className="truncate text-gray-600">Prompt: {s.video_prompt || 'N/A'}</div>
                            <div className={`font-bold flex items-center gap-2 ${s.video_url ? 'text-green-600' : 'text-red-500'}`}>
                                <span>Video URL:</span>
                                <span>{s.video_url ? '✅ Present' : '❌ Missing'}</span>
                            </div>
                            {s.video_url && <div className="text-gray-400 truncate select-all">{s.video_url}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
