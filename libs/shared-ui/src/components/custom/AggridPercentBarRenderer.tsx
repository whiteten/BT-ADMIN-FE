import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * 퍼센트 값을 셀 전체 폭의 진행률 바 + 가운데 텍스트로 표시.
 * 신뢰도, 진행률, 비율 등 퍼센트로 표현해야 하는 셀에서 공통으로 사용.
 *
 * 텍스트는 서버에서 내려온 원본 숫자를 그대로 표기.
 * 바 폭은 시각화용으로만 0~100 범위로 클램프.
 *
 * 색상 기준 (기본):
 * - 80% 이상: 초록(#0AB39C)
 * - 50% 이상: 파랑(#3577F1)
 * - 그 외: 주황(#F7B84B)
 *
 * 합계/요약 행(pinned)인 경우 바 없이 텍스트만 표시하여 fontWeight(bold)를 상속.
 */
const AggridPercentBarRenderer: React.FC<ICellRendererParams> = (params) => {
  const value = params.value as number | null | undefined;
  if (value == null) return <>-</>;

  const barPct = Math.max(0, Math.min(100, value));

  if (params.node?.rowPinned != null) {
    return <span className="tabular-nums">{value}%</span>;
  }

  const barColor = barPct >= 80 ? '#0AB39C' : barPct >= 50 ? '#3577F1' : '#F7B84B';
  return (
    <div className="relative w-full h-5 bg-slate-200 rounded overflow-hidden">
      <div className="absolute inset-y-0 left-0" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
      <span className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-900 tabular-nums">{value}%</span>
    </div>
  );
};

export default AggridPercentBarRenderer;
