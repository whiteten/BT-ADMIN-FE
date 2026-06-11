import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import { AlertTriangle, Info, Server, Users, Zap } from 'lucide-react';
import { TRUNK_SEV_BG, TRUNK_SEV_TEXT, fmtRate, toTrunkData, trunkSevRank } from './helpers';
import type { TrunkEndpointState, TrunkFlowData, TrunkGroup, TrunkLine, TrunkLineStatus, TrunkNode, TrunkSeverity } from './types';
import { mosLevel } from '../agent-status/helpers';
import { MOS_META } from '../agent-status/parts/MosLegend';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/libs/shared-ui/src/components/shadcn/hover-card';

/**
 * 트렁크 회선현황 (흐름) 위젯 — CSS 3컬럼(폭 꽉) + SVG 연결선.
 *
 * 시안: docs/insight/monitoring/mvp-design/wireframes/07f-endpoint-member-node-sip-flow.html (AS-IS trunkStatus.jsp 계승)
 * - 좌: 엔드포인트(국선) — 컴팩트, <b>마우스오버 시 멤버(IE:ENDPT_MEMBER)</b> 팝오버
 * - 중: 노드(PBX) — 회선 NODE_ID 합산(파생)
 * - 우: SIP 트렁크(IE:TRUNK) — 각 트렁크 모두 + 개별 라인(state-line)
 * 카드는 CSS Grid 로 컬럼을 꽉 채우고(헤더와 정렬), 연결선(엔드포인트→노드, 노드→각 트렁크)은
 * 카드 실제 DOM 위치를 측정해 SVG 오버레이로 그린다(리사이즈/데이터 갱신 시 자동 재계산).
 */
export interface TrunkFlowWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

const SEV_HEX: Record<TrunkSeverity, string> = { normal: '#0a8a4a', warning: '#b76e00', saturated: '#b76e00', critical: '#c92a2a' };
const SEV_W: Record<TrunkSeverity, number> = { normal: 1.5, warning: 2, saturated: 2, critical: 2.6 };
const STATUS_DOT: Record<TrunkLineStatus, string> = {
  normal: 'bg-bt-success',
  unregistered: 'bg-bt-danger',
  block: 'bg-bt-danger',
  error: 'bg-bt-danger',
  unused: 'bg-bt-border-strong',
};
const STATUS_LABEL: Record<TrunkLineStatus, string> = { normal: '정상', unregistered: '미등록', block: '블록', error: '에러', unused: '미사용' };
// 미등록(REGI_STATUS=0)은 종합 헬스보드(registered===0 → text-bt-danger)와 동일하게 위험색(red).
const STATUS_SOFT: Record<TrunkLineStatus, string> = {
  normal: 'bg-bt-success-soft text-bt-success',
  unregistered: 'bg-bt-danger-soft text-bt-danger',
  block: 'bg-bt-danger-soft text-bt-danger',
  error: 'bg-bt-danger-soft text-bt-danger',
  unused: 'bg-bt-bg-muted text-bt-fg-muted',
};

// 컬럼 그리드 — [엔드포인트존 | 라인 | 노드존 | 라인 | 트렁크존].
// 존은 카드보다 살짝 큰 고정폭, 가운데 minmax(1fr) 두 칸은 연결선이 흐르는 열린 공간.
const COLS = 'grid grid-cols-[354px_minmax(48px,1fr)_300px_minmax(48px,1fr)_354px]';

interface Section {
  node: TrunkNode;
  eps: TrunkGroup[];
  trks: TrunkGroup[];
}
interface EdgeDef {
  id: string;
  from: string;
  to: string;
  sev: TrunkSeverity;
}
interface EdgePath {
  id: string;
  d: string;
  sev: TrunkSeverity;
}

