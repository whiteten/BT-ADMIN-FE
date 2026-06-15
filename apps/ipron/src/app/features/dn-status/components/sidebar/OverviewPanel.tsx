/**
 * 사이드바 개요 탭 (목업 renderSidebarOverview).
 *
 * DN 타입 구성 도넛(내선/SIP트렁크 채널 — ADN 제외) + 타입별 할당 스택바 + GDN 분류 건수(할당바 없음)
 * + GlobalDN 플래그 카드. 데이터 = 선택 노드의 nodes 집계 + 해당 노드 gdnRows.
 */
import { type DnStatusNode, GDN_TYPE_TO_KEY, type GdnTypeStat, TYPE_COLORS } from '../../types';

interface OverviewPanelProps {
  node: DnStatusNode;
  gdnStats: GdnTypeStat[];
}

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
        전체 DN
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

export default function OverviewPanel({ node, gdnStats }: OverviewPanelProps) {
  const edn = node.dnTypes.find((t) => t.typeKey === 'edn');
  const tdn = node.dnTypes.find((t) => t.typeKey === 'tdn');
  const ednTotal = edn?.total ?? 0;
  const tdnTotal = tdn?.total ?? 0;
  const donutTotal = ednTotal + tdnTotal;
  const slices = [
    { label: '내선', value: ednTotal, color: TYPE_COLORS.edn },
    { label: 'SIP트렁크 채널', value: tdnTotal, color: TYPE_COLORS.tdn },
  ];
  const gdnRows = gdnStats.filter((g) => g.nodeId === node.nodeId && GDN_TYPE_TO_KEY[g.gdnType]);
  const gflagUnassigned = Math.max(0, node.globalDnTotal - node.globalDnAssigned);

  return (
    <div className="flex flex-col">
      {/* DN 타입 구성 — 도넛 */}
      <div className="mb-2.5 text-[12px] font-semibold text-gray-700">DN 타입 구성</div>
      <div className="mb-4 flex items-center gap-4">
        <Donut slices={slices} total={donutTotal} />
        <div className="flex flex-1 flex-col gap-1.5">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[11px]">
              <span className="size-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-gray-500">{s.label}</span>
              <span className="ml-auto pl-1.5 font-semibold text-gray-700">{s.value.toLocaleString()}</span>
            </div>
          ))}
          {node.scaCount > 0 && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-indigo-500">
              <span className="text-[9px]">└</span>
              <span>SCA 파생</span>
              <span className="ml-auto font-semibold">{node.scaCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* 타입별 할당 현황 */}
      <div className="mb-2 text-[12px] font-semibold text-gray-700">타입별 할당 현황</div>
      <div className="mb-4 flex flex-col gap-2">
        {edn && <AllocBar label="내선" total={edn.total} assigned={edn.assigned} scaCount={node.scaCount} />}
        {tdn && <AllocBar label="SIP트렁크 채널" total={tdn.total} assigned={tdn.assigned} />}
      </div>

      {/* GDN 분류 현황 — 건수만 (할당바 없음) */}
      <div className="mb-2 text-[12px] font-semibold text-gray-700">GDN 분류 현황</div>
      <div className="mb-4 flex flex-col gap-1.5">
        {gdnRows.length === 0 ? (
          <div className="text-[11px] text-gray-400">GDN 없음</div>
        ) : (
          gdnRows.map((g) => (
            <div key={g.gdnType} className="flex items-center gap-2 text-[11px]">
              <span className="w-[72px] flex-shrink-0 font-medium text-gray-700">{g.typeLabel}</span>
              <span className="font-bold text-gray-800">{g.total.toLocaleString()}</span>
              <span className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
                <span>GlobalDN {g.globalDnCount.toLocaleString()}</span>
                <span className="text-gray-300">·</span>
                <span>백업 {g.backupCount.toLocaleString()}</span>
              </span>
            </div>
          ))
        )}
      </div>

      {/* GlobalDN 플래그 */}
      <div className="mb-2 text-[12px] font-semibold text-gray-700">GlobalDN 플래그</div>
      <div className="rounded-lg border border-violet-200 bg-fuchsia-50 p-3">
        <div className="mb-0.5 text-[11px] font-semibold text-violet-600">플래그 설정 DN</div>
        <div className="text-[22px] font-bold text-gray-800">{node.globalDnTotal.toLocaleString()}</div>
        <div className="mt-1 text-[10px] text-gray-500">
          할당 <b className="text-gray-800">{node.globalDnAssigned.toLocaleString()}</b> · 미할당 <b className="text-gray-400">{gflagUnassigned.toLocaleString()}</b>
        </div>
      </div>
    </div>
  );
}
