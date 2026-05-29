import { useState } from 'react';
import { Button } from 'antd';
import { Activity, BarChart2, Hexagon, LayoutGrid, LineChart, type LucideIcon, PieChart, Plus } from 'lucide-react';
import PanelWrapper from './PanelWrapper';
import PanelEditorSheet from '../../panel/components/PanelEditorSheet';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import type { PanelType } from '../../report/types';

interface CanvasLayoutProps {
  reportId: number;
  mode: 'edit' | 'view';
  isDraft?: boolean;
  datasetId?: number;
}

const PANEL_TYPE_OPTIONS: { type: PanelType; label: string; Icon: LucideIcon; description: string }[] = [
  { type: 'GRID', label: '그리드', Icon: LayoutGrid, description: '행/열 테이블' },
  { type: 'BAR', label: 'BAR', Icon: BarChart2, description: '막대 차트' },
  { type: 'LINE', label: 'LINE', Icon: LineChart, description: '추세선 차트' },
  { type: 'PIE', label: 'PIE', Icon: PieChart, description: '파이/도넛' },
  { type: 'RADAR', label: 'RADAR', Icon: Hexagon, description: '레이더 차트' },
  { type: 'KPI', label: 'KPI', Icon: Activity, description: 'KPI 카드' },
];

type AddPhase = 'idle' | 'selecting' | 'editing';

export default function CanvasLayout({ reportId, mode, isDraft, datasetId = 0 }: CanvasLayoutProps) {
  const { panels } = useReportEditorStore();
  const [addPhase, setAddPhase] = useState<AddPhase>('idle');
  const [selectedType, setSelectedType] = useState<PanelType | null>(null);
  const [editingPanelId, setEditingPanelId] = useState<number | null>(null);

  const isEdit = mode === 'edit';
  const isEmpty = panels.length === 0;
  const selectedOption = PANEL_TYPE_OPTIONS.find((p) => p.type === selectedType);

  const handleStartAdding = () => {
    setAddPhase('selecting');
    setSelectedType(null);
  };

  const handleCancelAdding = () => {
    setAddPhase('idle');
    setSelectedType(null);
  };

  const handleStartPanelEdit = () => {
    if (selectedType) setAddPhase('editing');
  };

  const handleCloseEditor = () => {
    setAddPhase('idle');
    setSelectedType(null);
    setEditingPanelId(null);
  };

  const handleEditPanel = (panelId: number) => {
    setEditingPanelId(panelId);
    setSelectedType(null);
    setAddPhase('editing');
  };

  return (
    <div
      className="relative w-full min-h-full p-4"
      style={
        isEdit
          ? {
              backgroundImage: 'linear-gradient(to right, #d8dce3 1px, transparent 1px), linear-gradient(to bottom, #d8dce3 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#e8eaed',
            }
          : { backgroundColor: '#e8eaed' }
      }
    >
      <div className="grid grid-cols-12 gap-4 auto-rows-min">
        {/* 기존 패널 */}
        {panels.map((panel) => (
          <div key={panel.panelId} style={{ gridColumn: `span ${panel.layout.w}` }}>
            <PanelWrapper panel={panel} reportId={reportId} mode={mode} onEdit={() => handleEditPanel(panel.panelId)} />
          </div>
        ))}

        {isEdit && (
          <>
            {/* 빈 캔버스 히어로 */}
            {isEmpty && addPhase === 'idle' && (
              <div className="col-span-12">
                <button
                  type="button"
                  onClick={handleStartAdding}
                  className="w-full flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)]/15 px-8 py-16 transition-all hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/30"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bt-primary)] text-white shadow-md">
                    <Plus className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-[var(--color-bt-fg)]">첫 패널 추가하기</div>
                    <p className="mt-1.5 text-xs text-[var(--color-bt-fg-muted)]">
                      한 보고서엔 <strong className="text-[var(--color-bt-fg)]">그리드 1개</strong>가 필수 — 먼저 그리드부터 추가하세요
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* 패널 있을 때 "+ 패널" 플레이스홀더 */}
            {!isEmpty && addPhase === 'idle' && (
              <div className="col-span-12 flex justify-end pt-2">
                <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={handleStartAdding}>
                  패널 추가
                </Button>
              </div>
            )}

            {/* in-place 패널 종류 선택 */}
            {addPhase === 'selecting' && (
              <div className="col-span-12">
                <div className="rounded-lg border-2 border-[var(--color-bt-primary)] bg-white p-6 shadow-md">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-[var(--color-bt-fg)]">패널 종류 선택</span>
                      <p className="mt-0.5 text-xs text-[var(--color-bt-fg-muted)]">추가할 패널의 종류를 선택하세요</p>
                    </div>
                    <Button onClick={handleCancelAdding}>취소</Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {PANEL_TYPE_OPTIONS.map(({ type, label, Icon, description }) => {
                      const isSelected = selectedType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(type)}
                          className={`flex flex-col items-start gap-2 rounded-lg p-4 text-left transition-all ${
                            isSelected
                              ? 'border-2 border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]'
                              : 'border border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]'}`} strokeWidth={1.5} />
                          <span className={`text-sm font-semibold ${isSelected ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg)]'}`}>{label}</span>
                          <span className="text-xs text-[var(--color-bt-fg-muted)]">{description}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption && (
                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--color-bt-border)] pt-4">
                      <span className="text-xs text-[var(--color-bt-fg-muted)]">
                        <strong className="text-[var(--color-bt-primary)]">{selectedOption.label}</strong> 패널을 추가합니다
                      </span>
                      <Button type="primary" onClick={handleStartPanelEdit}>
                        {selectedOption.label} 패널 편집 시작 →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 패널 편집 사이드 시트 — edit/view 모두 허용 */}
      {(addPhase === 'editing' || editingPanelId !== null) && (
        <PanelEditorSheet
          reportId={reportId}
          panelType={selectedType ?? undefined}
          panelId={editingPanelId ?? undefined}
          datasetId={datasetId}
          onClose={handleCloseEditor}
          isDraft={isDraft}
        />
      )}
    </div>
  );
}
