import { Tooltip } from 'antd';
import DashboardPanel from './DashboardPanel';
import { LLM_VISIBLE_MODELS, MODEL_GRADIENTS, OTHERS_GRADIENT } from '../constants/dashboardConstants';
import type { AoeLlmModel } from '../types';
import NoData from '@/components/custom/NoData';

interface Props {
  models?: AoeLlmModel[];
}

interface Bar {
  key: string;
  name: string;
  provider?: string;
  pct: number;
  from: string;
  to: string;
  /** '기타' 묶음에 포함된 모델 목록 (툴팁용) */
  items?: { name: string; pct: number }[];
}

const intFmt = (v: number) => v.toLocaleString('ko-KR');
const usdFmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

/** ratio가 0~1 비율이면 %로 환산, 아니면 그대로 사용 */
const toPercent = (ratio?: number) => {
  const r = ratio ?? 0;
  return r <= 1 ? Math.round(r * 1000) / 10 : Math.round(r * 10) / 10;
};

/** LLM 사용 구성 — 상위 N개 모델 그라데이션 진행바(+기타 묶음) + 호출/과금/토큰 미니 스탯 */
export default function LlmUsagePanel({ models }: Props) {
  // 화면 표기(%)와 일치하도록 ratio 기준 정렬 (동률이면 callCount)
  const rows = [...(models ?? [])].sort((a, b) => toPercent(b.ratio) - toPercent(a.ratio) || (b.callCount ?? 0) - (a.callCount ?? 0));
  const totalCalls = rows.reduce((s, m) => s + (m.callCount ?? 0), 0);
  const totalCost = rows.reduce((s, m) => s + (m.cost ?? 0), 0);
  const avgTokens = totalCalls ? Math.round(rows.reduce((s, m) => s + (m.avgTokensPerCall ?? 0) * (m.callCount ?? 0), 0) / totalCalls) : 0;

  // 상위 N개는 개별 바, 나머지는 '기타 N종'으로 합산
  const head = rows.slice(0, LLM_VISIBLE_MODELS);
  const rest = rows.slice(LLM_VISIBLE_MODELS);
  const bars: Bar[] = head.map((m, i) => {
    const [from, to] = MODEL_GRADIENTS[i % MODEL_GRADIENTS.length];
    return {
      key: `${m.provider}:${m.modelName}`,
      name: m.modelName || m.provider,
      provider: m.modelName ? m.provider : undefined,
      pct: toPercent(m.ratio),
      from,
      to,
    };
  });
  if (rest.length > 0) {
    bars.push({
      key: 'others',
      name: '기타',
      provider: `${rest.length}종`,
      pct: Math.round(rest.reduce((s, m) => s + toPercent(m.ratio), 0) * 10) / 10,
      from: OTHERS_GRADIENT[0],
      to: OTHERS_GRADIENT[1],
      items: rest.map((m) => ({
        name: m.modelName ? `${m.modelName} (${m.provider})` : m.provider,
        pct: toPercent(m.ratio),
      })),
    });
  }

  return (
    <DashboardPanel title="LLM 사용 구성" subtitle="모델별 호출 비율 및 평균 사용 지표" className="h-full">
      {rows.length === 0 ? (
        <NoData className="py-16" />
      ) : (
        <div className="flex h-full flex-col gap-5">
          {/* 모델별 그라데이션 진행바 */}
          <ul className="flex flex-col gap-3.5">
            {bars.map((b) => (
              <li key={b.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  {b.items ? (
                    <Tooltip
                      title={
                        <ul className="flex flex-col gap-1 py-0.5">
                          {b.items.map((it) => (
                            <li key={it.name} className="flex items-center justify-between gap-4 text-xs">
                              <span>{it.name}</span>
                              <span className="font-semibold tabular-nums">{it.pct}%</span>
                            </li>
                          ))}
                        </ul>
                      }
                    >
                      <span className="flex cursor-help items-center gap-2 font-medium text-slate-700">
                        <span className="size-2 rounded-full" style={{ backgroundColor: b.from }} />
                        <span className="border-b border-dashed border-slate-300">{b.name}</span>
                        {b.provider && <span className="text-[11px] font-normal text-slate-400">{b.provider}</span>}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className="size-2 rounded-full" style={{ backgroundColor: b.from }} />
                      {b.name}
                      {b.provider && <span className="text-[11px] font-normal text-slate-400">{b.provider}</span>}
                    </span>
                  )}
                  <span className="font-bold tabular-nums text-slate-900">{b.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.min(b.pct, 100)}%`,
                      backgroundImage: `linear-gradient(90deg, ${b.from}, ${b.to})`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* 미니 스탯 — 전체 모델 합산 */}
          <div className="mt-auto grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            <MiniStat label="LLM 호출 수" value={intFmt(totalCalls)} />
            <MiniStat label="LLM 과금" value={usdFmt(totalCost)} />
            <MiniStat label="평균 토큰" value={intFmt(avgTokens)} />
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50/70 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-[17px] font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
