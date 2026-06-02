import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  /** 헤더 우측 영역 (액션·뱃지 등) */
  extra?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** 대시보드 패널 공통 크롬 — 흰 카드 + 헤더(타이틀/서브타이틀) + 본문 */
export default function DashboardPanel({ title, subtitle, extra, className = '', bodyClassName = '', children }: Props) {
  return (
    <section className={`flex flex-col rounded-lg border border-slate-200/80 bg-white bt-shadow ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight text-slate-800">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
        {extra && <div className="shrink-0">{extra}</div>}
      </header>
      <div className={`flex-1 p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
