/**
 * 사이드바 DR 수용 탭 (목업 renderSidebarDr).
 *
 * 두 모드:
 *  1) 노드 개요 — 해당 노드가 from/to 인 DR 링크를 송출(아웃바운드)/수용(인바운드) 칩으로 요약.
 *  2) 링크 선택(엣지 클릭 또는 칩 클릭) — drDns 백업 DN 목록 테이블.
 * GDN = gdnReservedCount + gdnMasterCount 합산(IMPL-BE §②).
 */
import { Empty } from 'antd';
import { useDnStatusDrDns } from '../../hooks/useDnStatusQueries';
import type { DrLink } from '../../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface DrPanelProps {
  nodeId: number;
  nodeName: string;
  drLinks: DrLink[];
  /** 선택된 DR 링크 (엣지/칩 클릭). null 이면 노드 개요 모드 */
  selectedLink: { fromNodeId: number; toNodeId: number } | null;
  onSelectLink: (fromNodeId: number, toNodeId: number) => void;
  onClearLink: () => void;
}

/** 링크 1건의 타입별 칩 */
function LinkChips({ link }: { link: DrLink }) {
  const gdn = link.gdnReservedCount + link.gdnMasterCount;
  const chips: { label: string; cls: string }[] = [];
  if (link.ednCount > 0) chips.push({ label: `내선 ${link.ednCount}건`, cls: 'bg-blue-100 text-blue-800' });
  if (link.tdnCount > 0) chips.push({ label: `SIP트렁크 채널 ${link.tdnCount}건`, cls: 'bg-amber-100 text-amber-800' });
  if (link.scaCount > 0) chips.push({ label: `SCA ${link.scaCount}건`, cls: 'bg-indigo-100 text-indigo-800' });
  if (gdn > 0) chips.push({ label: `GDN ${gdn}건`, cls: 'bg-violet-100 text-violet-700' });
  if (chips.length === 0) return <span className="text-[11px] text-gray-400">없음</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span key={c.label} className={`rounded px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function DrPanel({ nodeId, nodeName, drLinks, selectedLink, onSelectLink, onClearLink }: DrPanelProps) {
  // 선택 링크 상세 모드
  const { data: drDns = [], isLoading } = useDnStatusDrDns(selectedLink);

  if (selectedLink) {
    const link = drLinks.find((l) => l.fromNodeId === selectedLink.fromNodeId && l.toNodeId === selectedLink.toNodeId);
    const fromName = link?.fromNodeName ?? String(selectedLink.fromNodeId);
    const toName = link?.toNodeName ?? String(selectedLink.toNodeId);
    return (
      <div className="flex flex-col">
        <button type="button" onClick={onClearLink} className="mb-3 self-start text-[11px] text-[#405189] underline">
          ← DR 수용 현황으로
        </button>
        <div className="mb-1 text-[12px] font-semibold text-gray-700">DR 백업 DN 목록</div>
        <div className="mb-3 text-[11px] text-gray-500">
          {fromName} → {toName}
        </div>
        {isLoading ? (
          <FallbackSpinner />
        ) : drDns.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="백업 DN이 없습니다." />
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2.5 py-1.5 text-left font-medium text-gray-500">DN 번호</th>
                <th className="px-2.5 py-1.5 text-left font-medium text-gray-500">타입</th>
                <th className="px-2.5 py-1.5 text-left font-medium text-gray-500">GlobalDN</th>
              </tr>
            </thead>
            <tbody>
              {drDns.map((dn, i) => (
                <tr key={`${dn.dnNo}-${i}`} className="border-b border-gray-50">
                  <td className="px-2.5 py-1.5 font-medium text-gray-700">{dn.dnNo}</td>
                  <td className="px-2.5 py-1.5 text-gray-700">{dn.typeLabel}</td>
                  <td className="px-2.5 py-1.5">{dn.globalDn ? <span className="font-semibold text-violet-600">설정</span> : <span className="text-gray-400">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // 노드 개요 모드 — 인바운드(수용: to=node) / 아웃바운드(송출: from=node)
  const inbound = drLinks.filter((l) => l.toNodeId === nodeId);
  const outbound = drLinks.filter((l) => l.fromNodeId === nodeId);

  return (
    <div className="flex flex-col">
      <div className="mb-3 text-[12px] font-semibold text-gray-700">DR 수용 현황</div>

      {/* 인바운드 (다른 노드 → 이 노드 = 수용) */}
      <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="mb-1.5 text-[12px] font-semibold text-blue-800">↓ {nodeName} 수용</div>
        {inbound.length === 0 ? (
          <span className="text-[11px] text-gray-400">수용 없음</span>
        ) : (
          <div className="flex flex-col gap-2">
            {inbound.map((l) => (
              <button
                key={`${l.fromNodeId}-${l.toNodeId}`}
                type="button"
                onClick={() => onSelectLink(l.fromNodeId, l.toNodeId)}
                className="flex flex-col gap-1 rounded text-left transition-colors hover:bg-blue-100/60"
              >
                <span className="text-[11px] text-gray-500">발신 {l.fromNodeName}</span>
                <LinkChips link={l} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 아웃바운드 (이 노드 → 다른 노드 = 송출) */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="mb-1.5 text-[12px] font-semibold text-emerald-800">↑ {nodeName} 송출</div>
        {outbound.length === 0 ? (
          <span className="text-[11px] text-gray-400">송출 없음</span>
        ) : (
          <div className="flex flex-col gap-2">
            {outbound.map((l) => (
              <button
                key={`${l.fromNodeId}-${l.toNodeId}`}
                type="button"
                onClick={() => onSelectLink(l.fromNodeId, l.toNodeId)}
                className="flex flex-col gap-1 rounded text-left transition-colors hover:bg-emerald-100/60"
              >
                <span className="text-[11px] text-gray-500">수신 {l.toNodeName}</span>
                <LinkChips link={l} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
