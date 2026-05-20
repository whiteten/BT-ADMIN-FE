import { useState } from 'react';
import { Button, Input } from 'antd';
import { Plus, X } from 'lucide-react';
import { toast } from '@/shared-util';
import CalcFieldEditor from './CalcFieldEditor';
import { useDeleteSearchBinding, useGetCalcFields, useGetFieldDisplays, useGetReport, useGetSearchBindings } from '../../report/hooks/useReportQueries';
import type { CalcField } from '../../report/types';
import { useGetDataSourceFields } from '../hooks/useDatasetQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface WizardStepBProps {
  reportId: number;
}

export default function WizardStepB({ reportId }: WizardStepBProps) {
  const [isCalcFieldEditorOpen, setIsCalcFieldEditorOpen] = useState(false);
  const [editingCalcField, setEditingCalcField] = useState<CalcField | undefined>(undefined);
  const [paletteSearch, setPaletteSearch] = useState('');

  const { data: report } = useGetReport({ params: { reportId } });
  const { data: fieldDisplays = [], isLoading: loadingFields } = useGetFieldDisplays({ params: { reportId } });
  const { data: calcFields = [], isLoading: loadingCalcFields } = useGetCalcFields({ params: { reportId } });
  const { data: searchBindings = [] } = useGetSearchBindings({ params: { reportId } });
  const { data: sourceFields = [] } = useGetDataSourceFields({
    params: { datasourceKey: report?.datasourceKey ?? '' },
    queryOptions: { enabled: !!report?.datasourceKey },
  });

  const { mutate: deleteBinding } = useDeleteSearchBinding({
    mutationOptions: {
      onSuccess: () => toast.success('검색조건 바인딩이 제거되었습니다.'),
    },
  });

  const dimFields = fieldDisplays.filter((f) => f.fieldType === 'DIM' && f.isVisible);
  const msrFields = fieldDisplays.filter((f) => f.fieldType === 'MSR' && f.isVisible);

  const filteredSourceFields = sourceFields.filter(
    (f) => !paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || f.displayName.toLowerCase().includes(paletteSearch.toLowerCase()),
  );

  if (loadingFields || loadingCalcFields) return <FallbackSpinner />;

  return (
    <div className="flex" style={{ minHeight: 560 }}>
      {/* 좌측: 원천 뷰 필드 팔레트 */}
      <aside className="w-64 shrink-0 border-r border-bt-border bg-bt-bg-muted/30 p-4 overflow-y-auto">
        <div className="mb-3">
          <div className="text-xs font-semibold text-bt-fg-muted mb-1">원천 뷰</div>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-bt-primary px-1.5 py-0.5 text-xs font-semibold text-white">{report?.domain}</span>
            <span className="font-mono text-sm font-semibold">{report?.datasourceKey}</span>
          </div>
          <div className="mt-0.5 text-xs text-bt-fg-muted">{sourceFields.length}개 컬럼</div>
        </div>

        <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-3" />

        {/* DIM 그룹 */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-bt-fg-muted">
            <span className="rounded bg-bt-bg-muted px-1 py-0.5 font-mono">DIM</span>
            <span>디멘션</span>
            <span className="ml-auto font-mono">{filteredSourceFields.filter((f) => f.columnFormat === 'String' || f.columnFormat === 'Date').length}</span>
          </div>
          <div className="space-y-1">
            {filteredSourceFields
              .filter((f) => f.columnFormat === 'String' || f.columnFormat === 'Date')
              .map((f) => (
                <div key={f.fieldName} className="flex cursor-grab items-center gap-2 rounded border border-bt-border bg-white px-2 py-1.5 text-xs hover:border-bt-primary">
                  <span className="font-mono text-bt-fg-muted">⋮⋮</span>
                  <span className="font-mono font-medium">{f.fieldName}</span>
                  <span className="ml-auto text-bt-fg-muted">{f.columnFormat}</span>
                </div>
              ))}
          </div>
        </div>

        {/* MSR 그룹 */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-bt-fg-muted">
            <span className="rounded bg-bt-primary px-1 py-0.5 font-mono text-white">MSR</span>
            <span>메저(밸류)</span>
            <span className="ml-auto font-mono">
              {filteredSourceFields.filter((f) => f.columnFormat === 'Number' || f.columnFormat === 'Decimal' || f.columnFormat === 'Rate').length}
            </span>
          </div>
          <div className="space-y-1">
            {filteredSourceFields
              .filter((f) => f.columnFormat === 'Number' || f.columnFormat === 'Decimal' || f.columnFormat === 'Rate')
              .map((f) => (
                <div
                  key={f.fieldName}
                  className="flex cursor-grab items-center gap-2 rounded border border-bt-border bg-bt-primary-soft/40 px-2 py-1.5 text-xs hover:border-bt-primary"
                >
                  <span className="font-mono text-bt-fg-muted">⋮⋮</span>
                  <span className="font-mono font-semibold">{f.fieldName}</span>
                  <span className="ml-auto text-bt-fg-muted">{f.columnFormat}</span>
                </div>
              ))}
          </div>
        </div>

        {/* 계산필드 그룹 */}
        {calcFields.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-bt-fg-muted">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-bt-success font-mono text-xs font-bold text-white">ƒ</span>
              <span>계산필드</span>
              <span className="ml-auto font-mono">{calcFields.length}</span>
            </div>
            <div className="space-y-1">
              {calcFields.map((cf) => (
                <div
                  key={cf.calcFieldId}
                  className="flex cursor-grab items-center gap-2 rounded border border-bt-success/30 bg-bt-success-soft/50 px-2 py-1.5 text-xs hover:border-bt-success"
                >
                  <span className="font-mono text-bt-fg-muted">⋮⋮</span>
                  <span className="font-mono font-semibold text-bt-success">ƒ {cf.fieldCode}</span>
                  <span className="ml-auto text-bt-fg-muted">{cf.columnFormat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 우측: 데이터셋 구성 */}
      <div className="flex-1 bg-white p-6 overflow-y-auto">
        {/* 데이터셋 정보 */}
        <div className="mb-5 flex items-center gap-3 rounded border border-bt-border bg-bt-bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-semibold text-bt-fg-muted">데이터셋</span>
          <span className="text-sm font-semibold">{report?.title}</span>
          <span className="rounded bg-bt-bg-muted px-1.5 py-0.5 text-xs text-bt-fg-muted">보고서명 자동 반영</span>
          <span className="ml-auto text-xs text-bt-fg-muted">이 보고서의 모든 패널이 공유합니다</span>
        </div>

        {/* 디멘션 영역 */}
        <div className="mb-4 rounded border border-bt-border bg-bt-bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-bt-bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-bt-fg-muted">DIM</span>
              <span className="text-sm font-semibold">디멘션</span>
              <span className="text-xs text-bt-fg-muted">— 그룹핑 / 분해 축</span>
            </div>
            <span className="text-xs text-bt-fg-muted">← 팔레트에서 드래그</span>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-bt-fg-muted">행 (Group by)</span>
              <span className="rounded bg-bt-bg-muted px-1.5 py-0.5 text-xs font-mono text-bt-fg-muted">{dimFields.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dimFields.map((f) => (
                <div key={f.fieldName} className="inline-flex items-center gap-1.5 rounded border border-bt-border bg-white px-2 py-1 text-xs">
                  <span className="font-mono font-semibold">{f.fieldName}</span>
                  <span className="text-bt-fg-muted">· {f.displayName}</span>
                  <button type="button" className="ml-0.5 text-bt-fg-muted hover:text-bt-danger">
                    ×
                  </button>
                </div>
              ))}
              <Button size="small" type="dashed" icon={<Plus className="w-3 h-3" />}>
                행 디멘션 추가
              </Button>
            </div>
          </div>
        </div>

        {/* 측정값 영역 */}
        <div className="mb-4 rounded border border-bt-border bg-bt-primary-soft/15 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-bt-primary px-1.5 py-0.5 font-mono text-xs font-bold text-white">MSR</span>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-bt-success font-mono text-xs font-bold text-white">ƒ</span>
              <span className="text-sm font-semibold">측정값</span>
              <span className="text-xs text-bt-fg-muted">— 집계 수치</span>
            </div>
            <span className="text-xs text-bt-fg-muted">← 팔레트에서 드래그</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {msrFields.map((f) => (
              <div key={f.fieldName} className="inline-flex items-center gap-1.5 rounded border border-bt-primary/30 bg-bt-primary-soft px-2 py-1 text-xs">
                <span className="font-mono font-semibold text-bt-primary">{f.fieldName}</span>
                <span className="text-bt-fg-muted">· {f.displayName}</span>
                <button type="button" className="ml-0.5 text-bt-fg-muted hover:text-bt-danger">
                  ×
                </button>
              </div>
            ))}
            {calcFields.map((cf) => (
              <div key={cf.calcFieldId} className="inline-flex items-center gap-1.5 rounded border border-bt-success/30 bg-bt-success-soft px-2 py-1 text-xs">
                <span className="font-mono font-semibold text-bt-success">ƒ {cf.fieldCode}</span>
                <span className="text-bt-fg-muted">· {cf.displayName}</span>
                <button
                  type="button"
                  className="ml-0.5 text-bt-fg-muted hover:text-bt-success"
                  onClick={() => {
                    setEditingCalcField(cf);
                    setIsCalcFieldEditorOpen(true);
                  }}
                >
                  ✎
                </button>
              </div>
            ))}
            <Button
              size="small"
              type="dashed"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => {
                setEditingCalcField(undefined);
                setIsCalcFieldEditorOpen(true);
              }}
            >
              계산필드 추가
            </Button>
          </div>
        </div>

        {/* 검색조건 바인딩 */}
        <div className="rounded border border-bt-border bg-bt-bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">검색조건 바인딩</span>
              <span className="rounded bg-bt-bg-muted px-1.5 py-0.5 text-xs font-mono text-bt-fg-muted">{searchBindings.length}</span>
            </div>
            <Button size="small" icon={<Plus className="w-3 h-3" />}>
              카탈로그에서 추가
            </Button>
          </div>
          {searchBindings.length === 0 ? (
            <div className="py-2 text-sm text-bt-fg-muted">바인딩된 검색조건 없음 — 패널에서 사용할 필터 조건을 카탈로그에서 선택하세요.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searchBindings.map((b) => (
                <div key={b.bindId} className="inline-flex items-center gap-1.5 rounded border border-bt-border bg-white px-2 py-1 text-xs">
                  <span className="font-medium">{b.title}</span>
                  {b.requiredYn && <span className="rounded bg-bt-danger-soft px-1 text-xs text-bt-danger">필수</span>}
                  <button type="button" className="ml-0.5 text-bt-fg-muted hover:text-bt-danger" onClick={() => deleteBinding({ reportId, bindId: b.bindId })}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 계산필드 편집 모달 */}
      {isCalcFieldEditorOpen && <CalcFieldEditor reportId={reportId} calcField={editingCalcField} onClose={() => setIsCalcFieldEditorOpen(false)} />}
    </div>
  );
}
