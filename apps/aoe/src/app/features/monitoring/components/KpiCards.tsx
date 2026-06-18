import { Activity, CheckCircle2, Coins, Cpu, DollarSign, LoaderCircle, type LucideIcon, MessagesSquare, PhoneIncoming } from 'lucide-react';
import { KPI_ACCENTS } from '../constants/dashboardConstants';
import type { AoeSummary } from '../types';

interface Props {
  summary?: AoeSummary;
}

interface KpiItem {
  title: string;
  value: string;
  caption: string;
  accent: string;
  icon: LucideIcon;
}

const n = (v?: number) => v ?? 0;
const intFmt = (v?: number) => n(v).toLocaleString('ko-KR');
const decFmt = (v?: number) => n(v).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const usdFmt = (v?: number) => `$${n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

/** 요약 KPI 카드 (8지표) — 캡션·굵은 숫자·악센트 아이콘 */
export default function KpiCards({ summary }: Props) {
  const items: KpiItem[] = [
    { title: '당일 인입 콜 수', value: intFmt(summary?.todayInboundCalls), caption: '금일 누적 기준', accent: KPI_ACCENTS.primary, icon: PhoneIncoming },
    { title: '진행 중 콜 수', value: intFmt(summary?.inProgressCalls), caption: '현재 실시간 기준', accent: KPI_ACCENTS.amber, icon: LoaderCircle },
    { title: '완료 콜 수', value: intFmt(summary?.completedCalls), caption: '정상 종료 누적', accent: KPI_ACCENTS.emerald, icon: CheckCircle2 },
    { title: '콜당 평균 대화수', value: decFmt(summary?.avgTurnsPerCall), caption: '전체 콜 평균', accent: KPI_ACCENTS.violet, icon: MessagesSquare },
    { title: '당일 LLM 호출수', value: intFmt(summary?.todayLlmCalls), caption: '모든 모델 합산', accent: KPI_ACCENTS.primary, icon: Cpu },
    { title: '당일 LLM 과금', value: usdFmt(summary?.todayLlmCost), caption: '누적 비용 기준', accent: KPI_ACCENTS.rose, icon: DollarSign },
    { title: '콜당 평균 LLM 호출', value: decFmt(summary?.avgLlmCallsPerCall), caption: '인입 콜 대비', accent: KPI_ACCENTS.slate, icon: Activity },
    { title: '콜당 평균 과금', value: usdFmt(summary?.avgCostPerCall), caption: '완료/진행 포함', accent: KPI_ACCENTS.emerald, icon: Coins },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ title, value, caption, accent, icon: Icon }) => (
        <div
          key={title}
          className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]"
        >
          {/* 좌측 악센트 바 */}
          <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full opacity-80" style={{ backgroundColor: accent }} />
          <div className="flex items-start justify-between gap-2 pl-1.5">
            <p className="text-[12.5px] font-medium leading-tight text-slate-500">{title}</p>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <Icon className="size-[15px]" strokeWidth={2.2} />
            </span>
          </div>
          <p className="mt-2 pl-1.5 text-[26px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">{value}</p>
          <p className="mt-2 pl-1.5 text-[11px] font-medium text-slate-400">{caption}</p>
        </div>
      ))}
    </div>
  );
}
