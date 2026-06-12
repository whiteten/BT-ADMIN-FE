/**
 * GridRowColorLegend — 그리드 행 색상 의미 소형 범례 (한 줄)
 *
 * 팔레트 정의 (의미 고정 — GRID-ROWCOLOR-COLUMN-AUDIT.md b안):
 *   dirty  (#eff3ff): 미저장 변경 행
 *   unassigned (#fff7ed): 미배정/미할당 행
 *
 * 사용법:
 *   <GridRowColorLegend items={['dirty']} />
 *   <GridRowColorLegend items={['unassigned']} />
 *   <GridRowColorLegend items={['dirty', 'unassigned']} />
 */

/** 팔레트 고정 상수 — 이 파일이 유일한 진원 */
export const ROW_COLOR_PALETTE = {
  /** 미저장 변경 행 배경색 (= ag-row-dirty-blue / bsr-ctiq-dirty-row) */
  dirty: '#eff3ff',
  /** 미저장 변경 행 hover 배경색 */
  dirtyHover: '#e5ebff',
  /** 미배정/미할당 행 배경색 (= bg-orange-50 근사, Tailwind amber-50) */
  unassigned: '#fff7ed',
  /** 편집 가능 셀 배경색 (기배정·인라인 편집 가능 셀) */
  editableCell: '#f0f4ff',
} as const;

type LegendKey = 'dirty' | 'unassigned';

interface LegendItem {
  color: string;
  label: string;
}

const LEGEND_ITEMS: Record<LegendKey, LegendItem> = {
  dirty: { color: ROW_COLOR_PALETTE.dirty, label: '변경된 행' },
  unassigned: { color: ROW_COLOR_PALETTE.unassigned, label: '미배정 행' },
};

interface GridRowColorLegendProps {
  items: LegendKey[];
  className?: string;
}

/**
 * 그리드 헤더 우측에 인라인으로 삽입하는 소형 범례 (색점 + 라벨 칩 형태).
 * 한 줄로 제한. 배너/설명 패널이 아닌 액션바 우측 보조 요소.
 */
export function GridRowColorLegend({ items, className = '' }: GridRowColorLegendProps) {
  if (items.length === 0) return null;
  return (
    <div className={`flex items-center gap-2 text-[11px] text-gray-500 ${className}`}>
      {items.map((key) => {
        const item = LEGEND_ITEMS[key];
        return (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-200 flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}
