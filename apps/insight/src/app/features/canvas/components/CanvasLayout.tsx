import { useState } from 'react';
import { Activity, BarChart2, Hexagon, LayoutGrid, LineChart, type LucideIcon, PieChart, Plus } from 'lucide-react';
import PanelWrapper from './PanelWrapper';
import PanelEditorSheet from '../../panel/components/PanelEditorSheet';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import type { PanelType } from '../../report/types';

interface CanvasLayoutProps {
  reportId: number;
  mode: 'edit' | 'view';
  isDraft?: boolean;
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

export default function CanvasLayout({ reportId, mode, isDraft }: CanvasLayoutProps) {
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
              backgroundImage: 'linear-gradient(to right, #e4e7ec 1px, transparent 1px), linear-gradient(to bottom, #e4e7ec 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#f1f3f6',
            }
          : { backgroundColor: '#f1f3f6' }
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
                  className="w-full flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-bt-primary/40 bg-bt-primary-soft/15 px-8 py-16 transition-all hover:border-bt-primary hover:bg-bt-primary-soft/30"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bt-primary text-white shadow-md">
                    <Plus className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-bt-fg">첫 패널 추가하기</div>
                    <p className="mt-1.5 text-[12px] text-bt-fg-muted">
                      한 보고서엔 <strong className="text-bt-fg">그리드 1개</strong>가 필수 — 먼저 그리드부터 추가하세요
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* 패널 있을 때 "+ 패널" 플레이스홀더 */}
            {!isEmpty && addPhase === 'idle' && (
              <div className="col-span-12 flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleStartAdding}
                  className="flex items-center gap-1.5 rounded border border-dashed border-bt-border bg-white/70 px-4 py-2.5 text-[11px] font-medium text-bt-fg-muted transition-colors hover:border-bt-primary hover:text-bt-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  패널 추가
                </button>
              </div>
            )}

            {/* in-place 패널 종류 선택 */}
            {addPhase === 'selecting' && (
              <div className="col-span-12">
                <div className="rounded-lg border-2 border-bt-primary bg-white p-6 shadow-md">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <span className="text-[14px] font-bold text-bt-fg">패널 종류 선택</span>
                      <p className="mt-0.5 text-[11px] text-bt-fg-muted">추가할 패널의 종류를 선택하세요</p>
                    </div>
                    <button type="button" onClick={handleCancelAdding} className="rounded px-2 py-1 text-[11px] text-bt-fg-muted hover:bg-bt-bg-muted hover:text-bt-fg">
                      취소
                    </button>
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
                          <span className={`text-[13px] font-semibold ${isSelected ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg)]'}`}>{label}</span>
                          <span className="text-[11px] text-[var(--color-bt-fg-muted)]">{description}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption && (
                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-bt-border pt-4">
                      <span className="text-[11px] text-bt-fg-muted">
                        <strong className="text-bt-primary">{selectedOption.label}</strong> 패널을 추가합니다
                      </span>
                      <button
                        type="button"
                        onClick={handleStartPanelEdit}
                        className="rounded bg-bt-primary px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-bt-primary-hover"
                      >
                        {selectedOption.label} 패널 편집 시작 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 패널 편집 사이드 시트 */}
      {addPhase === 'editing' && (
        <PanelEditorSheet reportId={reportId} panelType={selectedType ?? undefined} panelId={editingPanelId ?? undefined} onClose={handleCloseEditor} isDraft={isDraft} />
      )}
    </div>
  );
}
