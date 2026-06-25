import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Form, Input } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { REPORT_ICON_LABELS, REPORT_ICON_SVG } from '../../features/report/constants/reportIconConstants';
import type { ReportIconType } from '../../features/report/types';
import TagInput from '@/components/custom/TagInput';

const ICON_TYPES: ReportIconType[] = ['agent', 'cti', 'ivr', 'channel', 'system'];
const MAX_TAGS = 5;

/**
 * 새 보고서 생성 마법사 — 보고서 정보 입력 단일 스텝.
 * 데이터셋은 보고서 단위가 아니라 캔버스에서 패널별로 선택한다(데이터셋 선택 모달).
 * 카테고리(도메인)는 태그로 대체한다(데이터셋과 동일).
 */
export default function ReportWizard() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [showErrors, setShowErrors] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<ReportIconType | null>(null);

  useEffect(() => {
    setBreadcrumb([
      { title: '통계', path: '/insight/statistics' },
      { title: '보고서 관리', path: '/insight/statistics/reports' },
      { title: '새 보고서 생성', path: '/insight/statistics/reports/new' },
    ]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleSubmit = () => {
    if (!title.trim() || !selectedIcon) {
      setShowErrors(true);
      if (!title.trim()) toast.error('보고서 이름을 입력하세요.');
      else toast.error('아이콘을 선택하세요.');
      return;
    }

    navigate('/insight/statistics/reports/new/canvas', {
      state: {
        title: title.trim(),
        tags,
        iconType: selectedIcon ?? undefined,
      },
    });
  };

  const handleCancel = () => navigate('/insight/statistics/reports');

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <StepMeta
              title={title}
              onTitleChange={setTitle}
              tags={tags}
              onTagsChange={setTags}
              selectedIcon={selectedIcon}
              onIconChange={setSelectedIcon}
              showErrors={showErrors}
            />
          </div>

          <div className="bg-white px-7 py-4">
            <div className="flex items-center justify-center gap-2">
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" onClick={handleSubmit}>
                보고서 구성하기 →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report metadata ─────────────────────────────────────────────────────────

interface StepMetaProps {
  title: string;
  onTitleChange(v: string): void;
  tags: string[];
  onTagsChange(tags: string[]): void;
  selectedIcon: ReportIconType | null;
  onIconChange(icon: ReportIconType): void;
  showErrors: boolean;
}

function StepMeta({ title, onTitleChange, tags, onTagsChange, selectedIcon, onIconChange, showErrors }: StepMetaProps) {
  return (
    <div className="p-7 pb-4">
      <Form layout="vertical">
        <Form.Item
          label="보고서 이름"
          required
          validateStatus={showErrors && !title.trim() ? 'error' : ''}
          help={showErrors && !title.trim() ? '보고서 이름을 입력하세요.' : undefined}
        >
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="내선 사용 현황 일일 보고" size="large" />
        </Form.Item>

        <Divider />

        <Form.Item
          label="태그"
          tooltip="분류·검색에 사용됩니다. 카테고리를 대체합니다."
          extra={`Enter 또는 쉼표로 여러 개 추가 — 최대 ${MAX_TAGS}개 (예: CTI, IVR, PBX, 통합, 상담사)`}
        >
          <TagInput value={tags} onChange={onTagsChange} maxTags={MAX_TAGS} size="large" />
        </Form.Item>

        <Divider />

        <Form.Item label="아이콘" required extra="목록 카드에 표시되는 시각 식별 아이콘">
          <div className="grid grid-cols-5 gap-2">
            {ICON_TYPES.map((icon) => {
              const isSelected = selectedIcon === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onIconChange(icon)}
                  className={`flex flex-col items-center gap-1.5 rounded p-3 transition border-2 ${
                    isSelected ? 'bg-blue-50/40' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                  }`}
                  style={isSelected ? { borderColor: '#085fb5', color: '#085fb5' } : undefined}
                >
                  <span className="flex h-6 w-6 items-center justify-center">{REPORT_ICON_SVG[icon]}</span>
                  <span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{REPORT_ICON_LABELS[icon]}</span>
                </button>
              );
            })}
          </div>
        </Form.Item>
      </Form>
    </div>
  );
}
