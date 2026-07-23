import { useMemo } from 'react';
import { Modal, Tooltip } from 'antd';
import ReactECharts from 'echarts-for-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toNum, toStr } from '../helpers';
import type { AgentRow } from '../types';

/**
 * 상담사 레이더 비교 — 본인 vs 소속 그룹 평균 vs 전체 평균.
 *
 * 5축:
 *  1. 처리량 (SUM_ANSW_CNT + SUM_OB_SUCC) — 비교군 최대값 대비 %
 *  2. 자율처리율 (1 - SUM_TRNS_OUT / SUM_ANSW_CNT) — 전환 안 할수록 높음
 *  3. 평균 통화시간 (AVG_ANSTALK_TIME) — 짧을수록 점수 높음 (invert)
 *  4. 이석 횟수 (AUX_CNT) — 적을수록 점수 높음 (invert)
 *  5. 이석 시간 (AUX_TIME) — 적을수록 점수 높음 (invert)
 *
 * 모든 축은 "외곽일수록 우수" (higher = better) 로 통일.
 * 3·4·5번 축은 raw 값이 낮을수록 좋은 지표이므로 정규화하면서 invert.
 */
export interface AgentRadarModalProps {
  open: boolean;
  onClose: () => void;
  agent: AgentRow | null;
  /** 전체 상담사 row 목록 (그룹 평균·전체 평균 계산용). */
  allAgents: AgentRow[];
}

const AXES = [
  { key: '처리량', higherBetter: true },
  { key: '자율처리율', higherBetter: true },
  { key: '평균 통화시간', higherBetter: false }, // 짧을수록 좋음 → invert
  { key: '이석 횟수', higherBetter: false },
  { key: '이석 시간', higherBetter: false },
] as const;

/**
 * 한 상담사 row 에서 raw 메트릭 5개 추출. null 은 0 으로 처리.
 * BE 가 미리 계산한 SELF_HANDLE_RATE 와 Redis 가 가진 AVG_ANSTALK_TIME 을 그대로 사용.
 */
function extractRawMetrics(row: AgentRow): RawMetrics {
  const handled = (toNum(row.SUM_ANSW_CNT) ?? 0) + (toNum(row.SUM_OB_SUCC) ?? 0);
  const selfRate = toNum(row.SELF_HANDLE_RATE) ?? 100;
  const avgTalk = toNum(row.AVG_ANSTALK_TIME) ?? 0;
  const auxCnt = toNum(row.AUX_CNT) ?? 0;
  const auxTime = toNum(row.AUX_TIME) ?? 0;
  return { handled, selfRate, avgTalk, auxCnt, auxTime };
}

interface RawMetrics {
  handled: number;
  selfRate: number;
  avgTalk: number; // 초
  auxCnt: number;
  auxTime: number; // 초
}

/** 여러 row 의 raw 평균. */
function averageRaw(rows: AgentRow[]): RawMetrics {
  if (rows.length === 0) {
    return { handled: 0, selfRate: 0, avgTalk: 0, auxCnt: 0, auxTime: 0 };
  }
  const acc: RawMetrics = { handled: 0, selfRate: 0, avgTalk: 0, auxCnt: 0, auxTime: 0 };
  for (const r of rows) {
    const m = extractRawMetrics(r);
    acc.handled += m.handled;
    acc.selfRate += m.selfRate;
    acc.avgTalk += m.avgTalk;
    acc.auxCnt += m.auxCnt;
    acc.auxTime += m.auxTime;
  }
  const n = rows.length;
  return {
    handled: acc.handled / n,
    selfRate: acc.selfRate / n,
    avgTalk: acc.avgTalk / n,
    auxCnt: acc.auxCnt / n,
    auxTime: acc.auxTime / n,
  };
}

/** raw 3 시리즈 → 정규화 5축 점수. 처리량·평균통화·이석은 비교군 max 기준 상대화. */
function normalize(self: RawMetrics, group: RawMetrics, total: RawMetrics) {
  const maxHandled = Math.max(self.handled, group.handled, total.handled, 1);
  const maxAvgTalk = Math.max(self.avgTalk, group.avgTalk, total.avgTalk, 1);
  const maxAuxCnt = Math.max(self.auxCnt, group.auxCnt, total.auxCnt, 1);
  const maxAuxTime = Math.max(self.auxTime, group.auxTime, total.auxTime, 1);

  const toScores = (m: RawMetrics) => [
    Math.min(100, (m.handled / maxHandled) * 100),
    Math.min(100, Math.max(0, m.selfRate)),
    Math.max(0, 100 - (m.avgTalk / maxAvgTalk) * 100),
    Math.max(0, 100 - (m.auxCnt / maxAuxCnt) * 100),
    Math.max(0, 100 - (m.auxTime / maxAuxTime) * 100),
  ];

  return {
    self: toScores(self),
    group: toScores(group),
    total: toScores(total),
  };
}

