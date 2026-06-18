import { Modal } from 'antd';
import { Columns, LayoutGrid, Maximize, Rows, X } from 'lucide-react';

interface LayoutPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** 선택한 레이아웃 크기 (w, h) 전달 */
  onSelect: (w: number, h: number) => void;
}

/**
 * 대시보드 영역 추가 레이아웃 선택 모달.
 * FCA 디자인 가이드라인 준수: 헤더 구분선, 회색 X 버튼, 타이포그래피 정렬.
 */
export default function LayoutPickerModal({ open, onClose, onSelect }: LayoutPickerModalProps) {
  const OPTIONS = [
    { label: '전체 공간', desc: 'Full (12×12)', w: 12, h: 12, icon: <Maximize className="h-6 w-6" /> },
    { label: '균등 분할', desc: 'Balanced (6×6)', w: 6, h: 6, icon: <LayoutGrid className="h-6 w-6" /> },
    { label: '수평 와이드', desc: 'Horizontal (12×6)', w: 12, h: 6, icon: <Rows className="h-6 w-6" /> },
    { label: '수직 사이드', desc: 'Vertical (6×12)', w: 6, h: 12, icon: <Columns className="h-6 w-6" /> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold text-[#495057]">새 영역 추가</span>
        </div>
      }
      width={520}
      centered
      closeIcon={
        <div className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#f1f3f5] transition-colors">
          <X className="h-4 w-4 text-[#868e96]" />
        </div>
      }
      styles={{
        header: {
          padding: '18px 24px',
          borderBottom: '1px solid #f1f3f5',
          marginBottom: 0,
        },
        body: {
          padding: '24px',
        },
      }}
    >
      <div className="pt-2">
        <p className="mb-8 text-[13px] text-[#868e96] leading-relaxed">
          배치할 영역의 크기를 선택하세요. <br />
          추가된 빈 영역에 데이터셋 위젯이나 커스텀 위젯을 채워넣을 수 있습니다.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onSelect(opt.w, opt.h);
                onClose();
              }}
              className="group flex items-start gap-4 rounded-xl border border-[#dee2e6] bg-white p-5 text-left transition-all hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/10 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8f9fa] text-[#adb5bd] transition-colors group-hover:bg-white group-hover:text-[var(--color-bt-primary)] shadow-sm border border-[#f1f3f5]">
                {opt.icon}
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="text-[14.5px] font-bold text-[#495057] group-hover:text-[var(--color-bt-primary)] transition-colors">{opt.label}</div>
                <p className="mt-1 text-[11.5px] text-[#adb5bd] font-medium mono uppercase tracking-tight">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
