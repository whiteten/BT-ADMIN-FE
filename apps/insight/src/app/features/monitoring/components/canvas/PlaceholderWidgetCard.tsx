import { Plus, X } from 'lucide-react';
import type { PlaceholderWidget } from '../../types';

interface PlaceholderWidgetCardProps {
  widget: PlaceholderWidget;
  /** "위젯 추가하기" 버튼 클릭 시 호출 */
  onAdd: () => void;
  onDelete: () => void;
  draggableClass?: string;
}

/**
 * 대시보드에 공간만 차지하고 있는 빈 슬롯 카드.
 * FCA 디자인 톤앤매너 준수: 미니멀한 헤더, 표준 삭제 버튼 스타일.
 */
export default function PlaceholderWidgetCard({ widget, onAdd, onDelete, draggableClass = '' }: PlaceholderWidgetCardProps) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-dashed border-[var(--color-bt-primary)]/20 bg-white/50 transition-all hover:border-[var(--color-bt-primary)]/40 hover:bg-white shadow-sm hover:shadow-md">
      {/* 상단 드래그 핸들 영역 (FCA 스타일: 텍스트 제거, 아이콘만 우측 배치) */}
      <div className={`flex h-9 items-center justify-end px-2 ${draggableClass} cursor-move bg-transparent opacity-0 group-hover:opacity-100 transition-opacity`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#868e96] hover:bg-[#f1f3f5] hover:text-[#fa5252] transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* 중앙 위젯 추가 버튼 */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <button
          type="button"
          onClick={onAdd}
          className="group/btn flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#dee2e6] bg-gray-50/30 p-8 transition-all hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/20 active:scale-95"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#adb5bd] border border-[#f1f3f5] group-hover/btn:bg-[var(--color-bt-primary)] group-hover/btn:text-white group-hover/btn:border-transparent shadow-sm transition-all group-hover/btn:shadow-lg">
            <Plus className="h-7 w-7" strokeWidth={2} />
          </div>
          <span className="text-[14.5px] font-bold text-[#495057] group-hover/btn:text-[var(--color-bt-primary)] transition-colors">위젯 추가하기</span>
        </button>
      </div>
    </div>
  );
}
