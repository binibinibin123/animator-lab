'use client';

import Link from 'next/link';

const highlights = [
  {
    title: 'Story Bible',
    description: '로그라인, 캐릭터, 세계관, 스타일 규칙을 작품 단위 기준으로 정리합니다.',
  },
  {
    title: 'Shot Board',
    description: '대사, 화면 설명, 카메라워크, 액션, 조명, 감정을 컷 단위로 분해합니다.',
  },
  {
    title: 'Model Lab',
    description: 'GPT Image 2, LTX-2.3 Fast, Kling, Sora, ComfyUI 옵션을 비교할 수 있게 구성했습니다.',
  },
];

const workflow = ['아이디어 입력', '스토리 바이블', '컷보드', '이미지/모션 테이크', '편집/렌더'];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link href="/" className="text-lg font-black tracking-tight">
            Animator Lab
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/create/new" className="rounded-full border border-slate-300 px-4 py-2 hover:bg-white">
              새 작품
            </Link>
            <Link href="/projects" className="rounded-full bg-slate-950 px-4 py-2 text-white hover:bg-slate-800">
              작업대 열기
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              AI animation production workflow
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
              서사를 가진 AI 애니메이션을 컷 단위로 설계하고 검증하는 제작 툴
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Animator Lab은 AI 애니메이션 제작 흐름을 컷 단위로 관리하는 작업대입니다.
              주제 입력에서 스토리 바이블, 컷보드, 모델별 take 비교, Remotion 렌더까지 이어지는 흐름을
              하나의 작업대로 묶었습니다.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/create/new" className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                새 애니메이션 만들기
              </Link>
              <Link href="/create/autopilot" className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-50">
                Autopilot 보기
              </Link>
              <Link href="/projects" className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-black hover:bg-white">
                작품 목록 보기
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Current defaults</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Image model</p>
                  <p className="mt-1 text-2xl font-black">GPT Image 2 medium</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Video model</p>
                  <p className="mt-1 text-2xl font-black">LTX-2.3 Fast</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Local option</p>
                  <p className="mt-1 text-2xl font-black">ComfyUI ready</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-black">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold">{step}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
