import { Modal } from 'antd';
import { Activity, BarChart2, Hexagon, LayoutGrid, LineChart, type LucideIcon, PieChart, X } from 'lucide-react';
import type { PanelType } from '../../report/types';

export const PANEL_TYPE_OPTIONS: { type: PanelType; label: string; Icon: LucideIcon; description: string }[] = [
  { type: 'GRID', label: '그리드', Icon: LayoutGrid, description: '행/열 테이블' },
  { type: 'BAR', label: 'BAR', Icon: BarChart2, description: '막대 차트' },
  { type: 'LINE', label: 'LINE', Icon: LineChart, description: '추세선 차트' },
  { type: 'PIE', label: 'PIE', Icon: PieChart, description: '파이/도넛' },
  { type: 'RADAR', label: 'RADAR', Icon: Hexagon, description: '레이더 차트' },
  { type: 'KPI', label: 'KPI', Icon: Activity, description: 'KPI 카드' },
];

interface PanelTypePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** 패널 종류 선택 → 다음 단계(데이터셋 선택)로 */
  onSelect: (type: PanelType) => void;
  /** 숨길 패널 종류 (예: 그리드 1개 제한 — 이미 존재 시 GRID 숨김) */
  hideTypes?: PanelType[];
}

/**
 * 패널 종류 선택 모달. (모니터링 위젯 라이브러리 위치에 대응)
 * 한 번만 선택 — 선택한 종류로 곧장 데이터셋 선택 → 패널 편집으로 매끄럽게 연결.
 */
export default function PanelTypePickerModal({ open, onClose, onSelect, hideTypes = [] }: PanelTypePickerModalProps) {
  const options = PANEL_TYPE_OPTIONS.filter((o) => !hideTypes.includes(o.type));
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold text-[#495057]">패널 종류 선택</span>
        </div>
      }
      width={640}
      centered
      closeIcon={
        <div className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#f1f3f5] transition-colors">
          <X className="h-4 w-4 text-[#868e96]" />
        </div>
      }
      styles={{
        header: { padding: '18px 24px', borderBottom: '1px solid #f1f3f5', marginBottom: 0 },
        body: { padding: '24px' },
      }}
    >
      <div className="pt-2">
        <p className="mb-6 text-[13px] text-[#868e96] leading-relaxed">
          이 영역에 그릴 패널의 종류를 선택하세요. <br />
          선택 후 데이터셋과 필드를 매핑하면 패널이 완성됩니다.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {options.map(({ type, label, Icon, description }) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-[#dee2e6] bg-white p-4 text-left transition-all hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/10 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8f9fa] text-[#adb5bd] border border-[#f1f3f5] transition-colors group-hover:bg-white group-hover:text-[var(--color-bt-primary)] shadow-sm">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-[14px] font-bold text-[#495057] group-hover:text-[var(--color-bt-primary)] transition-colors">{label}</span>
              <span className="text-[11.5px] text-[#adb5bd]">{description}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
