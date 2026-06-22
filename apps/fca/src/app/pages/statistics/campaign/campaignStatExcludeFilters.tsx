import { Checkbox, Divider, Select } from 'antd';

export const EXCLUDE_DAY_OPTIONS = [
  { label: '월요일', value: 'MON' },
  { label: '화요일', value: 'TUE' },
  { label: '수요일', value: 'WED' },
  { label: '목요일', value: 'THU' },
  { label: '금요일', value: 'FRI' },
  { label: '토요일', value: 'SAT' },
  { label: '일요일', value: 'SUN' },
];

export function buildCampaignExcludeFilterParams(timeUnit: string, excludeDays: string[], excludeBusinessHoliday: boolean, excludeStatHoliday: boolean) {
  if (timeUnit === 'MM' || timeUnit === 'YY') {
    return { excludeDays: [], excludeBusinessHoliday: false, excludeStatHoliday: false };
  }
  return { excludeDays, excludeBusinessHoliday, excludeStatHoliday };
}

type CampaignStatExcludeFilterRowProps = {
  excludeDays: string[];
  onExcludeDaysChange: (value: string[]) => void;
  excludeBusinessHoliday: boolean;
  onExcludeBusinessHolidayChange: (checked: boolean) => void;
  excludeStatHoliday: boolean;
  onExcludeStatHolidayChange: (checked: boolean) => void;
};

/** Collapsible 2행 — 제외요일·공휴일 필터 (봇/NLU 통계와 동일 위치) */
export function CampaignStatExcludeFilterRow({
  excludeDays,
  onExcludeDaysChange,
  excludeBusinessHoliday,
  onExcludeBusinessHolidayChange,
  excludeStatHoliday,
  onExcludeStatHolidayChange,
}: CampaignStatExcludeFilterRowProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#495057] shrink-0">제외요일</span>
        <Select
          mode="multiple"
          value={excludeDays}
          onChange={(value) => onExcludeDaysChange(value ?? [])}
          allowClear
          maxTagCount="responsive"
          options={EXCLUDE_DAY_OPTIONS}
          placeholder="제외할 요일 선택"
          className="!min-w-[150px] !max-w-[300px]"
          popupMatchSelectWidth={false}
        />
      </div>
      <Divider orientation="vertical" className="!h-5 !m-0" />
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#495057] shrink-0">업무공휴일 제외</span>
        <Checkbox checked={excludeBusinessHoliday} onChange={(e) => onExcludeBusinessHolidayChange(e.target.checked)} />
      </div>
      <Divider orientation="vertical" className="!h-5 !m-0" />
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#495057] shrink-0">통계공휴일 제외</span>
        <Checkbox checked={excludeStatHoliday} onChange={(e) => onExcludeStatHolidayChange(e.target.checked)} />
      </div>
    </>
  );
}
