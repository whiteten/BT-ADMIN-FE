import { Modal } from 'antd';
import { WIDGET_TEMPLATES, type WidgetTemplate } from '../../../features/stat/constants/widgetTemplates';

interface Props {
  open: boolean;
  onSelect: (template: WidgetTemplate | null) => void;
  onCancel: () => void;
}

export default function WidgetTemplateModal({ open, onSelect, onCancel }: Props) {
  return (
    <Modal title="어떤 통계를 만들 건가요?" open={open} onCancel={onCancel} footer={null} width={640}>
      <div className="grid grid-cols-3 gap-3 mt-4 mb-2">
        {WIDGET_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex flex-col items-start gap-2 rounded-lg border-2 border-gray-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/30"
            onClick={() => onSelect(t)}
          >
            <div className="text-2xl">{t.icon}</div>
            <div className="text-[13px] font-semibold text-gray-800">{t.name}</div>
            <div className="text-[12px] text-gray-500">{t.description}</div>
          </button>
        ))}
        <button
          type="button"
          className="flex flex-col items-start gap-2 rounded-lg border-2 border-dashed border-gray-200 p-4 text-left transition-colors hover:border-gray-400 hover:bg-gray-50"
          onClick={() => onSelect(null)}
        >
          <div className="text-2xl">⚙️</div>
          <div className="text-[13px] font-semibold text-gray-800">직접 설정</div>
          <div className="text-[12px] text-gray-500">빈 상태에서 시작하기</div>
        </button>
      </div>
    </Modal>
  );
}
