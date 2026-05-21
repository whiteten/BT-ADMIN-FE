import { useState } from 'react';
import { Plus } from 'lucide-react';
import PanelWrapper from './PanelWrapper';
import { useReportEditorStore } from '../../../stores/useReportEditorStore';
import PanelEditorSheet from '../../panel/components/PanelEditorSheet';
import type { PanelType } from '../../report/types';
import { Button } from '@/components/ui/button';

interface CanvasLayoutProps {
  reportId: number;
  mode: 'edit' | 'view';
}

const PANEL_TYPE_OPTIONS: { type: PanelType; label: string; icon: string }[] = [
  { type: 'GRID', label: '그리드', icon: '▦' },
  { type: 'BAR', label: 'BAR', icon: '▮▮' },
  { type: 'LINE', label: 'LINE', icon: '╱' },
  { type: 'PIE', label: 'PIE', icon: '◕' },
  { type: 'RADAR', label: 'RADAR', icon: '⬡' },
  { type: 'KPI', label: 'KPI 카드', icon: '□' },
];

export default function CanvasLayout({ reportId, mode }: CanvasLayoutProps) {
  const { panels } = useReportEditorStore();
  const [addingPanelType, setAddingPanelType] = useState<PanelType | null>(null);
  const [editingPanelId, setEditingPanelId] = useState<number | null>(null);

  const isEdit = mode === 'edit';

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
      {/* 패널 그리드 */}
      <div className="grid grid-cols-12 gap-4 auto-rows-min">
        {panels.map((panel) => (
          <div key={panel.panelId} className="col-span-12" style={{ gridColumn: `span ${panel.layout.w}` }}>
            <PanelWrapper panel={panel} reportId={reportId} mode={mode} onEdit={() => setEditingPanelId(panel.panelId)} />
          </div>
        ))}
      </div>

      {/* 패널 추가 버튼 (편집 모드) */}
      {isEdit && (
        <div className="mt-4">
          {addingPanelType === null ? (
            <div className="flex justify-center">
              <div className="rounded border-2 border-dashed border-bt-border bg-white/60 px-8 py-6 flex flex-col items-center gap-3">
                <span className="text-[12px] font-semibold text-bt-fg-muted">패널 추가</span>
                <div className="grid grid-cols-3 gap-2">
                  {PANEL_TYPE_OPTIONS.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => setAddingPanelType(type)}
                      className="flex flex-col items-center gap-1 rounded border border-bt-border bg-white px-4 py-3 hover:border-bt-primary hover:bg-bt-primary-soft transition-colors"
                    >
                      <span className="text-[18px]">{icon}</span>
                      <span className="text-[11px] font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-[11px]" onClick={() => setAddingPanelType(null)}>
              취소
            </Button>
          )}
        </div>
      )}

      {/* 패널 편집 사이드 시트 */}
      {(addingPanelType || editingPanelId !== null) && (
        <PanelEditorSheet
          reportId={reportId}
          panelType={addingPanelType ?? undefined}
          panelId={editingPanelId ?? undefined}
          onClose={() => {
            setAddingPanelType(null);
            setEditingPanelId(null);
          }}
        />
      )}
    </div>
  );
}
