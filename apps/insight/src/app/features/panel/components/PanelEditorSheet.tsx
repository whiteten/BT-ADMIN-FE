import { useState } from 'react';
import { toast } from '@/shared-util';
import { useReportEditorStore } from '../../../stores/useReportEditorStore';
import { useCreatePanel, useUpdatePanel } from '../../report/hooks/useReportQueries';
import type { PanelDetail, PanelFieldMap, PanelLayout, PanelType } from '../../report/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type SheetStep = 1 | 2 | 3;

interface PanelEditorSheetProps {
  reportId: number;
  panelType?: PanelType;
  panelId?: number;
  onClose(): void;
}

export default function PanelEditorSheet({ reportId, panelType, panelId, onClose }: PanelEditorSheetProps) {
  const { panels, addPanel, updatePanel } = useReportEditorStore();
  const existingPanel = panelId ? panels.find((p) => p.panelId === panelId) : undefined;
  const isEdit = !!existingPanel;

  const [step, setStep] = useState<SheetStep>(1);
  const [title, setTitle] = useState(existingPanel?.title ?? '');
  const [layout] = useState<PanelLayout>(existingPanel?.layout ?? { x: 0, y: 0, w: 12, h: 6 });
  const [fieldMap, setFieldMap] = useState<PanelFieldMap[]>(existingPanel?.fieldMap ?? []);
  const currentPanelType = panelType ?? existingPanel?.panelType ?? 'GRID';

  const { mutate: createPanel, isPending: creating } = useCreatePanel({
    mutationOptions: {
      onSuccess: (panel) => {
        addPanel(panel);
        toast.success('패널이 추가되었습니다.');
        onClose();
      },
    },
  });

  const { mutate: updatePanelMutation, isPending: updating } = useUpdatePanel({
    mutationOptions: {
      onSuccess: (panel) => {
        updatePanel(panel.panelId, panel);
        toast.success('패널이 수정되었습니다.');
        onClose();
      },
    },
  });

  const handleSave = () => {
    const data = { panelType: currentPanelType, title, layout, fieldMap };
    if (isEdit && panelId) {
      updatePanelMutation({ reportId, panelId, data });
    } else {
      createPanel({ reportId, data });
    }
  };

  const stepLabels = ['1. 필드 매핑', '2. 옵션', '3. 미리보기'];

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0" side="right">
        <SheetHeader className="px-4 py-3 border-b border-bt-border">
          <SheetTitle className="text-[13px]">
            패널 편집 — <span className="font-mono text-bt-primary">{currentPanelType}</span>
          </SheetTitle>
          {/* 스텝 표시 */}
          <div className="flex items-center gap-0 mt-1">
            {stepLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setStep((i + 1) as SheetStep)}
                className={`text-[10.5px] px-2 py-1 border-b-2 transition-colors ${
                  step === i + 1 ? 'border-bt-primary text-bt-primary font-semibold' : 'border-transparent text-bt-fg-muted hover:text-bt-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* 패널 제목 (공통) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium">패널 제목 *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[12px]" placeholder="패널 제목 입력" />
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] text-bt-fg-muted">
                {currentPanelType === 'GRID' && '행 / 열(피벗) / 값 슬롯에 필드를 매핑하세요.'}
                {currentPanelType === 'BAR' && 'X축(디멘션/측정값) · Y축(측정값) · 시리즈 슬롯을 설정하세요.'}
                {currentPanelType === 'LINE' && 'X축(DATE 필수) · Y축(측정값) · 시리즈 슬롯을 설정하세요.'}
                {currentPanelType === 'PIE' && '슬라이스(디멘션 1) · 값(측정값 단일) 슬롯을 설정하세요.'}
                {currentPanelType === 'RADAR' && '축(측정값 3개+) · 시리즈 슬롯을 설정하세요.'}
                {currentPanelType === 'KPI' && '단일 측정값을 설정하세요.'}
              </div>
              <div className="rounded border border-dashed border-bt-border bg-bt-bg-muted/30 p-6 text-center">
                <p className="text-[11px] text-bt-fg-muted">필드 매핑 UI — Phase 3에서 구현 예정</p>
                <p className="text-[10px] text-bt-fg-muted mt-1">데이터셋 필드 팔레트 + 슬롯 드롭존</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded border border-dashed border-bt-border bg-bt-bg-muted/30 p-6 text-center">
              <p className="text-[11px] text-bt-fg-muted">차트 옵션 UI — Phase 3에서 구현 예정</p>
              <p className="text-[10px] text-bt-fg-muted mt-1">방향 · 스타일 · 데이터 라벨 · 목표선 · 범례 등</p>
            </div>
          )}

          {step === 3 && (
            <div className="rounded border border-dashed border-bt-border bg-bt-bg-muted/30 p-6 text-center">
              <p className="text-[11px] text-bt-fg-muted">미리보기 — Phase 3에서 구현 예정</p>
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between p-4 border-t border-bt-border">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={() => setStep((s) => (s - 1) as SheetStep)}>
                ← 이전
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={onClose}>
              취소
            </Button>
            {step < 3 ? (
              <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[11px] h-7" onClick={() => setStep((s) => (s + 1) as SheetStep)}>
                다음 →
              </Button>
            ) : (
              <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[11px] h-7" onClick={handleSave} disabled={!title || creating || updating}>
                저장
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
