import { Button, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import ComparisonToggle from './ComparisonToggle';
import TimeUnitToggle from './TimeUnitToggle';
import { useGetSearchBindings } from '../../report/hooks/useReportQueries';
import { useReportViewStore } from '../../report/hooks/useReportViewStore';
import type { ComparisonType, TimeUnit } from '../types';

interface GlobalFilterProps {
  reportId: number;
  mode: 'editor' | 'view';
}

export default function GlobalFilter({ reportId, mode: _mode }: GlobalFilterProps) {
  const { globalFilter, setTimeUnit, setComparison, setPeriod } = useReportViewStore();
  const { data: searchBindings = [] } = useGetSearchBindings({ params: { reportId } });

  const rangeValue: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(globalFilter.period.from), dayjs(globalFilter.period.to)];

  return (
    <div className="flex items-center gap-3 w-full bg-white bt-shadow px-7 py-4 flex-wrap">
      {/* 기간 */}
      <DatePicker.RangePicker
        value={rangeValue}
        onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) {
            setPeriod(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
          }
        }}
        format="YYYY-MM-DD"
        allowClear={false}
        disabledDate={(current) => current && current > dayjs().endOf('day')}
      />

      {/* 단위 */}
      <TimeUnitToggle value={globalFilter.timeUnit} onChange={(unit: TimeUnit) => setTimeUnit(unit)} />

      {/* 검색조건 바인딩 */}
      {searchBindings.map((binding) => (
        <Select key={binding.bindId} placeholder={binding.title} style={{ minWidth: 100 }} allowClear />
      ))}

      {/* 비교 */}
      <ComparisonToggle value={globalFilter.comparison} timeUnit={globalFilter.timeUnit} onChange={(comparison: ComparisonType | null) => setComparison(comparison)} />

      {/* 조회 버튼 */}
      <Button type="primary" className="ml-auto">
        조회
      </Button>
    </div>
  );
}
