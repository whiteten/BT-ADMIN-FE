import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 퍼센트 바 셀 렌더러
 *
 * 퍼센트 값을 그라디언트 프로그레스 바 + 가운데 텍스트로 표시.
 * 신뢰도, 완료율, 상담연결율 등 퍼센트로 표현하는 셀에서 공통으로 사용.
 *
 * 색상 기준:
 * - 80% 이상: 초록(#0AB39C)
 * - 50% 이상: 파랑(#3577F1)
 * - 그 외:    주황(#F7B84B)
 *
 * 바 배경은 바 색상의 10% 투명도(hex 1A)로 컬럼별 색조를 은은하게 표현.
 * 텍스트는 흰색 글로우 그림자로 바 위에서도 선명하게 읽힘.
 *
 * 합계/요약 행(pinned)은 바 없이 텍스트만 표시.
 */
const AggridPercentBarRenderer: React.FC<ICellRendererParams> = (params) => {
  const value = params.value as number | null | undefined;
  if (value == null) return <span className="text-slate-400">-</span>;

  // 바 너비는 0~100으로 클램프 (서버 값이 범위를 벗어날 수 있음)
  const barPct = Math.max(0, Math.min(100, value));

  if (params.node?.rowPinned != null) {
    return <span className="tabular-nums">{value}%</span>;
  }

  const barColor = barPct >= 80 ? '#0AB39C' : barPct >= 50 ? '#3577F1' : '#F7B84B';

  return (
    <div className="relative w-full h-[20px] rounded overflow-hidden" style={{ backgroundColor: `${barColor}1A` }}>
      {/* 그라디언트 바: 좌측 bb(73%) → 우측 full 로 깊이감 부여 */}
      <div className="absolute inset-y-0 left-0" style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${barColor}bb, ${barColor})` }} />
      {/* 텍스트: 흰색 글로우로 바 위·빈 영역 모두에서 가독성 확보 */}
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums select-none"
        style={{ color: '#334155', textShadow: '0 0 6px #fff, 0 0 3px #fff' }}
      >
        {value}%
      </span>
    </div>
  );
};

export default AggridPercentBarRenderer;
