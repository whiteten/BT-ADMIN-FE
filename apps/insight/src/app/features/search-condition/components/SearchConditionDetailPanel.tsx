import { type ReactNode, useEffect, useState } from 'react';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { FileText, GitBranch, Layers, OctagonAlert } from 'lucide-react';
import { CATEGORY_OPTIONS, type InputType, type SearchConditionListItem } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BADGE_BASE = 'text-[12px] leading-[12px] font-medium !h-5';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

const INPUT_TYPE_META: Record<InputType, { label: string; className: string }> = {
  SELECT: { label: '단일 선택', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  MULTI_SELECT: { label: '복수 선택', className: 'text-[#4B92F7] bg-[#4B92F71A]' },
  TREE_MULTI_SELECT: { label: '계층 복수', className: 'text-[#F7B84B] bg-[#F7B84B1A]' },
  RADIO: { label: '라디오', className: 'text-[#878A99] bg-[#878A991A]' },
};

/** 검색조건 카탈로그 전용 상세 패널 (공통 rowData 패널 대체).
 *  단순 컬럼값이 아니라 단계 구성·입력유형·사용 보고서 수까지 보여준다. */
function SearchConditionDetailPanel(props: CustomToolPanelProps<SearchConditionListItem>) {
  const { api } = props;
  const [row, setRow] = useState<SearchConditionListItem | null>(null);

  useEffect(() => {
    if (!api || api.isDestroyed?.()) return;
    const handleSelectionChanged = () => {
      const selected = api.getSelectedRows();
      setRow(selected && selected.length > 0 ? selected[0] : null);
    };
    const handlePaginationChanged = () => api.deselectAll();
    api.addEventListener('selectionChanged', handleSelectionChanged);
    api.addEventListener('paginationChanged', handlePaginationChanged);
    return () => {
      if (api && !api.isDestroyed?.()) {
        api.removeEventListener('selectionChanged', handleSelectionChanged);
        api.removeEventListener('paginationChanged', handlePaginationChanged);
      }
    };
  }, [api]);

  if (!row) {
    return (
      <div className="w-full h-full flex flex-col gap-4 items-center justify-center px-3 text-center">
        <OctagonAlert className="size-12 text-gray-400" />
        <p className="text-sm text-gray-500">행을 선택하면 상세 구성이 표시됩니다.</p>
      </div>
    );
  }

  const nodes = row.nodes ?? [];
  const uniqueTypes = [...new Set(nodes.map((n) => n.inputType))];
  const sqlCount = nodes.filter((n) => n.optionSqlPreview).length;

  return (
    <div className="w-full h-full overflow-y-auto p-3 select-text">
      {/* 제목 */}
      <div className="pb-2 mb-3 border-b border-bt-border">
        <p className="text-[15px] font-bold break-all leading-snug">{row.title}</p>
      </div>

      {/* 카테고리 */}
      <div className="mb-3">
        <p className="text-[12px] font-semibold text-bt-fg-muted mb-1.5">카테고리</p>
        {row.categoryCode ? (
          <Badge variant="secondary" className={BADGE_BASE}>
            {CATEGORY_LABEL[row.categoryCode] ?? row.categoryCode}
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox icon={<Layers className="size-3.5" />} label="단계" value={String(nodes.length)} />
        <StatBox icon={<GitBranch className="size-3.5" />} label="옵션 SQL" value={`${sqlCount}/${nodes.length}`} />
        <StatBox icon={<FileText className="size-3.5" />} label="사용 보고서" value={String(row.usedReportCount ?? 0)} />
      </div>

      {/* 입력 유형 */}
      <div className="mb-3">
        <p className="text-[12px] font-semibold text-bt-fg-muted mb-1.5">입력 유형</p>
        <div className="flex flex-wrap gap-1">
          {uniqueTypes.length === 0 ? (
            <span className="text-sm text-gray-400">-</span>
          ) : (
            uniqueTypes.map((t) => (
              <Badge key={t} variant="secondary" className={cn(BADGE_BASE, INPUT_TYPE_META[t]?.className)}>
                {INPUT_TYPE_META[t]?.label ?? t}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* 단계 구성 */}
      <div>
        <p className="text-[12px] font-semibold text-bt-fg-muted mb-1.5">단계 구성 ({nodes.length})</p>
        <ol className="flex flex-col gap-1.5">
          {nodes.map((n, i) => (
            <li key={`${n.nodeCode}-${i}`} className="rounded border border-bt-border bg-bt-bg-muted/40 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-bt-fg-muted w-4 shrink-0">{i + 1}</span>
                <span className="font-mono text-xs font-semibold break-all">{n.nodeCode}</span>
                <Badge variant="secondary" className={cn(BADGE_BASE, '!h-[18px] !text-[11px] ml-auto shrink-0', INPUT_TYPE_META[n.inputType]?.className)}>
                  {INPUT_TYPE_META[n.inputType]?.label ?? n.inputType}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 pl-[22px]">
                {n.parentNodeCode ? (
                  <span className="text-[11px] text-bt-fg-muted">
                    ↳ 상위 <span className="font-mono">{n.parentNodeCode}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-bt-fg-muted">최상위</span>
                )}
                {n.optionSqlPreview ? <span className="text-[11px] text-bt-primary">· 옵션 SQL</span> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-bt-border bg-bt-bg-muted/40 py-2 gap-0.5">
      <span className="flex items-center gap-1 text-[11px] text-bt-fg-muted">
        {icon}
        {label}
      </span>
      <span className="text-base font-bold leading-none">{value}</span>
    </div>
  );
}

export default SearchConditionDetailPanel;