export default function AgentRadarModal({ open, onClose, agent, allAgents }: AgentRadarModalProps) {
  const data = useMemo(() => {
    if (!agent) return null;
    const groupId = agent.GROUP_ID;
    const groupRows = groupId != null ? allAgents.filter((r) => r.GROUP_ID === groupId) : [];
    const self = extractRawMetrics(agent);
    const group = averageRaw(groupRows);
    const total = averageRaw(allAgents);
    return { self, group, total, scores: normalize(self, group, total), groupRows, allCount: allAgents.length };
  }, [agent, allAgents]);

  const option = useMemo(() => {
    if (!data) return {};
    return {
      tooltip: {
        trigger: 'item',
        confine: true,
      },
      legend: {
        data: ['이 상담사', '소속 그룹 평균', '전체 평균'],
        bottom: 0,
        textStyle: { fontSize: 12, color: '#495057' },
      },
      radar: {
        indicator: AXES.map((a) => ({ name: a.key, max: 100 })),
        center: ['50%', '50%'],
        radius: '65%',
        splitNumber: 4,
        axisName: { color: '#495057', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { areaStyle: { color: ['rgba(250,250,250,0.5)', 'rgba(255,255,255,0)'] } },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: data.scores.self,
              name: '이 상담사',
              areaStyle: { color: 'rgba(59, 130, 246, 0.25)' }, // blue-500
              lineStyle: { color: '#3b82f6', width: 2 },
              itemStyle: { color: '#3b82f6' },
            },
            {
              value: data.scores.group,
              name: '소속 그룹 평균',
              areaStyle: { color: 'rgba(245, 158, 11, 0.18)' }, // amber-500
              lineStyle: { color: '#f59e0b', width: 2 },
              itemStyle: { color: '#f59e0b' },
            },
            {
              value: data.scores.total,
              name: '전체 평균',
              areaStyle: { color: 'rgba(139, 92, 246, 0.15)' }, // violet-500
              lineStyle: { color: '#8b5cf6', width: 2 },
              itemStyle: { color: '#8b5cf6' },
            },
          ],
        },
      ],
    };
  }, [data]);

  if (!agent) return null;

  const name = toStr(agent.AGENT_NAME) || toStr(agent.AGENT_LOGIN_ID) || `AGENT_${agent.AGENT_ID ?? '?'}`;
  const groupName = toStr(agent.GROUP_NAME) || (agent.GROUP_ID != null ? `그룹 ${agent.GROUP_ID}` : '미배정');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-gray-900">{name}</span>
          <span className="text-xs text-gray-500">· {groupName} 그룹 vs 전체 비교</span>
        </div>
      }
      width={680}
      destroyOnHidden
    >
      <div className="space-y-3">
        <ReactECharts option={option} style={{ height: 380 }} notMerge lazyUpdate />

        {data && (
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
              <div className="font-semibold text-gray-400">지표</div>
              <div className="text-right font-semibold text-blue-700">본인</div>
              <div className="text-right font-semibold text-amber-700">그룹 평균 ({data.groupRows.length}명)</div>
              <div className="text-right font-semibold text-violet-700">전체 평균 ({data.allCount}명)</div>

              <Row label="처리량" direction="up" self={fmtNum(data.self.handled)} group={fmtNum(data.group.handled, 1)} total={fmtNum(data.total.handled, 1)} />
              <Row label="자율처리율" direction="up" self={fmtPct(data.self.selfRate)} group={fmtPct(data.group.selfRate)} total={fmtPct(data.total.selfRate)} />
              <Row label="평균 통화시간" direction="down" self={fmtDuration(data.self.avgTalk)} group={fmtDuration(data.group.avgTalk)} total={fmtDuration(data.total.avgTalk)} />
              <Row label="이석 횟수" direction="down" self={fmtNum(data.self.auxCnt)} group={fmtNum(data.group.auxCnt, 1)} total={fmtNum(data.total.auxCnt, 1)} />
              <Row label="이석 시간" direction="down" self={fmtDuration(data.self.auxTime)} group={fmtDuration(data.group.auxTime)} total={fmtDuration(data.total.auxTime)} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface RowProps {
  label: string;
  /** up = 높을수록 우수 / down = 낮을수록 우수 (레이더 외곽 점수 방향). 둘 다 "지향 방향" 의미. */
  direction: 'up' | 'down';
  self: string;
  group: string;
  total: string;
}
function Row({ label, direction, self, group, total }: RowProps) {
  const isUp = direction === 'up';
  const tip = isUp ? '값이 높을수록 우수' : '값이 낮을수록 우수';
  return (
    <>
      <span className="flex items-center gap-1.5 text-gray-700">
        <Tooltip title={tip} placement="right">
          <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {isUp ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
          </span>
        </Tooltip>
        <span>{label}</span>
      </span>
      <span className="text-right font-mono tabular-nums text-blue-700">{self}</span>
      <span className="text-right font-mono tabular-nums text-amber-700">{group}</span>
      <span className="text-right font-mono tabular-nums text-violet-700">{total}</span>
    </>
  );
}

function fmtPct(v: number): string {
  return `${Math.round(v)}%`;
}
function fmtNum(v: number, fractionDigits = 0): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
}
function fmtDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
