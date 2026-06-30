/**
 * 상세 패널 개요 탭.
 *
 * 2단 레이아웃(2026-06-18 우측 위젯 컬럼 신설):
 *   좌 760px: 기존 등록DN 도넛 · 타입별 할당 현황 · 그룹DN 분류 현황 유지.
 *   우 flex:1: 위젯 3종 (실 API 배선, 목업 숫자 없음)
 *     A — 전 노드 내선 할당률 수평바 비교 (현재 노드 강조 / 전체 선택 시 모두 동일)
 *     B — 이 노드 그룹DN 타입 구성 도넛 (≤3 세그먼트)
 *     C — GlobalDN 점유율 게이지
 *
 * node=null 이면 전 노드 집계(전체 선택 컨텍스트).
 * 데이터: 선택 노드의 nodes 집계 + 해당 노드 gdnRows + allNodes(위젯A 전 노드 비교).
 * ADN(12)은 노드 무관이라 제외.
 */
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { type DnStatusNode, GDN_TYPE_TO_KEY, type GdnTypeStat, TYPE_COLORS } from '../../types';

interface OverviewPanelProps {
  /** null = 전체 선택(전 노드 집계) */
  node: DnStatusNode | null;
  gdnStats: GdnTypeStat[];
  /** 위젯 A — 전 노드 내선 할당률 비교용 / 전체 모드에서도 사용 */
  allNodes: DnStatusNode[];
}

// ─── 좌측 기존 컴포넌트 ────────────────────────────────────────────────────

/** SVG 도넛 (내선/SIP트렁크 채널 2분할) */
function Donut({ slices, total }: { slices: { label: string; value: number; color: string }[]; total: number }) {
  const cx = 45;
  const cy = 45;
  const r = 36;
  const inner = 20;
  const TAU = 2 * Math.PI;
  // 누적 시작각을 reduce 로 미리 계산(렌더 중 변수 재할당 회피)
  const arcs = slices.reduce<{ slice: (typeof slices)[number]; start: number; end: number }[]>((acc, s) => {
    const prevEnd = acc.length > 0 ? acc[acc.length - 1].end : -Math.PI / 2;
    const angle = total > 0 ? (s.value / total) * TAU : 0;
    acc.push({ slice: s, start: prevEnd, end: prevEnd + angle });
    return acc;
  }, []);
  const paths = arcs.map(({ slice, start, end }, i) => {
    const angle = end - start;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const xi1 = cx + inner * Math.cos(start);
    const yi1 = cy + inner * Math.sin(start);
    const xi2 = cx + inner * Math.cos(end);
    const yi2 = cy + inner * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const path = angle > 0.01 ? `M${xi1} ${yi1} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z` : '';
    return <path key={i} d={path} fill={slice.color} opacity={0.9} />;
  });
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
      {paths}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f2937">
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#9ca3af">
        등록 DN
      </text>
    </svg>
  );
}

/** 할당 스택바 (할당/미할당 2분할 + %) */
function AllocBar({ label, total, assigned, scaCount }: { label: string; total: number; assigned: number; scaCount?: number }) {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-[72px] flex-shrink-0 font-medium text-gray-700">
        {label}
        {scaCount != null && scaCount > 0 && <span className="ml-1 text-[9px] text-indigo-500">(SCA {scaCount})</span>}
      </span>
      <span className="flex h-4 flex-1 overflow-hidden rounded bg-gray-200">
        <span className="flex items-center justify-center" style={{ width: `${pct}%`, background: TYPE_COLORS.edn }}>
          {pct > 12 && <span className="text-[9px] font-semibold text-white">{assigned.toLocaleString()}</span>}
        </span>
        <span className="flex flex-1 items-center justify-center">{100 - pct > 10 && <span className="text-[9px] text-gray-400">{(total - assigned).toLocaleString()}</span>}</span>
      </span>
      <span className="w-[44px] flex-shrink-0 text-right text-[11px] font-semibold text-gray-700">할당 {pct}%</span>
    </div>
  );
}

// ─── 우측 위젯 컴포넌트 ────────────────────────────────────────────────────

/** 위젯 제목 */
function WidgetTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{children}</div>;
}

