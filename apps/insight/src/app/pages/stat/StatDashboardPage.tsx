import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Switch } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Settings2 } from 'lucide-react';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb = [{ label: '통계' }, { label: '대시보드' }];

const QUICK_RANGES: { label: string; getRange: () => [Dayjs, Dayjs] }[] = [
  { label: '오늘', getRange: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: '어제', getRange: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: '최근 7일', getRange: () => [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: '최근 30일', getRange: () => [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: '이번 달', getRange: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
];

const TIME_UNITS = ['분', '시', '일', '월', '년'] as const;

const COMPARE_OPTIONS = [
  { value: 'PREV_DAY', label: '전일' },
  { value: 'PREV_WEEK', label: '전주' },
  { value: 'PREV_MONTH', label: '전월' },
  { value: 'PREV_YEAR', label: '전년' },
  { value: 'CUSTOM', label: '사용자 정의' },
];

const CANVAS_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, #e4e7ec 1px, transparent 1px), linear-gradient(to bottom, #e4e7ec 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  backgroundColor: '#f1f3f6',
};

function StatDashboardPage() {
  const navigate = useNavigate();
  const [timeUnit, setTimeUnit] = useState<(typeof TIME_UNITS)[number]>('일');
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(29, 'day').startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf('day'));
  const [activePreset, setActivePreset] = useState('최근 30일');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareType, setCompareType] = useState('PREV_MONTH');
  const [hasQueried, setHasQueried] = useState(false);

  const handlePreset = (item: (typeof QUICK_RANGES)[number]) => {
    const [s, e] = item.getRange();
    setStartDate(s);
    setEndDate(e);
    setActivePreset(item.label);
  };

  const dayDiff = endDate.diff(startDate, 'day') + 1;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col w-full h-full bg-white bt-shadow overflow-hidden">
        {/* Report header */}
        <div className="flex items-center justify-between border-b px-5 py-3 flex-shrink-0">
          <span className="text-[14px] font-semibold">봇 서비스 일일 통계</span>
          <Button size="small" icon={<Settings2 size={14} />} onClick={() => navigate('/insight/stat/widget')}>
            보고서 관리
          </Button>
        </div>

        {/* Global filter bar */}
        <div className="space-y-4 border-b bg-gray-50/50 p-5 flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* Date range */}
            <div className="flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">기간</label>
              <div className="mt-1 flex items-center gap-2 rounded border bg-white px-3 py-2">
                <span className="font-mono text-[12px]">{startDate.format('YYYY-MM-DD')}</span>
                <span className="text-gray-400">~</span>
                <span className="font-mono text-[12px]">{endDate.format('YYYY-MM-DD')}</span>
                <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{dayDiff}일</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {QUICK_RANGES.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handlePreset(item)}
                    className={`rounded border px-2 py-0.5 text-[11px] transition ${
                      activePreset === item.label ? 'border-blue-600 bg-blue-50 font-semibold text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time unit */}
            <div className="w-60">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">시간 단위</label>
              <div className="mt-1 flex rounded border bg-white p-0.5">
                {TIME_UNITS.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setTimeUnit(unit)}
                    className={`flex-1 rounded py-1.5 text-[11px] transition ${timeUnit === unit ? 'bg-blue-600 font-semibold text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-gray-400">단위별 최대 조회 기간: 일=2년</div>
            </div>

            {/* Compare period */}
            <div className="w-52">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">비교 기간</label>
              <div className="mt-1 flex items-center gap-2 rounded border bg-white px-3 py-2">
                <Switch size="small" checked={compareEnabled} onChange={setCompareEnabled} />
                <Select
                  size="small"
                  disabled={!compareEnabled}
                  value={compareType}
                  onChange={setCompareType}
                  options={COMPARE_OPTIONS}
                  className="flex-1"
                  variant="borderless"
                  popupMatchSelectWidth={false}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-gray-400">OFFSET 비교 자동 활성화</div>
            </div>
          </div>

          {/* Info bar + query button */}
          <div className="flex items-center justify-between rounded border border-dashed bg-white p-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">i</span>이 필터는 보고서의{' '}
              <strong className="text-gray-600">모든 섹션</strong>에 동시 적용됩니다. {compareEnabled && '비교 기간을 켜면 모든 차트에 비교 시계열이 함께 그려집니다.'}
            </div>
            <Button type="primary" size="small" onClick={() => setHasQueried(true)}>
              조회
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-5" style={CANVAS_STYLE}>
          {!hasQueried ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="text-sm font-semibold text-gray-400">조회 버튼을 눌러 데이터를 불러오세요</div>
              <p className="text-center text-xs text-gray-300">기간과 시간 단위를 설정한 뒤 조회하면 모든 섹션의 데이터가 표시됩니다.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="text-sm font-semibold text-gray-400">표시할 섹션이 없습니다</div>
              <p className="text-center text-xs text-gray-300">보고서 관리에서 섹션을 추가하세요.</p>
              <Button size="small" onClick={() => navigate('/insight/stat/widget')}>
                보고서 관리
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatDashboardPage;
