'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

const providers = [
  { id: 'google', label: 'Google로 시작하기', color: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50' },
  { id: 'naver', label: 'Naver로 시작하기', color: 'bg-[#03C75A] text-white hover:bg-[#02b451]' },
  { id: 'kakao', label: 'Kakao로 시작하기', color: 'bg-[#FEE500] text-gray-900 hover:bg-[#f4da00]' },
];

function LandingPageContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [openLoginModal, setOpenLoginModal] = useState(false);

  const callbackUrl = useMemo(() => {
    const value = searchParams.get('callbackUrl');
    if (!value) return '/projects';
    return value.startsWith('/') ? value : '/projects';
  }, [searchParams]);

  useEffect(() => {
    const shouldOpen =
      searchParams.get('login') === '1' ||
      !!searchParams.get('callbackUrl') ||
      !!searchParams.get('error');

    if (shouldOpen) {
      setOpenLoginModal(true);
    }
  }, [searchParams]);

  const isAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white text-gray-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.18),transparent_42%),radial-gradient(circle_at_82%_8%,rgba(79,70,229,0.14),transparent_36%),radial-gradient(circle_at_58%_75%,rgba(168,85,247,0.08),transparent_45%)]" />

      <header className="relative z-10 border-b border-violet-100/80 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-wide text-violet-600">AutoVideo</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700">Studio</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/projects" className="text-gray-600 hover:text-violet-700">프로젝트</Link>
            <Link href="/create/autopilot" className="text-gray-600 hover:text-violet-700">오토파일럿</Link>
            {isAuthenticated ? (
              <Link href="/projects" className="px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50">대시보드</Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpenLoginModal(true)}
                className="px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-start">
          <section>
            <p className="text-xs tracking-[0.2em] uppercase text-violet-500 mb-4">AI Short-form Studio</p>
            <h1 className="text-5xl md:text-7xl leading-[0.95] font-black">
              숏폼 제작을
              <br />
              <span className="text-violet-600">수익화 가능한</span>
              <br />
              생산라인으로
            </h1>
            <p className="mt-8 text-lg text-gray-600 max-w-2xl leading-relaxed">
              AutoVideo는 스크립트부터 렌더까지 한 흐름으로 처리합니다.
              30초 기준 크레딧 정책을 중심으로 팀이 예산과 생산량을 동시에 관리할 수 있습니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link href="/projects" className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors">
                  대시보드로 이동
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenLoginModal(true)}
                    className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors"
                  >
                    소셜 로그인으로 시작
                  </button>
                  <Link
                    href="/projects-test"
                    className="px-6 py-3 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors font-semibold"
                  >
                    테스트용 대시보드 이동
                  </Link>
                </>
              )}
              <Link
                href="/projects"
                className="px-6 py-3 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
              >
                프로젝트 보기
              </Link>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-violet-100 bg-white/80 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">30초 기준</p>
                <p className="text-2xl font-bold">730 크레딧</p>
                <p className="text-xs text-gray-500 mt-1">영상 1편 평균 소모</p>
              </div>
              <div className="p-4 rounded-xl border border-violet-100 bg-white/80 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">60초 기준</p>
                <p className="text-2xl font-bold">1,325 크레딧</p>
                <p className="text-xs text-gray-500 mt-1">컷 수 기반 자동 산정</p>
              </div>
              <div className="p-4 rounded-xl border border-violet-100 bg-white/80 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">핵심 흐름</p>
                <p className="text-sm font-semibold">Script → TTS → Image → Video → Render</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-100/60">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">제작 단계별 크레딧 가이드</h2>
              <span className="text-xs text-violet-600">Credit Guide</span>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ['Script', '50 / 회'],
                ['TTS', '15 / 세그먼트'],
                ['Image', '25 / 세그먼트'],
                ['Video', '45 / 세그먼트'],
              ].map(([name, value]) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-violet-100 px-3 py-2 bg-violet-50/40">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-bold text-violet-700">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-violet-50 border border-violet-100">
              <p className="text-xs text-violet-600">추천 온보딩</p>
              <ol className="mt-2 text-sm space-y-1 text-gray-700 list-decimal pl-5">
                <li>소셜 로그인</li>
                <li>샘플 프로젝트 생성</li>
                <li>30초 영상 1편 완주</li>
              </ol>
            </div>
          </section>
        </div>
      </main>

      {openLoginModal && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-label="로그인 모달 닫기"
            onClick={() => setOpenLoginModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-violet-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-violet-700">로그인</h3>
                <p className="text-sm text-gray-500 mt-1">Google, Naver, Kakao 중 원하는 계정으로 시작하세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenLoginModal(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => signIn(provider.id, { callbackUrl })}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${provider.color}`}
                >
                  {provider.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-400">로그인 후 바로 프로젝트 생성과 자동 제작 플로우를 시작할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}