export default function TrunkFlowWidget({ data }: TrunkFlowWidgetProps) {
  const d = useMemo<TrunkFlowData>(() => toTrunkData(data), [data]);
  const sections = useMemo(() => buildSections(d), [d]);
  const edges = useMemo<EdgeDef[]>(() => buildEdges(sections), [sections]);

  const contentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<EdgePath[]>([]);
  const [svg, setSvg] = useState({ w: 0, h: 0 });

  const setRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    [],
  );

  const recompute = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const c = content.getBoundingClientRect();
    const next: EdgePath[] = [];
    for (const e of edges) {
      const a = cardRefs.current.get(e.from);
      const b = cardRefs.current.get(e.to);
      if (!a || !b) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const fx = ar.right - c.left;
      const fy = ar.top + ar.height / 2 - c.top;
      const tx = br.left - c.left;
      const ty = br.top + br.height / 2 - c.top;
      if (tx <= fx) continue; // 같은 컬럼(스택형) 등 비정상 좌표 방지
      const dx = Math.max(24, (tx - fx) * 0.45);
      next.push({ id: e.id, d: `M${fx},${fy} C${fx + dx},${fy} ${tx - dx},${ty} ${tx},${ty}`, sev: e.sev });
    }
    setPaths(next);
    setSvg({ w: content.clientWidth, h: content.scrollHeight });
  }, [edges]);

  useLayoutEffect(() => {
    recompute();
    const id = window.setTimeout(recompute, 60); // 폰트/호버카드 등 비동기 레이아웃 보정
    return () => window.clearTimeout(id);
  }, [recompute, d]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(content);
    return () => ro.disconnect();
  }, [recompute]);

  return (
    <div className="flex h-full flex-col bg-bt-bg-canvas p-3">
      {sections.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-bt-border bg-bt-bg py-10 text-[13px] text-bt-fg-muted">
          트렁크 데이터 없음
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-bt-border bg-bt-bg bt-shadow">
          <div ref={contentRef} className="relative min-w-[1200px] px-12 py-3">
            {/* 영역(zone) 배경 — 카드를 살짝 감싸는 폭만. 가운데 빈 칸은 연결선 공간 */}
            <div className={`pointer-events-none absolute inset-x-12 inset-y-3 z-0 ${COLS}`}>
              <div className="overflow-hidden rounded-xl border border-bt-warn/15 bg-bt-warn-soft/[0.10]">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-bt-warn/70">엔드포인트 (국선)</div>
              </div>
              <div aria-hidden />
              <div className="overflow-hidden rounded-xl border border-bt-border bg-bt-bg-muted/40">
                <div className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-bt-fg-muted">노드</div>
              </div>
              <div aria-hidden />
              <div className="overflow-hidden rounded-xl border border-bt-primary/15 bg-bt-primary-soft/[0.10]">
                <div className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-bt-primary/70">SIP 트렁크</div>
              </div>
            </div>
            {/* 연결선 (카드 뒤, 영역 위) */}
            <svg className="pointer-events-none absolute inset-0 z-0" width={svg.w} height={svg.h}>
              <defs>
                {(['normal', 'warning', 'critical'] as TrunkSeverity[]).map((s) => (
                  <marker key={s} id={`tf-arrow-${s}`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                    <path d="M0 0 L6 3.5 L0 7 Z" fill={SEV_HEX[s]} />
                  </marker>
                ))}
              </defs>
              {paths.map((p) => (
                <path
                  key={p.id}
                  d={p.d}
                  fill="none"
                  stroke={SEV_HEX[p.sev]}
                  strokeWidth={SEV_W[p.sev]}
                  markerEnd={`url(#tf-arrow-${p.sev === 'saturated' ? 'warning' : p.sev})`}
                  strokeDasharray={p.sev === 'critical' ? '6 5' : undefined}
                >
                  {p.sev === 'critical' && <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1s" repeatCount="indefinite" />}
                </path>
              ))}
            </svg>

            {/* 노드별 밴드 — 영역 라벨 아래로 */}
            <div className="relative z-10 flex flex-col gap-6 pt-9">
              {sections.map((s) => (
                <Band key={s.node.nodeId ?? s.node.nodeName} section={s} setRef={setRef} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildSections(d: TrunkFlowData): Section[] {
  const byNode = new Map<number | null, TrunkGroup[]>();
  for (const g of d.groups) {
    const arr = byNode.get(g.nodeId);
    if (arr) arr.push(g);
    else byNode.set(g.nodeId, [g]);
  }
  const sortG = (l: TrunkGroup[]) => [...l].sort((a, b) => trunkSevRank(b.severity) - trunkSevRank(a.severity) || b.rate - a.rate);
  const ordered: (number | null)[] = [];
  const seen = new Set<number | null>();
  for (const n of d.nodes)
    if (byNode.has(n.nodeId)) {
      ordered.push(n.nodeId);
      seen.add(n.nodeId);
    }
  for (const k of byNode.keys()) if (!seen.has(k)) ordered.push(k);
  const nodeById = new Map(d.nodes.map((n) => [n.nodeId, n]));

  return ordered.map((nid) => {
    const groups = byNode.get(nid) ?? [];
    return {
      node: nodeById.get(nid) ?? deriveNode(nid, groups),
      eps: sortG(groups.filter((g) => g.kind === 'CO')),
      trks: sortG(groups.filter((g) => g.kind !== 'CO')),
    };
  });
}
function buildEdges(sections: Section[]): EdgeDef[] {
  const list: EdgeDef[] = [];
  for (const s of sections) {
    const nodeKey = `node:${s.node.nodeId ?? 'x'}`;
    // 엔드포인트→노드 선은 GW 자신의 state 만 반영(멤버 롤업 제외). SIP→노드 선은 그대로 severity.
    for (const g of s.eps) list.push({ id: `${g.groupKey}->n`, from: `ep:${g.groupKey}`, to: nodeKey, sev: g.state === 'normal' ? 'normal' : 'critical' });
    for (const g of s.trks) list.push({ id: `n->${g.groupKey}`, from: nodeKey, to: `trk:${g.groupKey}`, sev: g.severity });
  }
  return list;
}
function deriveNode(nid: number | null, groups: TrunkGroup[]): TrunkNode {
  const busy = groups.reduce((s, g) => s + g.busyLine, 0);
  const reg = groups.reduce((s, g) => s + g.regLine, 0);
  return {
    nodeId: nid,
    nodeName: groups[0]?.nodeName ?? '노드',
    rate: reg === 0 ? 0 : Math.round((busy / reg) * 100),
    busyLine: busy,
    regLine: reg,
    totalLine: groups.reduce((s, g) => s + g.totalLine, 0),
    riskCnt: groups.filter((g) => g.severity === 'critical').length,
    warnCnt: groups.filter((g) => g.severity === 'warning' || g.severity === 'saturated').length,
    normalCnt: groups.filter((g) => g.severity === 'normal').length,
    hasSystem: false,
    cps: 0,
    co: EMPTY_LEG,
    trk: EMPTY_LEG,
    ext: EMPTY_LEG,
    licOver: 0,
    cumCnt: 0,
    coPeak: 0,
    useMd: false,
    useDrSync: false,
  };
}
const EMPTY_LEG = { busy: 0, reg: 0, block: 0, lic: 0, inBusy: 0, outBusy: 0, att: 0 };

// ─── 노드 밴드 (3컬럼: 엔드포인트 | 노드 | 트렁크) ──────────────────
function Band({ section: s, setRef }: { section: Section; setRef: (id: string) => (el: HTMLDivElement | null) => void }) {
  return (
    <div className={`${COLS} items-center`}>
      {/* 엔드포인트 영역 (카드를 가운데 정렬해 존 안에 살짝 여백) */}
      <div className="flex flex-col items-center gap-2.5">
        {s.eps.length > 0 ? (
          s.eps.map((g) => (
            <div key={g.groupKey} ref={setRef(`ep:${g.groupKey}`)} className="w-[284px] max-w-full">
              <EndpointCard group={g} />
            </div>
          ))
        ) : (
          <Empty />
        )}
      </div>
      <div aria-hidden /> {/* 연결선 공간 */}
      {/* 노드 영역 */}
      <div className="flex justify-center">
        <div ref={setRef(`node:${s.node.nodeId ?? 'x'}`)}>
          <NodeCard node={s.node} />
        </div>
      </div>
      <div aria-hidden /> {/* 연결선 공간 */}
      {/* 트렁크 영역 */}
      <div className="flex flex-col items-center gap-2.5">
        {s.trks.length > 0 ? (
          s.trks.map((g) => (
            <div key={g.groupKey} ref={setRef(`trk:${g.groupKey}`)} className="w-[284px] max-w-full">
              <TrunkCard group={g} />
            </div>
          ))
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}
function Empty() {
  return <div className="rounded-lg border border-dashed border-bt-border px-3 py-4 text-center text-[11px] text-bt-fg-muted">없음</div>;
}

// 부모 GW 상태 (AS-IS trunkStatus.jsp 동일: 정상/오류(Alive비정상)/블록).
// 상태 시각요소(막대/프레임/pulse/배지)는 모두 이 state(BLOCK/STATUS) 만으로 구동 — 점유율(rate) 미반영.
const EP_STATE: Record<TrunkEndpointState, { label: string; cls: string; bar: string; text: string; frame: string; pulse: boolean }> = {
  normal: { label: '정상', cls: 'bg-bt-success-soft text-bt-success', bar: 'bg-bt-success', text: 'text-bt-success', frame: 'border-bt-border bg-bt-bg', pulse: false },
  error: { label: '오류', cls: 'bg-bt-danger-soft text-bt-danger', bar: 'bg-bt-danger', text: 'text-bt-danger', frame: 'border-bt-danger/45 bg-bt-danger-soft/15', pulse: true },
  block: { label: '블록', cls: 'bg-bt-danger-soft text-bt-danger', bar: 'bg-bt-danger', text: 'text-bt-danger', frame: 'border-bt-danger/45 bg-bt-danger-soft/15', pulse: true },
};

// ─── 엔드포인트 카드 (상단 컬러 상태 · 채널 사용/전체 · 바+우측% · 멤버는 호버) ───
function EndpointCard({ group: g }: { group: TrunkGroup }) {
  const st = EP_STATE[g.state]; // 상태 시각요소·점유 표기색 모두 producer 상태값(state) 기반 — 임계(rate)로 상태를 만들진 않음
  const memIssue = g.lineStat.unregistered + g.lineStat.block + g.lineStat.error; // 멤버 알람 수(미등록+블록+에러)
  return (
    <div className={`w-full overflow-hidden rounded-lg border bt-shadow ${st.frame} ${st.pulse ? 'bt-pulse-ring' : ''}`}>
      {/* 상단 컬러 상태 막대 — state(BLOCK/STATUS) 기반, 점유율과 무관 */}
      <div className={`h-1.5 w-full ${st.bar} ${st.pulse ? 'bt-pulse' : ''}`} />
      <div className="p-3.5">
        {/* 헤더 — 이름 · 멤버 칩(호버 시에만 멤버 패널) · 상태 배지 */}
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold" title={g.name}>
            {g.name}
          </span>
          <HoverCard openDelay={80} closeDelay={80}>
            <HoverCardTrigger asChild>
              <span
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors hover:brightness-95 ${memIssue > 0 ? 'bg-bt-danger-soft text-bt-danger' : 'bg-bt-bg-muted text-bt-fg-muted'}`}
              >
                <Users className="h-3 w-3" />
                {g.lines.length}
                {memIssue > 0 && <span className="font-bold">· 이상 {memIssue}</span>}
              </span>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="start" sideOffset={10} className="w-80 overflow-hidden border-bt-border bg-bt-bg p-0 text-bt-fg shadow-lg">
              <MemberPanel group={g} />
            </HoverCardContent>
          </HoverCard>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
        </div>
        {/* 채널 정보 — 사용/전체(좌) · 수신/발신(우). 사용 숫자는 상태색을 따름 */}
        <div className="mt-2.5 flex items-baseline justify-between gap-2 tabular-nums">
          <span className="flex items-baseline gap-1">
            <span className="text-[11px] font-medium text-bt-fg-muted">사용</span>
            <span className={`text-[24px] font-extrabold leading-none ${st.text}`}>{g.busyLine}</span>
            <span className="text-[14px] font-bold leading-none text-bt-fg-muted">/ {g.totalLine}</span>
            <span className="text-[11px] text-bt-fg-muted">ch</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium text-bt-fg-muted">수신</span>
            <span className="text-[24px] font-extrabold leading-none text-bt-fg">{g.inBusy}</span>
            <span className="text-[11px] font-medium text-bt-fg-muted">발신</span>
            <span className="text-[24px] font-extrabold leading-none text-bt-fg">{g.outBusy}</span>
          </span>
        </div>
        {/* 점유 바 + 우측 고정 % — 채움·% 모두 상태색. 진한 채움=현재, 가는 틱=당일 피크 */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bt-bg-muted">
            <div className={`absolute inset-y-0 left-0 rounded-full ${st.bar}`} style={{ width: `${Math.min(100, g.rate)}%` }} />
            {g.peakBusy > 0 && g.totalLine > 0 && (
              <span className="absolute inset-y-0 w-0.5 bg-bt-fg-muted" style={{ left: `${Math.min(100, (g.peakBusy / g.totalLine) * 100)}%` }} />
            )}
          </div>
          <span className={`w-12 shrink-0 text-right text-[15px] font-extrabold leading-none tabular-nums ${st.text}`}>{fmtRate(g.rate)}%</span>
        </div>
        {/* 당일 피크 · LIC 초과 거부콜 — 항상 노출, 수신/발신과 동일한 plain 스타일 */}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] tabular-nums text-bt-fg-muted">
          <span>
            당일 피크 <b className="text-bt-fg">{g.peakBusy}</b>ch
          </span>
          <span className={g.licOver > 0 ? 'inline-flex items-center gap-1 font-bold text-bt-danger' : ''}>
            {g.licOver > 0 && <AlertTriangle className="h-3 w-3" />}LIC초과 <b className={g.licOver > 0 ? 'text-bt-danger' : 'text-bt-fg'}>{g.licOver}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

/** 멤버 행 점유 칩 — 수신/발신: 점유(강조)·피크. */
function MemberMetric({ label, busy, pick }: { label: string; busy: number; pick: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded bg-bt-bg-muted px-1.5 py-0.5 tabular-nums">
      <span className="text-[11px] text-bt-fg-muted">{label}</span>
      <b className={`text-[11.5px] ${busy > 0 ? 'text-bt-primary' : 'text-bt-fg'}`}>{busy}</b>
      <span className="text-[11px] text-bt-fg-muted">피크 {pick}</span>
    </span>
  );
}

function MemberPanel({ group: g }: { group: TrunkGroup }) {
  return (
    <div className="flex flex-col">
      {/* 헤더 — GW명 · 멤버수 (점유/회선 요약은 엔드포인트 카드와 중복이라 제거) */}
      <div className="flex items-center justify-between gap-2 border-b border-bt-border bg-bt-bg-muted/40 px-3.5 py-2.5">
        <div className="min-w-0 truncate text-[13px] font-bold" title={g.name}>
          {g.name}
        </div>
        <span className="shrink-0 rounded-md bg-bt-bg px-2 py-1 text-[11px] font-bold tabular-nums text-bt-fg">멤버 {g.lines.length}</span>
      </div>
      {g.lines.length === 0 ? (
        <div className="px-3.5 py-5 text-center text-[11px] text-bt-fg-muted">멤버 정보 없음</div>
      ) : (
        <ul className="max-h-80 divide-y divide-bt-border/50 overflow-y-auto">
          {g.lines.map((m, i) => {
            const mosLv = mosLevel(m.mos); // 상담사 현황과 동일한 6단계 분류
            const mosMeta = mosLv ? MOS_META[mosLv] : null;
            const mosDisplay = m.mos >= 1.0 ? m.mos.toFixed(1) : null;
            const abnormal = m.status !== 'normal';
            return (
              <li key={m.trkId ?? i} className="px-3.5 py-2 transition-colors hover:bg-bt-bg-muted/60">
                {/* 1행 — 상태 라인: dot · 이름 · 상태 라벨 · MoS(상담사 현황 카드와 동일 pill) */}
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[m.status]}`} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-bt-fg" title={m.name}>
                    {m.name}
                  </span>
                  {abnormal && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${STATUS_SOFT[m.status]}`}>{STATUS_LABEL[m.status]}</span>}
                  {mosMeta && mosDisplay && (
                    <Tooltip title={`MoS ${mosDisplay} · ${mosMeta.label} (${mosMeta.range})`} placement="top">
                      <span className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-full border border-bt-border bg-bt-bg-muted px-1.5 py-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${mosMeta.dotBg}`} />
                        <span className={`text-[11px] font-bold tabular-nums ${mosMeta.text}`}>{mosDisplay}</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
                {/* 2행 — IP · 수신/발신 점유 칩 */}
                <div className="mt-1.5 flex items-center gap-1.5 pl-4">
                  {m.ip && <span className="min-w-0 truncate text-[11px] tabular-nums text-bt-fg-muted">{m.ip}</span>}
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <MemberMetric label="수신" busy={m.inBusy} pick={m.inPick} />
                    <MemberMetric label="발신" busy={m.outBusy} pick={m.outPick} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── 노드 카드 (IE:SYSTEM — CPS · 국선/내선/트렁크 게이지 · 피크/누적/LIC초과 · 구성) ──
function NodeCard({ node: n }: { node: TrunkNode }) {
  return (
    <div className="flex w-[268px] flex-col rounded-xl border-2 border-bt-border bg-bt-bg px-4 py-3.5 bt-shadow">
      {/* 헤더 — 노드명(좌) · 구성 배지(우) */}
      <div className="flex items-center gap-1.5">
        <Server className="h-4 w-4 shrink-0 text-bt-fg-muted" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold" title={n.nodeName}>
          {n.nodeName}
        </span>
        {n.hasSystem && (n.useMd || n.useDrSync) && (
          <span className="flex shrink-0 items-center gap-1">
            {n.useMd && (
              <span className="rounded bg-bt-bg-muted px-1 py-px text-[11px] font-bold text-bt-fg-muted" title="미디어딜리버리 사용">
                MD
              </span>
            )}
            {n.useDrSync && (
              <span className="rounded bg-bt-bg-muted px-1 py-px text-[11px] font-bold text-bt-fg-muted" title="DR 동기화 사용">
                DR
              </span>
            )}
          </span>
        )}
      </div>
      {/* CPS — 초당 콜 유입 */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <Zap className="h-5 w-5 text-bt-warn" strokeWidth={2} fill="currentColor" />
        <span className="text-[30px] font-extrabold leading-none tabular-nums text-bt-fg">{fmtRate(n.cps)}</span>
        <span className="text-[12px] font-bold text-bt-fg-muted">CPS</span>
        <Tooltip title="초당 콜 유입 · 최근 5초 평균" placement="top">
          <Info className="size-3.5 cursor-help text-bt-fg-muted/70" />
        </Tooltip>
      </div>
      {n.hasSystem ? (
        <>
          {/* 3대 자원 게이지 — 점유 / 등록 */}
          <div className="mt-2.5 flex flex-col gap-1.5 border-t border-bt-border pt-2.5">
            <NodeResource label="국선" busy={n.co.busy} reg={n.co.reg} extra={n.co.block > 0 ? <span className="font-bold text-bt-danger">블록 {n.co.block}</span> : null} />
            <NodeResource
              label="내선"
              busy={n.ext.busy}
              reg={n.ext.reg}
              extra={n.ext.block > 0 ? <span className="font-bold text-bt-danger">블록 {n.ext.block}</span> : <span className="text-bt-fg-muted">좌석 {n.ext.att}</span>}
            />
            <NodeResource label="트렁크" busy={n.trk.busy} reg={n.trk.reg} extra={n.trk.block > 0 ? <span className="font-bold text-bt-danger">블록 {n.trk.block}</span> : null} />
          </div>
          {/* 보조 — 국선 피크/누적 · 시스템 LIC초과 손실 */}
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-bt-border pt-2 text-[11px] tabular-nums text-bt-fg-muted">
            <span>
              국선피크 <b className="text-bt-fg">{n.coPeak}</b> · 누적 <b className="text-bt-fg">{n.cumCnt}</b>콜
            </span>
            <span className={n.licOver > 0 ? 'inline-flex items-center gap-1 font-bold text-bt-danger' : ''}>
              {n.licOver > 0 && <AlertTriangle className="h-3 w-3" />}LIC초과 <b className={n.licOver > 0 ? 'text-bt-danger' : 'text-bt-fg'}>{n.licOver}</b>
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 border-t border-bt-border pt-2 text-center text-[11px] text-bt-fg-muted">노드 시스템 데이터 없음</div>
      )}
    </div>
  );
}

/** 노드 자원 게이지 1줄 — 라벨 · 점유율 바 · 점유/등록 · 보조(블록/좌석). */
function NodeResource({ label, busy, reg, extra }: { label: string; busy: number; reg: number; extra: ReactNode }) {
  const pct = reg > 0 ? Math.min(100, (busy / reg) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px] tabular-nums">
      <span className="w-12 shrink-0 text-bt-fg-muted">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bt-bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-bt-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-[50px] shrink-0 text-right">
        <b className={busy > 0 ? 'text-bt-primary' : 'text-bt-fg'}>{busy}</b>
        <span className="text-bt-fg-muted"> / {reg}</span>
      </span>
      <span className="w-[48px] shrink-0 text-right text-[11px]">{extra}</span>
    </div>
  );
}

// ─── 트렁크 카드 (SIP, state-line) ─────────────────────────────────
function TrunkCard({ group: g }: { group: TrunkGroup }) {
  const sev = g.severity;
  const inPct = g.totalLine > 0 ? (g.inBusy / g.totalLine) * 100 : 0;
  const frame =
    sev === 'critical'
      ? 'border-bt-danger/45 bg-bt-danger-soft/15'
      : sev === 'warning' || sev === 'saturated'
        ? 'border-bt-warn/45 bg-bt-warn-soft/15'
        : 'border-bt-border bg-bt-bg';
  return (
    <div className={`w-full rounded-lg border bg-bt-bg p-3 bt-shadow ${frame} ${sev === 'critical' ? 'bt-pulse-ring' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${TRUNK_SEV_BG[sev]} ${sev === 'critical' ? 'bt-pulse' : ''}`} />
        <span className="truncate text-[13px] font-bold" title={g.name}>
          {g.name}
        </span>
        {g.lineIssue && (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-bt-danger">
            <AlertTriangle className="h-3 w-3" />
            라인이상
          </span>
        )}
        <span className={`ml-auto shrink-0 text-[16px] font-extrabold leading-none tabular-nums ${TRUNK_SEV_TEXT[sev]}`}>
          {fmtRate(g.rate)}
          <span className="text-[11px]">%</span>
        </span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-bt-bg-muted">
        <div className={`absolute inset-y-0 left-0 opacity-40 ${TRUNK_SEV_BG[sev]}`} style={{ width: `${Math.min(100, g.rate)}%` }} />
        <div className={`absolute inset-y-0 left-0 ${TRUNK_SEV_BG[sev]}`} style={{ width: `${Math.min(100, inPct)}%` }} />
        <span className="absolute inset-y-0 w-px bg-[#3a3f47]" style={{ left: '83%' }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-bt-fg-muted tabular-nums">
        <span>
          수신 <b className={TRUNK_SEV_TEXT[sev]}>{g.inBusy}</b> · 발신 {g.outBusy}
        </span>
        <span>
          {g.busyLine}/{g.totalLine}ch
        </span>
      </div>
      {g.lineIssue && g.aliveRate > g.rate && (
        <div className="mt-1.5 rounded bg-bt-danger-soft/50 px-2 py-1 text-[11px] text-bt-danger">
          살아있는 회선 기준 <b className="tabular-nums">{fmtRate(g.aliveRate)}%</b>
        </div>
      )}
      {g.lines.length > 0 ? (
        <>
          <div className="mt-2 flex items-end gap-[3px]" style={{ height: 28 }}>
            {g.lines.map((l, i) => (
              <LineBar key={l.trkId ?? i} line={l} />
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] tabular-nums">
            <span className="font-bold text-bt-success">정상 {g.lineStat.normal}</span>
            {g.lineStat.unregistered > 0 && <span className="font-bold text-bt-warn">미등록 {g.lineStat.unregistered}</span>}
            {g.lineStat.block > 0 && <span className="font-bold text-bt-danger">블록 {g.lineStat.block}</span>}
            <span className="text-bt-fg-muted">/ {g.lines.length}</span>
          </div>
        </>
      ) : (
        <div className="mt-2 text-[11px] text-bt-fg-muted">개별 라인 없음</div>
      )}
    </div>
  );
}

function LineBar({ line: l }: { line: TrunkLine }) {
  const dead = l.status !== 'normal';
  const title = `${l.name} · ${STATUS_LABEL[l.status]}${l.status === 'normal' ? ` · ${fmtRate(l.rate)}%` : ''}`;
  if (dead) {
    const unreg = l.status === 'unregistered';
    const unused = l.status === 'unused';
    return (
      <span
        className={`w-2.5 rounded-[3px] border ${unused ? 'border-bt-border-strong bg-bt-bg-muted' : unreg ? 'border-bt-warn/60 bg-bt-warn/25' : 'border-bt-danger/60 bg-bt-danger/25'}`}
        style={{ height: 28 }}
        title={title}
      />
    );
  }
  return (
    <span className="relative w-2.5 overflow-hidden rounded-[3px] bg-bt-bg-muted" style={{ height: 28 }} title={title}>
      <span className={`absolute inset-x-0 bottom-0 ${TRUNK_SEV_BG[l.severity]}`} style={{ height: `${Math.max(6, Math.min(100, l.rate))}%` }} />
    </span>
  );
}
