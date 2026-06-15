/**
 * 상단 HUD 바 (목업 #hud) — 제목·GlobalDN 강조 토글·공통 자원(ADN) 배지·새로고침/자동갱신/갱신시각.
 *
 * 줌/리셋은 react-flow <Controls> 로 대체(목업 줌라벨/리셋버튼 제거). 16노드 미리보기 미이관(검토용).
 * ADN(상담사 ADN)은 노드 무관 공통 자원 — HUD 옆 배지로 1회 표기(IMPL-DECISIONS).
 */
import { Switch } from 'antd';
import { Globe, RefreshCw } from 'lucide-react';
import type { CommonResourceStat } from '../types';

interface DnStatusHudProps {
  common: CommonResourceStat | undefined;
  globalEmphasis: boolean;
  onToggleGlobalEmphasis: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  /** 마지막 갱신 시각 (query.dataUpdatedAt) */
  lastUpdated: number | undefined;
}

function formatUpdated(ts: number | undefined): string {
  if (!ts) return '-- : --';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} 기준`;
}

export default function DnStatusHud({ common, globalEmphasis, onToggleGlobalEmphasis, autoRefresh, onToggleAutoRefresh, onRefresh, lastUpdated }: DnStatusHudProps) {
  return (
    <div className="flex h-[52px] flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-5 shadow-sm">
      <span className="text-[14px] font-bold text-gray-800">교환기 번호자원 현황</span>
      <span className="h-5 w-px bg-gray-200" />

      {/* GlobalDN 강조 토글 */}
      <button
        type="button"
        onClick={onToggleGlobalEmphasis}
        className={`flex h-7 items-center gap-1 rounded border px-2.5 text-[11px] font-medium transition-colors ${globalEmphasis ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-300/60 bg-violet-50 text-violet-600'}`}
      >
        <Globe className="size-3" />
        <span>GlobalDN 강조</span>
      </button>

      {/* 공통 자원(ADN) 배지 — 노드 무관 */}
      {common && (
        <>
          <span className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className="font-medium text-emerald-700">상담사 ADN</span>
            <span className="font-semibold text-gray-800">{common.adnTotal.toLocaleString()}</span>
            <span className="text-gray-400">/ 할당 {common.adnAssigned.toLocaleString()}</span>
          </div>
        </>
      )}

      {/* 갱신 영역 */}
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          title="새로고침"
          className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:border-[#405189] hover:text-[#405189]"
        >
          <RefreshCw className="size-3.5" />
        </button>
        <span className="text-[11px] text-gray-400">{formatUpdated(lastUpdated)}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
          <Switch size="small" checked={autoRefresh} onChange={onToggleAutoRefresh} />
          <span>자동갱신</span>
        </label>
      </div>
    </div>
  );
}
