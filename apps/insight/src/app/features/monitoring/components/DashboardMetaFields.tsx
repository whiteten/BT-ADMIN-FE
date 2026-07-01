import { Divider, Form, Input } from 'antd';
import TagInput from '../../../components/TagInput';
import { DASHBOARD_ICON_LABELS, DASHBOARD_ICON_SVG, DASHBOARD_ICON_TYPES } from '../constants/dashboardIconConstants';
import type { DashboardIconType } from '../types';

const MAX_TAGS = 5;

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  icon: DashboardIconType | null;
  onIconChange: (icon: DashboardIconType) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  showErrors: boolean;
}

/**
 * 대시보드 메타 입력 폼 — 등록/수정 공용.
 * 단일 컬럼 구성: 이름 → 태그 → 아이콘 그리드 → 설명.
 */
export default function DashboardMetaFields({ name, onNameChange, tags, onTagsChange, icon, onIconChange, description, onDescriptionChange, showErrors }: Props) {
  return (
    <div className="p-7 pb-4">
      <Form layout="vertical">
        <Form.Item
          label="대시보드 이름"
          required
          validateStatus={showErrors && !name.trim() ? 'error' : ''}
          help={showErrors && !name.trim() ? '대시보드 이름을 입력하세요.' : undefined}
        >
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="예: 교환기 운영 관제" size="large" maxLength={120} />
        </Form.Item>

        <Divider />

        <Form.Item label="태그" tooltip="분류·검색에 사용됩니다." extra={`Enter 또는 쉼표로 여러 개 추가 — 최대 ${MAX_TAGS}개 (예: CTI, IVR, PBX, 통합, 상담사)`}>
          <TagInput value={tags} onChange={onTagsChange} maxTags={MAX_TAGS} size="large" />
        </Form.Item>

        <Divider />

        <Form.Item label="아이콘" required extra="목록 카드에 표시되는 시각 식별 아이콘">
          <div className="grid grid-cols-5 gap-2">
            {DASHBOARD_ICON_TYPES.map((ic) => {
              const isSelected = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  onClick={() => onIconChange(ic)}
                  className={`flex flex-col items-center gap-1.5 rounded p-3 transition border-2 ${
                    isSelected ? 'bg-blue-50/40' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                  }`}
                  style={isSelected ? { borderColor: '#085fb5', color: '#085fb5' } : undefined}
                >
                  <span className="flex h-6 w-6 items-center justify-center">{DASHBOARD_ICON_SVG[ic]}</span>
                  <span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{DASHBOARD_ICON_LABELS[ic]}</span>
                </button>
              );
            })}
          </div>
        </Form.Item>

        <Divider />

        <Form.Item label="설명">
          <Input.TextArea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="이 대시보드의 용도·범위를 간단히 입력하세요."
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </div>
  );
}
