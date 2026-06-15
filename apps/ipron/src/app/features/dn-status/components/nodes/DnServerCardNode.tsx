/**
 * 서버 카드 커스텀 노드 (react-flow nodeTypes 'dnServerCard').
 *
 * 목업 renderCards() 의 노드 카드 1:1 — 헤더(노드명+총DN) + 자원행(내선/SIP트렁크 채널: 건수+할당바)
 * + GDN 3행(ACD/CTI큐/SIP트렁크: 건수만, 할당바 없음 — IMPL-BE §④) + GlobalDN 플래그 행.
 *
 * 변경(IMPL-DECISIONS):
 *  - ADN(상담사 ADN) 행 제거 — common 패널로 분리(노드 무관 자원).
 *  - GDN 할당률 바 제거 — total/globalDnCount/backupCount 건수만.
 *  - GlobalDN 강조 = 노드 카드 단위(자원행별 '전' 배지 데이터 없음 — PLAN-FE §9.3).
 *
 * 인터랙션: 헤더 클릭→개요, 자원행 클릭→DN 목록, 플래그 행 클릭→GlobalDN.
 * 콜백은 data.onOpenSidebar 로 주입(AOE nodeData.onCopy 패턴).
 */
import { memo } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Server } from 'lucide-react';
import { type DnTypeKey, TYPE_COLORS, type TypeCount } from '../../types';

// 읽기 전용 — 연결 불가 숨김 핸들. 엣지(DR)가 좌/우 경계에 anchor 되도록 source(우)/target(좌) 모두 둠.
const HIDDEN_HANDLE_CLASS = '!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export interface DnServerCardData {
  nodeId: number;
  nodeName: string;
  /** 11(내선)/13(SIP트렁크 채널) — ADN 제외. 14(GDN 예약)는 숨김(PLAN-FE §9.5) */
  dnTypes: TypeCount[];
  scaCount: number;
  globalDnTotal: number;
  globalDnAssigned: number;
  gdnGlobalDnTotal: number;
  /** ④ gdns 노드 매칭 — 건수만 */
  gdnRows: { key: DnTypeKey; label: string; total: number; globalDnCount: number; backupCount: number }[];
  globalEmphasis: boolean;
  active: boolean;
  onOpenSidebar: (nodeId: number, tab: string) => void;
  [key: string]: unknown;
}

/** 자원행: DN 타입(내선/SIP트렁크 채널) — 건수 + 할당바 */
function DnTypeRow({
  typeKey,
  label,
  total,
  assigned,
  scaCount,
  onClick,
}: {
  typeKey: DnTypeKey;
  label: string;
  total: number;
  assigned: number;
  scaCount: number;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  const color = TYPE_COLORS[typeKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-[#f5f7ff]"
    >
      <span className="flex w-[88px] flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-gray-700">
        {label}
        {typeKey === 'edn' && scaCount > 0 && <span className="text-[9px] font-semibold text-indigo-500">(SCA {scaCount})</span>}
      </span>
      <span className="w-[34px] flex-shrink-0 text-right text-[11px] font-bold text-gray-800">{total.toLocaleString()}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="w-[54px] flex-shrink-0 whitespace-nowrap text-right text-[11px] font-semibold text-gray-700">할당 {pct}%</span>
    </button>
  );
}

/** GDN 행: 건수만 (할당바 없음) */
function GdnRow({ label, total, globalDnCount, backupCount, onClick }: { label: string; total: number; globalDnCount: number; backupCount: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-[#f5f7ff]"
    >
      <span className="w-[88px] flex-shrink-0 text-[11px] font-semibold text-cyan-800">{label}</span>
      <span className="w-[34px] flex-shrink-0 text-right text-[11px] font-bold text-gray-800">{total.toLocaleString()}</span>
      <span className="flex flex-1 items-center gap-2 text-[10px] text-gray-500">
        <span>GlobalDN {globalDnCount.toLocaleString()}</span>
        <span className="text-gray-300">·</span>
        <span>백업 {backupCount.toLocaleString()}</span>
      </span>
    </button>
  );
}

function DnServerCardNodeBase({ data }: NodeProps) {
  const d = data as DnServerCardData;
  const totalDN = d.dnTypes.reduce((sum, t) => sum + t.total, 0);
  // 그룹DN 예약(typeKey gdnReserved/14)은 숨김 — PLAN-FE §9.5
  const visibleDnTypes = d.dnTypes.filter((t) => t.typeKey === 'edn' || t.typeKey === 'tdn');
  const gflagUnassigned = d.globalDnTotal - d.globalDnAssigned;

  return (
    <div
      className={`w-[360px] overflow-hidden rounded-xl border bg-white shadow-md transition-colors ${d.active ? 'border-[#405189] ring-2 ring-[#405189]/20' : 'border-[#e2e8f0]'} ${d.globalEmphasis ? 'ring-2 ring-violet-300' : ''}`}
    >
      {/* 읽기전용 숨김 핸들 — DR 엣지 anchor 용 (연결 불가) */}
      <Handle type="target" position={Position.Left} isConnectable={false} className={HIDDEN_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} isConnectable={false} className={HIDDEN_HANDLE_CLASS} />

      {/* 헤더 — 클릭 시 개요 */}
      <button
        type="button"
        onClick={() => d.onOpenSidebar(d.nodeId, 'overview')}
        className="flex w-full items-center gap-2.5 border-b border-gray-200 bg-[#f8f9fb] px-4 py-3 text-left transition-colors hover:bg-[#eef0f7]"
      >
        <Server className="size-3.5 flex-shrink-0 text-gray-500" />
        <span className="text-[13px] font-bold text-gray-800">{d.nodeName}</span>
        <span className="ml-auto text-[11px] text-gray-500">DN {totalDN.toLocaleString()}</span>
      </button>

      {/* DN 타입 자원행 (내선 / SIP트렁크 채널) */}
      {visibleDnTypes.map((t) => (
        <DnTypeRow
          key={t.typeKey}
          typeKey={t.typeKey as DnTypeKey}
          label={t.typeLabel}
          total={t.total}
          assigned={t.assigned}
          scaCount={d.scaCount}
          onClick={() => d.onOpenSidebar(d.nodeId, t.typeKey)}
        />
      ))}

      {/* GDN 3행 (ACD / CTI큐 / SIP트렁크) — 건수만 */}
      {d.gdnRows.map((g) => (
        <GdnRow key={g.key} label={g.label} total={g.total} globalDnCount={g.globalDnCount} backupCount={g.backupCount} onClick={() => d.onOpenSidebar(d.nodeId, g.key)} />
      ))}

      {/* GlobalDN 플래그 행 */}
      <button
        type="button"
        onClick={() => d.onOpenSidebar(d.nodeId, 'gflag')}
        className="flex w-full items-center gap-2 border-t border-gray-200 px-4 py-2 text-left transition-colors hover:bg-[#f5f3ff]"
      >
        <span className="text-[10px] font-semibold text-violet-600">GlobalDN 플래그</span>
        <span className="ml-auto text-[11px] font-bold text-violet-600">{d.globalDnTotal.toLocaleString()}</span>
        <span className="text-[10px] text-gray-500">
          할당 {d.globalDnAssigned.toLocaleString()} · 미할당 {Math.max(0, gflagUnassigned).toLocaleString()}
        </span>
      </button>
    </div>
  );
}

export default memo(DnServerCardNodeBase);