/** 위젯 A — 전 노드 내선 할당률 수평바 비교. currentNodeId=null 이면 전체 선택(강조 없음) */
function WidgetAllNodeEdn({ allNodes, currentNodeId }: { allNodes: DnStatusNode[]; currentNodeId: number | null }) {
  const rows = allNodes
    .map((n) => {
      const edn = n.dnTypes.find((t) => t.typeKey === 'edn');
      return { nodeId: n.nodeId, nodeName: n.nodeName, total: edn?.total ?? 0, assigned: edn?.assigned ?? 0 };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <WidgetTitle>전 노드 내선 할당률 비교</WidgetTitle>
        <div className="flex flex-1 items-center justify-center text-[11px] text-gray-400">내선 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <WidgetTitle>전 노드 내선 할당률 비교</WidgetTitle>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const pct = r.total > 0 ? Math.round((r.assigned / r.total) * 100) : 0;
          const isCurrent = currentNodeId != null && r.nodeId === currentNodeId;
          return (
            <div key={r.nodeId} className="flex items-center gap-2 text-[11px]">
              <div className="flex w-[80px] flex-shrink-0 items-center gap-1">
                <span className={`truncate font-medium ${isCurrent ? 'text-[#405189]' : 'text-gray-600'}`}>{r.nodeName}</span>
                {isCurrent && <span className="flex-shrink-0 rounded bg-[#405189] px-1 py-0.5 text-[8px] font-bold text-white">현재</span>}
              </div>
              <div className="flex h-3.5 flex-1 overflow-hidden rounded bg-gray-200">
                <div className="flex items-center justify-center transition-all" style={{ width: `${pct}%`, background: isCurrent ? TYPE_COLORS.edn : '#94a3b8' }}>
                  {pct > 18 && <span className="text-[9px] font-semibold text-white">{r.assigned.toLocaleString()}</span>}
                </div>
                <div className="flex flex-1 items-center justify-center">
                  {100 - pct > 18 && <span className="text-[9px] text-gray-400">{(r.total - r.assigned).toLocaleString()}</span>}
                </div>
              </div>
              {/* 1줄 수치 — 할당/전체 · % */}
              <span className="w-[100px] flex-shrink-0 whitespace-nowrap text-right text-[10px] font-semibold text-gray-700">
                {r.assigned.toLocaleString()} / {r.total.toLocaleString()} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 위젯 B — 이 노드 그룹DN 타입 구성 도넛 (≤3 세그먼트) */
const GDN_WIDGET_COLORS: Record<string, string> = {
  ACD: TYPE_COLORS['gdn-acd'],
  CTI큐: TYPE_COLORS['gdn-ctiq'],
  SIP트렁크: TYPE_COLORS['gdn-sip'],
};

function WidgetGdnDonut({ gdnRows }: { gdnRows: GdnTypeStat[] }) {
  const gdnTotal = gdnRows.reduce((s, g) => s + g.total, 0);

  const data = gdnRows.map((g) => ({
    name: g.typeLabel,
    value: g.total,
    color: GDN_WIDGET_COLORS[g.typeLabel] ?? '#94a3b8',
  }));

  if (gdnRows.length === 0) {
    return (
      <div className="flex flex-col">
        <WidgetTitle>그룹DN 타입 구성</WidgetTitle>
        <div className="flex h-[100px] items-center justify-center text-[11px] text-gray-400">그룹DN 없음</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <WidgetTitle>그룹DN 타입 구성</WidgetTitle>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0" style={{ width: 100, height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={24} outerRadius={44} dataKey="value" startAngle={90} endAngle={-270} paddingAngle={data.length > 1 ? 2 : 0}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="mb-0.5 text-[11px] font-bold text-gray-700">합계 {gdnTotal.toLocaleString()}</div>
          {data.map((d) => {
            const pct = gdnTotal > 0 ? Math.round((d.value / gdnTotal) * 100) : 0;
            return (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="size-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="text-gray-500">{d.name}</span>
                <span className="ml-auto pl-2 font-semibold text-gray-700">{d.value.toLocaleString()}</span>
                <span className="text-gray-400">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 위젯 C — GlobalDN 점유율 게이지 */
function WidgetGlobalDn({ node }: { node: DnStatusNode }) {
  const total = node.globalDnTotal;
  const assigned = node.globalDnAssigned;
  const remaining = Math.max(0, total - assigned);
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;

  const gaugeData =
    total > 0
      ? [
          { name: '점유', value: assigned, color: TYPE_COLORS.gflag },
          { name: '잔여', value: remaining, color: '#e5e7eb' },
        ]
      : [{ name: '잔여', value: 1, color: '#e5e7eb' }];

  return (
    <div className="flex flex-col">
      <WidgetTitle>GlobalDN 점유율</WidgetTitle>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gaugeData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" startAngle={90} endAngle={-270} paddingAngle={0}>
                {gaugeData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[13px] font-bold text-gray-800">{pct}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="size-2 flex-shrink-0 rounded-full" style={{ background: TYPE_COLORS.gflag }} />
            <span className="text-gray-500">점유</span>
            <span className="ml-auto pl-2 font-semibold text-gray-700">{assigned.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 flex-shrink-0 rounded-full bg-gray-300" />
            <span className="text-gray-500">전역풀</span>
            <span className="ml-auto pl-2 font-semibold text-gray-700">{total.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 flex-shrink-0 rounded-full bg-gray-100 ring-1 ring-gray-300" />
            <span className="text-gray-500">잔여</span>
            <span className="ml-auto pl-2 font-semibold text-gray-700">{remaining.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 전체 선택 모드 패널 ─────────────────────────────────────────────────────

/** 전체 선택 시 전 노드 집계 개요 */
function AllNodesOverviewPanel({ allNodes, gdnStats }: { allNodes: DnStatusNode[]; gdnStats: GdnTypeStat[] }) {
  // 전 노드 집계
  let ednTotal = 0;
  let ednAssigned = 0;
  let tdnTotal = 0;
  let gdnReservedTotal = 0;
  let registeredTotal = 0;
  let globalDnTotal = 0;
  let globalDnAssigned = 0;
  let totalScaCount = 0;

  for (const n of allNodes) {
    totalScaCount += n.scaCount;
    globalDnTotal += n.globalDnTotal + n.gdnGlobalDnTotal;
    globalDnAssigned += n.globalDnAssigned;
    for (const t of n.dnTypes) {
      registeredTotal += t.total;
      if (t.typeKey === 'edn') {
        ednTotal += t.total;
        ednAssigned += t.assigned;
      } else if (t.typeKey === 'tdn') {
        tdnTotal += t.total;
      } else if (t.typeKey === 'gdnReserved') {
        gdnReservedTotal += t.total;
      }
    }
  }

  const otherTotal = Math.max(0, registeredTotal - ednTotal - tdnTotal - gdnReservedTotal);
  const slices = [
    { label: '내선', value: ednTotal, color: TYPE_COLORS.edn },
    { label: 'SIP트렁크 채널', value: tdnTotal, color: TYPE_COLORS.tdn },
    { label: '그룹DN 예약', value: gdnReservedTotal, color: TYPE_COLORS['gdn-acd'] },
    { label: '기타', value: otherTotal, color: '#6b7280' },
  ].filter((s) => s.value > 0);

  // 전체 GDN 집계
  const gdnMap = new Map<number, { typeLabel: string; total: number; globalDnCount: number; backupCount: number }>();
  for (const g of gdnStats) {
    if (!GDN_TYPE_TO_KEY[g.gdnType]) continue;
    const existing = gdnMap.get(g.gdnType);
    if (existing) {
      existing.total += g.total;
      existing.globalDnCount += g.globalDnCount;
      existing.backupCount += g.backupCount;
    } else {
      gdnMap.set(g.gdnType, { typeLabel: g.typeLabel, total: g.total, globalDnCount: g.globalDnCount, backupCount: g.backupCount });
    }
  }
  const gdnRows = [...gdnMap.entries()].map(([gdnType, v]) => ({ gdnType, ...v }));

  const ednPct = ednTotal > 0 ? Math.round((ednAssigned / ednTotal) * 100) : 0;

  return (
    <div className="flex h-full w-full gap-5">
      {/* ── 좌측: 전체 집계 ── */}
      <div className="w-[480px] flex-shrink-0">
        <div className="flex flex-col">
          {/* 등록 DN 구성 */}
          <div className="mb-2.5 text-[12px] font-semibold text-gray-700">등록 DN 구성 (전 노드 합계)</div>
          <div className="mb-4 flex items-center gap-4">
            <Donut slices={slices} total={registeredTotal} />
            <div className="flex flex-1 flex-col gap-1.5">
              {slices.map((s) => (
                <div key={s.label} className="contents">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="size-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-500">{s.label}</span>
                    <span className="ml-auto pl-1.5 font-semibold text-gray-700">{s.value.toLocaleString()}</span>
                  </div>
                  {/* SCA — 내선 바로 밑 (내선 종속) */}
                  {s.label === '내선' && totalScaCount > 0 && (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-indigo-500"
                      title="내선에 종속된 파생 번호(SCA). 별도 번호 공간을 쓰지 않아 등록 DN 합계에 포함하지 않습니다."
                    >
                      <span className="text-[9px]">└</span>
                      <span>SCA</span>
                      <span className="ml-auto font-semibold">{totalScaCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 타입별 할당 현황 */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">타입별 할당 현황</div>
          <div className="mb-4 flex flex-col gap-2">
            <AllocBar label="내선" total={ednTotal} assigned={ednAssigned} scaCount={totalScaCount} />
          </div>

          {/* 그룹DN 분류 현황 */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">그룹DN 분류 현황 (등록 DN 과 별개)</div>
          <div className="mb-4 flex flex-col gap-1.5">
            {gdnRows.length === 0 ? (
              <div className="text-[11px] text-gray-400">그룹DN 없음</div>
            ) : (
              gdnRows.map((g) => (
                <div key={g.gdnType} className="flex items-center gap-2 text-[11px]">
                  <span className="w-[72px] flex-shrink-0 font-medium text-gray-700">{g.typeLabel}</span>
                  <span className="font-bold text-gray-800">{g.total.toLocaleString()}</span>
                  <span className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
                    <span>GlobalDN {g.globalDnCount.toLocaleString()}</span>
                    <span className="text-gray-300">·</span>
                    <span>DR 백업 {g.backupCount.toLocaleString()}</span>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* GlobalDN 합계 */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">GlobalDN (전역 번호 공간 점유)</div>
          <div className="rounded-lg border border-violet-200 bg-fuchsia-50 p-3">
            <div className="mb-0.5 text-[11px] font-semibold text-violet-600">전 노드 GlobalDN 합계</div>
            <div className="text-[22px] font-bold text-gray-800">{globalDnTotal.toLocaleString()}</div>
            <div className="mt-1 text-[10px] text-gray-500">
              할당 <b className="text-gray-800">{globalDnAssigned.toLocaleString()}</b> · 미할당{' '}
              <b className="text-gray-400">{Math.max(0, globalDnTotal - globalDnAssigned).toLocaleString()}</b>
            </div>
          </div>
        </div>
      </div>

      {/* ── 구분선 ── */}
      <div className="w-px flex-shrink-0 self-stretch bg-gray-200" />

      {/* ── 우측: 위젯 A (전체 선택 시 강조 없음) ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <WidgetAllNodeEdn allNodes={allNodes} currentNodeId={null} />
        </div>
        {/* 위젯 A 하단 여백 보정 — 전체 모드에서 빈 공간 없도록 내선 할당 요약 카드 */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">전 노드 내선 요약</div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">총 내선</span>
              <span className="font-tabular text-[20px] font-bold text-gray-800">{ednTotal.toLocaleString()}</span>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">할당</span>
              <span className="font-tabular text-[20px] font-bold text-[#405189]">{ednAssigned.toLocaleString()}</span>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">할당률</span>
              <span className="font-tabular text-[20px] font-bold text-gray-700">{ednPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 패널 ────────────────────────────────────────────────────────────

export default function OverviewPanel({ node, gdnStats, allNodes }: OverviewPanelProps) {
  // 전체 선택 모드
  if (node === null) {
    return <AllNodesOverviewPanel allNodes={allNodes} gdnStats={gdnStats} />;
  }

  const edn = node.dnTypes.find((t) => t.typeKey === 'edn');
  const tdn = node.dnTypes.find((t) => t.typeKey === 'tdn');
  const gdnReserved = node.dnTypes.find((t) => t.typeKey === 'gdnReserved');
  const ednTotal = edn?.total ?? 0;
  const tdnTotal = tdn?.total ?? 0;
  const gdnReservedTotal = gdnReserved?.total ?? 0;
  // 노드 등록 DN = 이 노드 dnTypes total 합(배너 '등록 DN' 정의와 동일 — 합 일치)
  const registeredTotal = node.dnTypes.reduce((sum, t) => sum + t.total, 0);
  const otherTotal = Math.max(0, registeredTotal - ednTotal - tdnTotal - gdnReservedTotal);
  const slices = [
    { label: '내선', value: ednTotal, color: TYPE_COLORS.edn },
    { label: 'SIP트렁크 채널', value: tdnTotal, color: TYPE_COLORS.tdn },
    { label: '그룹DN 예약', value: gdnReservedTotal, color: TYPE_COLORS['gdn-acd'] },
    { label: '기타', value: otherTotal, color: '#6b7280' },
  ].filter((s) => s.value > 0);
  const gdnRows = gdnStats.filter((g) => g.nodeId === node.nodeId && GDN_TYPE_TO_KEY[g.gdnType]);

  return (
    <div className="flex h-full w-full gap-5">
      {/* ── 좌측: 기존 영역 (760px 고정폭) ── */}
      <div className="w-[760px] flex-shrink-0">
        <div className="flex flex-col">
          {/* 등록 DN 구성 — 도넛 (배너 '등록 DN'과 동일 정의: 내선+SIP트렁크 채널+그룹DN 예약+기타) */}
          <div className="mb-2.5 text-[12px] font-semibold text-gray-700">등록 DN 구성</div>
          <div className="mb-4 flex items-center gap-4">
            <Donut slices={slices} total={registeredTotal} />
            <div className="flex flex-1 flex-col gap-1.5">
              {slices.map((s) => (
                <div key={s.label} className="contents">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="size-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-500">{s.label}</span>
                    <span className="ml-auto pl-1.5 font-semibold text-gray-700">{s.value.toLocaleString()}</span>
                  </div>
                  {/* SCA — 내선 바로 밑(내선 종속, 등록 DN 합계에 포함하지 않음) */}
                  {s.label === '내선' && node.scaCount > 0 && (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-indigo-500"
                      title="내선에 종속된 파생 번호(SCA). 별도 번호 공간을 쓰지 않아 등록 DN 합계에는 포함하지 않습니다."
                    >
                      <span className="text-[9px]">└</span>
                      <span>SCA</span>
                      <span className="ml-auto font-semibold">{node.scaCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 타입별 할당 현황 */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">타입별 할당 현황</div>
          <div className="mb-4 flex flex-col gap-2">
            {edn && <AllocBar label="내선" total={edn.total} assigned={edn.assigned} scaCount={node.scaCount} />}
            {tdn && <AllocBar label="SIP트렁크 채널" total={tdn.total} assigned={tdn.assigned} />}
          </div>

          {/* 그룹DN 분류 현황 — GDN_MASTER 건수만 (할당바 없음, 등록 DN 과 별개 자원) */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">그룹DN 분류 현황 (등록 DN 과 별개)</div>
          <div className="mb-4 flex flex-col gap-1.5">
            {gdnRows.length === 0 ? (
              <div className="text-[11px] text-gray-400">그룹DN 없음</div>
            ) : (
              gdnRows.map((g) => (
                <div key={g.gdnType} className="flex items-center gap-2 text-[11px]">
                  <span className="w-[72px] flex-shrink-0 font-medium text-gray-700">{g.typeLabel}</span>
                  <span className="font-bold text-gray-800">{g.total.toLocaleString()}</span>
                  <span className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
                    <span>GlobalDN {g.globalDnCount.toLocaleString()}</span>
                    <span className="text-gray-300">·</span>
                    <span>DR 백업 {g.backupCount.toLocaleString()}</span>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* GlobalDN (전역 점유) */}
          <div className="mb-2 text-[12px] font-semibold text-gray-700">GlobalDN (전역 번호 공간 점유)</div>
          <div className="rounded-lg border border-violet-200 bg-fuchsia-50 p-3">
            <div className="mb-0.5 text-[11px] font-semibold text-violet-600">이 노드의 GlobalDN</div>
            <div className="text-[22px] font-bold text-gray-800">{node.globalDnTotal.toLocaleString()}</div>
            <div className="mt-1 text-[10px] text-gray-500">
              할당 <b className="text-gray-800">{node.globalDnAssigned.toLocaleString()}</b> · 미할당{' '}
              <b className="text-gray-400">{Math.max(0, node.globalDnTotal - node.globalDnAssigned).toLocaleString()}</b>
            </div>
          </div>
        </div>
      </div>

      {/* ── 구분선 ── */}
      <div className="w-px flex-shrink-0 self-stretch bg-gray-200" />

      {/* ── 우측: 요약 위젯 컬럼 (flex:1) ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* 위젯 A — 전 노드 내선 할당률 비교 */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <WidgetAllNodeEdn allNodes={allNodes} currentNodeId={node.nodeId} />
        </div>

        {/* 위젯 B·C — 하단 좌우 분할 */}
        <div className="flex gap-4">
          {/* 위젯 B — 이 노드 그룹DN 타입 구성 */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <WidgetGdnDonut gdnRows={gdnRows} />
          </div>

          {/* 위젯 C — GlobalDN 점유율 */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <WidgetGlobalDn node={node} />
          </div>
        </div>
      </div>
    </div>
  );
}
