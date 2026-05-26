import { useState } from 'react';
import { Button, Drawer, Input } from 'antd';
import { toast } from '@/shared-util';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useCreatePanel, useUpdatePanel } from '../../report/hooks/useReportQueries';
import type { PanelDetail, PanelFieldMap, PanelLayout, PanelType } from '../../report/types';

type SheetStep = 1 | 2 | 3;

interface PanelEditorSheetProps {
  reportId: number;
  panelType?: PanelType;
  panelId?: number;
  onClose(): void;
  isDraft?: boolean;
}

export default function PanelEditorSheet({ reportId, panelType, panelId, onClose, isDraft }: PanelEditorSheetProps) {
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
    if (isDraft) {
      addPanel({
        panelId: -Date.now(),
        reportId: 0,
        panelType: currentPanelType,
        title,
        layout,
        fieldMap,
      });
      toast.success('패널이 추가되었습니다.');
      onClose();
      return;
    }
    if (isEdit && panelId) {
      updatePanelMutation({ reportId, panelId, data });
    } else {
      createPanel({ reportId, data });
    }
  };

  const stepLabels = ['1. 필드 매핑', '2. 옵션', '3. 미리보기'];

  const drawerFooter = (
    <div className="flex items-center justify-between">
      <div>{step > 1 && <Button onClick={() => setStep((s) => (s - 1) as SheetStep)}>← 이전</Button>}</div>
      <div className="flex items-center gap-2">
        <Button onClick={onClose}>취소</Button>
        {step < 3 ? (
          <Button type="primary" onClick={() => setStep((s) => (s + 1) as SheetStep)}>
            다음 →
          </Button>
        ) : (
          <Button type="primary" onClick={handleSave} disabled={!title || creating || updating} loading={creating || updating}>
            저장
          </Button>
        )}
      </div>
    </div>
  );

  const drawerTitle = (
    <div className="flex flex-col gap-1">
      <span className="text-[13px]">
        패널 편집 — <span className="font-mono text-[var(--color-bt-primary)]">{currentPanelType}</span>
      </span>
      <div className="flex items-center gap-0">
        {stepLabels.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep((i + 1) as SheetStep)}
            className={`text-[10.5px] px-2 py-1 border-b-2 transition-colors ${
              step === i + 1
                ? 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] font-semibold'
                : 'border-transparent text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-fg)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={drawerTitle} width={420} placement="right" footer={drawerFooter} styles={{ body: { padding: '16px' } }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">패널 제목 *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="패널 제목 입력" />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--color-bt-fg-muted)]">
              {currentPanelType === 'GRID' && '행 / 열(피벗) / 값 슬롯에 필드를 매핑하세요.'}
              {currentPanelType === 'BAR' && 'X축(디멘션/측정값) · Y축(측정값) · 시리즈 슬롯을 설정하세요.'}
              {currentPanelType === 'LINE' && 'X축(DATE 필수) · Y축(측정값) · 시리즈 슬롯을 설정하세요.'}
              {currentPanelType === 'PIE' && '슬라이스(디멘션 1) · 값(측정값 단일) 슬롯을 설정하세요.'}
              {currentPanelType === 'RADAR' && '축(측정값 3개+) · 시리즈 슬롯을 설정하세요.'}
              {currentPanelType === 'KPI' && '단일 측정값을 설정하세요.'}
            </p>
            <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-6 text-center">
              <p className="text-xs text-[var(--color-bt-fg-muted)]">필드 매핑 UI — Phase 3에서 구현 예정</p>
              <p className="text-[10px] text-[var(--color-bt-fg-muted)] mt-1">데이터셋 필드 팔레트 + 슬롯 드롭존</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-6 text-center">
            <p className="text-xs text-[var(--color-bt-fg-muted)]">차트 옵션 UI — Phase 3에서 구현 예정</p>
            <p className="text-[10px] text-[var(--color-bt-fg-muted)] mt-1">방향 · 스타일 · 데이터 라벨 · 목표선 · 범례 등</p>
          </div>
        )}

        {step === 3 && (
          <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-6 text-center">
            <p className="text-xs text-[var(--color-bt-fg-muted)]">미리보기 — Phase 3에서 구현 예정</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
