'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { usePathname, useSearchParams } from 'next/navigation';

const providers = [
  { id: 'google', label: 'Google로 시작하기', color: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50' },
  { id: 'naver', label: 'Naver로 시작하기', color: 'bg-[#03C75A] text-white hover:bg-[#02b451]' },
  { id: 'kakao', label: 'Kakao로 시작하기', color: 'bg-[#FEE500] text-gray-900 hover:bg-[#f4da00]' },
];

type LandingEventName =
  | 'landing_view'
  | 'landing_primary_cta_click'
  | 'landing_secondary_cta_click'
  | 'landing_tertiary_cta_click'
  | 'landing_faq_interaction';

type LandingEventPayload = {
  event: LandingEventName;
  source: 'landing';
  path: string;
  ctaType?: 'primary' | 'secondary' | 'tertiary';
  target?: string;
  faqId?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  timestamp: number;
};

function trackLandingEvent(payload: Omit<LandingEventPayload, 'timestamp' | 'source'>) {
  if (typeof window === 'undefined') return;

  const eventPayload: LandingEventPayload = {
    ...payload,
    source: 'landing',
    timestamp: Date.now(),
  };

  const body = JSON.stringify(eventPayload);
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const accepted = navigator.sendBeacon('/api/landing/event', new Blob([body], { type: 'application/json' }));
    if (accepted) return;
  }

  void fetch('/api/landing/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

const faqItems = [
  {
    id: 'faq-1',
    question: '처음 쓰는 팀도 바로 시작할 수 있나요?',
    answer: '네. 기본값으로 프로젝트를 만들고 템플릿 스타일을 고르면 바로 스크립트 단계부터 시작할 수 있습니다.',
  },
  {
    id: 'faq-2',
    question: '오토파일럿은 어떤 상황에서 쓰면 좋나요?',
    answer: '아이디어만 빠르게 검증할 때 좋습니다. 주제 입력 후 자동으로 초안을 만들고, 필요하면 단계별로 수동 보정할 수 있습니다.',
  },
  {
    id: 'faq-3',
    question: '크레딧은 어떻게 관리하나요?',
    answer: '대시보드에서 월 기준 사용량과 남은 크레딧을 확인할 수 있고, 길이와 세그먼트 수에 따라 예상 소모량이 자동 계산됩니다.',
  },
  {
    id: 'faq-4',
    question: '로그인하지 않아도 둘러볼 수 있나요?',
    answer: '랜딩은 로그인 없이 확인 가능하며, 생성 흐름으로 들어갈 때 소셜 로그인 후 이어서 진행됩니다.',
  },
];

function LandingPageContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const hasTrackedViewRef = useRef(false);

  const callbackUrl = useMemo(() => {
    const value = searchParams.get('callbackUrl');
    if (!value) return '/create/new';
    return value.startsWith('/') ? value : '/create/new';
  }, [searchParams]);

  const utmPayload = useMemo(
    () => ({
      source: searchParams.get('utm_source') || undefined,
      medium: searchParams.get('utm_medium') || undefined,
      campaign: searchParams.get('utm_campaign') || undefined,
    }),
    [searchParams]
  );

  useEffect(() => {
    const shouldOpen =
      searchParams.get('login') === '1' ||
      !!searchParams.get('callbackUrl') ||
      !!searchParams.get('error');

    if (shouldOpen) {
      setOpenLoginModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!openLoginModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenLoginModal(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openLoginModal]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;

    trackLandingEvent({
      event: 'landing_view',
      path: pathname || '/',
      utm: utmPayload,
    });
  }, [pathname, utmPayload]);

  const handleCtaClick = (event: LandingEventName, ctaType: 'primary' | 'secondary' | 'tertiary', target: string) => {
    trackLandingEvent({
      event,
      ctaType,
      target,
      path: pathname || '/',
      utm: utmPayload,
    });
  };

  const isAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50/40 text-gray-900 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-violet-700 focus:text-white"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(139,92,246,0.2),transparent_36%),radial-gradient(circle_at_85%_8%,rgba(79,70,229,0.18),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(167,139,250,0.16),transparent_42%)]" />

      <header className="relative z-10 border-b border-violet-100/80 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-wide text-violet-600">AutoVideo</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700">Studio</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/create/new"
              className="text-gray-600 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded"
              onClick={() => handleCtaClick('landing_primary_cta_click', 'primary', '/create/new')}
            >
              새 프로젝트
            </Link>
            <Link
              href="/create/autopilot"
              className="text-gray-600 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded"
              onClick={() => handleCtaClick('landing_secondary_cta_click', 'secondary', '/create/autopilot')}
            >
              오토파일럿
            </Link>
            {isAuthenticated ? (
              <Link
                href="/projects"
                className="px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                onClick={() => handleCtaClick('landing_tertiary_cta_click', 'tertiary', '/projects')}
              >
                대시보드
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpenLoginModal(true)}
                className="px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 space-y-16">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-violet-500 mb-4">Korea AI Shorts Workflow</p>
            <h1 className="text-5xl md:text-7xl leading-[0.95] font-black [text-wrap:balance]">
              아이디어를
              <br />
              <span className="text-violet-600">매일 업로드 가능한</span>
              <br />
              제작 파이프라인으로
            </h1>
            <p className="mt-8 text-lg text-gray-600 max-w-2xl leading-relaxed">
              AutoVideo는 대본부터 렌더까지 한 흐름으로 연결해, 제작 시간을 줄이고
              운영팀이 일정과 크레딧을 동시에 관리할 수 있게 돕습니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/create/new"
                onClick={() => handleCtaClick('landing_primary_cta_click', 'primary', '/create/new')}
                className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                프로젝트 바로 시작
              </Link>
              <Link
                href="/create/autopilot"
                onClick={() => handleCtaClick('landing_secondary_cta_click', 'secondary', '/create/autopilot')}
                className="px-6 py-3 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors motion-reduce:transition-none font-semibold focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                오토파일럿으로 1차 초안 만들기
              </Link>
              <Link
                href="/projects"
                onClick={() => handleCtaClick('landing_tertiary_cta_click', 'tertiary', '/projects')}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                작업 중인 프로젝트 보기
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">로그인 후 바로 이어서 진행됩니다. 신용카드 등록 없이 시작할 수 있습니다.</p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-100/60">
            <div className="flex items-center justify-between">
              <h2 className="font-bold [text-wrap:balance]">운영팀이 먼저 확인하는 지표</h2>
              <span className="text-xs text-violet-600">Ops Snapshot</span>
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                <p className="text-xs text-gray-500">30초 기준</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">730 크레딧</p>
                <p className="text-xs text-gray-500 mt-1">영상 1편 평균 소모</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                <p className="text-xs text-gray-500">60초 기준</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">1,325 크레딧</p>
                <p className="text-xs text-gray-500 mt-1">컷 수 기반 자동 산정</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-white p-4 sm:col-span-2">
                <p className="text-xs text-gray-500">핵심 자동화 플로우</p>
                <p className="text-sm font-semibold mt-1">Script → TTS → Image → Video → Render</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-4">
              <p className="text-xs text-violet-600">빠른 시작 가이드</p>
              <ol className="mt-2 text-sm space-y-1 text-gray-700 list-decimal pl-5">
                <li>프로젝트 생성으로 기본 세팅 확정</li>
                <li>오토파일럿으로 첫 결과물 초안 확보</li>
                <li>필요 단계만 수동 보정 후 렌더 완료</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-violet-100 bg-white p-6">
            <p className="text-xs text-violet-500 tracking-[0.18em] uppercase">문제</p>
            <h3 className="text-2xl font-black mt-2 [text-wrap:balance]">콘텐츠 팀의 병목은 반복 편집과 일정 지연</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">아이디어는 많지만 대본, 이미지, 렌더가 분리돼 리드타임이 길어짐</li>
              <li className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">담당자마다 스타일이 달라 채널 톤이 흔들림</li>
              <li className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">월 크레딧과 제작량의 상관관계를 체감하기 어려움</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-600 text-white p-6">
            <p className="text-xs text-violet-100 tracking-[0.18em] uppercase">해결</p>
            <h3 className="text-2xl font-black mt-2 [text-wrap:balance]">AutoVideo는 기획과 생산을 한 화면으로 묶습니다</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="rounded-lg bg-white/10 border border-white/15 px-4 py-3">프로젝트 생성 시 모드/스타일/비율을 먼저 잠그고 시작</li>
              <li className="rounded-lg bg-white/10 border border-white/15 px-4 py-3">오토파일럿으로 초안을 빠르게 만든 뒤 필요한 단계만 정밀 수정</li>
              <li className="rounded-lg bg-white/10 border border-white/15 px-4 py-3">대시보드에서 제작량과 크레딧을 함께 관리해 월간 운영 예측 가능</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs text-violet-500 tracking-[0.18em] uppercase">How It Works</p>
              <h3 className="text-2xl font-black mt-2 [text-wrap:balance]">팀에 맞는 생성 경로를 먼저 고르세요</h3>
            </div>
            <span className="text-sm text-gray-500">기본 경로: create/new, 실험 경로: create/autopilot</span>
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-violet-600 font-semibold">STEP 01</p>
              <p className="font-bold mt-1">프로젝트 생성</p>
              <p className="text-gray-600 mt-2">비율/스타일/모드를 선택해 운영 기준을 먼저 고정합니다.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-violet-600 font-semibold">STEP 02</p>
              <p className="font-bold mt-1">초안 자동 생성</p>
              <p className="text-gray-600 mt-2">오토파일럿 또는 단계별 수동 생성으로 첫 버전을 확보합니다.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-violet-600 font-semibold">STEP 03</p>
              <p className="font-bold mt-1">렌더 + 운영</p>
              <p className="text-gray-600 mt-2">완성본을 렌더하고 대시보드에서 다음 제작 사이클을 이어갑니다.</p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch">
          <div className="rounded-2xl border border-violet-100 bg-white p-6">
            <p className="text-xs text-violet-500 tracking-[0.18em] uppercase">Pricing Lite</p>
            <h3 className="text-2xl font-black mt-2 [text-wrap:balance]">크레딧 중심으로 제작 예산을 빠르게 예측</h3>
            <p className="mt-3 text-sm text-gray-600">요금제 상세 고도화 전에도, 팀은 크레딧 단위로 월별 제작량을 계획할 수 있습니다.</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-gray-500 text-xs">Script 생성</p>
                <p className="font-bold mt-1">50 / 회</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-gray-500 text-xs">TTS 생성</p>
                <p className="font-bold mt-1">15 / 세그먼트</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-gray-500 text-xs">Image 생성</p>
                <p className="font-bold mt-1">25 / 세그먼트</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <p className="text-gray-500 text-xs">Video 생성</p>
                <p className="font-bold mt-1">45 / 세그먼트</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-6">
            <p className="text-xs text-violet-500 tracking-[0.18em] uppercase">FAQ</p>
            <h3 className="text-2xl font-black mt-2 [text-wrap:balance]">자주 묻는 질문</h3>
            <div className="mt-4 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.id}
                  className="rounded-lg border border-gray-200 px-4 py-3 group focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2"
                  onToggle={(event) => {
                    if (event.currentTarget.open) {
                      trackLandingEvent({
                        event: 'landing_faq_interaction',
                        path: pathname || '/',
                        faqId: item.id,
                        utm: utmPayload,
                      });
                    }
                  }}
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded">
                    <span>{item.question}</span>
                    <span aria-hidden="true" className="text-violet-500 group-open:rotate-45 transition-transform motion-reduce:transition-none motion-reduce:transform-none">+</span>
                  </summary>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 text-white p-8 lg:p-10">
          <p className="text-xs tracking-[0.18em] uppercase text-violet-100">Final CTA</p>
          <h2 className="text-3xl md:text-4xl font-black mt-2 [text-wrap:balance]">이번 주 콘텐츠 생산 루틴, 오늘 안에 세팅하세요.</h2>
          <p className="mt-3 text-violet-100 max-w-2xl">기본 경로로 시작하고, 필요하면 오토파일럿으로 실험을 병행해 팀의 업로드 주기를 안정화할 수 있습니다.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/create/new"
              className="px-6 py-3 rounded-xl bg-white text-violet-700 font-bold hover:bg-violet-50 transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700"
              onClick={() => handleCtaClick('landing_primary_cta_click', 'primary', '/create/new')}
            >
              create/new로 시작하기
            </Link>
            <Link
              href="/create/autopilot"
              className="px-6 py-3 rounded-xl border border-violet-200/60 text-white font-semibold hover:bg-white/10 transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700"
              onClick={() => handleCtaClick('landing_secondary_cta_click', 'secondary', '/create/autopilot')}
            >
              create/autopilot 열기
            </Link>
          </div>
        </section>
      </main>

      {openLoginModal && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px] focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
            aria-label="로그인 모달 닫기"
            onClick={() => setOpenLoginModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-login-title"
            aria-describedby="landing-login-description"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-violet-100 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="landing-login-title" className="text-xl font-bold text-violet-700">로그인</h3>
                <p id="landing-login-description" className="text-sm text-gray-500 mt-1">Google, Naver, Kakao 중 원하는 계정으로 시작하세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenLoginModal(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
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
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${provider.color}`}
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
