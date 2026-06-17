import { Divider, Form, Input } from 'antd';
import { DASHBOARD_ICON_LABELS, DASHBOARD_ICON_SVG, DASHBOARD_ICON_TYPES } from '../constants/dashboardIconConstants';
import type { DashboardIconType, DomainCode } from '../types';

const DOMAIN_CHOICES: Array<{ value: DomainCode; label: string; hint: string }> = [
  { value: 'IE', label: '교환기', hint: '내선·국선·트렁크·콜 라우팅' },
  { value: 'IC', label: 'CTI', hint: '상담사·상담그룹·통화·CDR' },
  { value: 'IR', label: 'IVR', hint: '시나리오·음성안내·통계' },
];

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  domain: DomainCode | null;
  onDomainChange: (d: DomainCode) => void;
  icon: DashboardIconType | null;
  onIconChange: (icon: DashboardIconType) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  showErrors: boolean;
  /** 수정 모드 — 도메인은 생성 후 변경 불가. */
  domainLocked?: boolean;
}

/**
 * 대시보드 메타 입력 폼 — 등록/수정 공용.
 * 통계 보고서 생성 화면과 동일한 단일 컬럼 구성: 이름 → 카테고리 카드 → 아이콘 그리드 → 설명.
 */
export default function DashboardMetaFields({
  name,
  onNameChange,
  domain,
  onDomainChange,
  icon,
  onIconChange,
  description,
  onDescriptionChange,
  showErrors,
  domainLocked = false,
}: Props) {
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

        <Form.Item label="카테고리" required extra={domainLocked ? '생성 후에는 변경할 수 없습니다.' : undefined}>
          <div className="grid grid-cols-3 gap-4">
            {DOMAIN_CHOICES.map((d) => {
              const isSelected = domain === d.value;
              const disabled = domainLocked && !isSelected;
              return (
                <button
                  key={d.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => !domainLocked && onDomainChange(d.value)}
                  className={`rounded-md p-4 text-left transition-all border-2 ${
                    isSelected ? 'bg-blue-50/40 shadow-md' : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                  } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-gray-200 hover:shadow-none' : ''} ${domainLocked && isSelected ? 'cursor-default' : ''}`}
                  style={isSelected ? { borderColor: '#085fb5' } : undefined}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
                      {d.value}
                    </span>
                    {isSelected && (
                      <span className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#085fb5' }}>
                        선택됨
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold" style={isSelected ? { color: '#085fb5' } : { color: '#1f2937' }}>
                    {d.label}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{d.hint}</div>
                </button>
              );
            })}
          </div>
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
