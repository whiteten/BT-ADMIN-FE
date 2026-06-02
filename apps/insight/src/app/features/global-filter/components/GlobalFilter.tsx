import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Divider, Radio, Select, TimePicker, Tooltip, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import ComparisonToggle from './ComparisonToggle';
import { useExportPanelExcel } from '../../panel/hooks/usePanelQueries';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useReportViewStore } from '../../report/hooks/useReportViewStore';
import { useGetSearchConditionOptions } from '../../search-condition/hooks/useSearchConditionQueries';
import type { ComparisonType, GlobalConditions, GlobalFilter, TimeUnit } from '../types';
import { DATE_RANGE_LABEL, createDisabledDate, createEndDisabledDate, getMaxDays, validateDateRange } from '../utils/dateRangeLimit';

interface GlobalFilterProps {
  reportId: number;
  mode: 'editor' | 'view';
}

// ── 데이터셋 동적 검색조건 Select — inputType별 렌더링 ────────────────────────
interface SearchCondSelectProps {
  searchCondId: number;
  fieldName: string;
  value: unknown;
  onChange(val: string | string[] | null): void;
}

function SearchCondSelect({ searchCondId, fieldName, value, onChange }: SearchCondSelectProps) {
  const { data, isLoading } = useGetSearchConditionOptions({ searchCondId });
  const options = data?.options ?? [];
  const inputType = data?.inputType ?? 'SELECT';
  const title = data?.title ?? fieldName;

  const isMulti = inputType === 'MULTI_SELECT' || inputType === 'TREE_MULTI_SELECT';

  // 멀티셀렉트: 최초 로드 시 전체 선택 기본값 (값 미설정 상태에서만 — 사용자가 비우면 유지)
  useEffect(() => {
    if (!isMulti || isLoading || value !== undefined || options.length === 0) return;
    onChange(options.map((o) => String(o.value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMulti, isLoading, value, data]);

  if (inputType === 'RADIO') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#495057] shrink-0">{title}</span>
        <Radio.Group value={value as string} onChange={(e) => onChange(e.target.value ?? null)} options={options} disabled={isLoading} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[#495057] shrink-0">{title}</span>
      <Select
        mode={isMulti ? 'multiple' : undefined}
        placeholder={`${title} 선택`}
        value={isMulti ? ((value as string[]) ?? []) : ((value as string) ?? undefined)}
        loading={isLoading}
        options={options}
        onChange={(val) => {
          if (isMulti) {
            const arr = val as string[];
            onChange(arr.length ? arr : null);
          } else {
            onChange((val as string) ?? null);
          }
        }}
        allowClear
        style={{ minWidth: 150, maxWidth: 320 }}
        popupMatchSelectWidth={false}
        showSearch
        optionFilterProp="label"
        maxTagCount={2}
        maxTagPlaceholder={(omitted) => `+${omitted.length}`}
      />
    </div>
  );
}

// ── 단위별 DatePicker picker 모드 ────────────────────────────────────────
function getPickerMode(unit: TimeUnit): 'date' | 'month' | 'year' {
  if (unit === 'MONTHLY') return 'month';
  if (unit === 'YEARLY') return 'year';
  return 'date';
}

function getDateFormat(unit: TimeUnit): string {
  if (unit === 'MONTHLY') return 'YYYY-MM';
  if (unit === 'YEARLY') return 'YYYY';
  return 'YYYY-MM-DD';
}

// period는 단위와 무관하게 항상 풀 ISO로 저장·전송 (백엔드 파싱 호환)
const ISO_DATE = 'YYYY-MM-DD';

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
// 공통(검색일자 + 단위 + 비교)은 상단 고정 / 데이터셋 동적 검색조건은 그 아래 행.
export default function GlobalFilter({ reportId }: GlobalFilterProps) {
  const { panels } = useReportEditorStore();
  const { globalFilter, committedFilter, setGlobalFilter, setTimeUnit, setComparison, setPeriod, setSearchValue, setConditions, commitFilter } = useReportViewStore();

  // 그리드 패널만 서버 Excel Export (보고서당 그리드 1개 한정). 그리드 패널이 있으면 편집/뷰 모드 무관하게 활성화.
  const gridPanel = panels.find((p) => p.panelType === 'GRID');
  const { mutate: exportExcel, isPending: isExporting } = useExportPanelExcel({
    mutationOptions: { onError: () => toast.error('내보내기에 실패했습니다.') },
  });
  const handleExport = () => {
    if (!gridPanel) return;
    exportExcel({
      reportId,
      panelId: gridPanel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
    });
  };

  const unit = globalFilter.timeUnit;
  const isMI = unit === '10MIN';
  const isHH = unit === 'HOURLY';
  const hasTime = isMI || isHH;

  // 시작/종료 시간 (10분/시간 단위 전용)
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(
    dayjs()
      .hour(23)
      .minute(isMI ? 59 : 50),
  );

  // 빠른검색 프리셋(전일/전주/전월/전년/OFF) — 백엔드 비교 아님, 검색일자를 오늘 기준으로 빠르게 세팅
  const [quickPreset, setQuickPreset] = useState<ComparisonType | null>(null);

  // 보고서 진입 시 localStorage에서 필터 복원 (기간/단위/비교)
  useEffect(() => {
    if (!reportId) return;
    try {
      const raw = localStorage.getItem(`reportFilter_${reportId}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<GlobalFilter>;
      const patch: Partial<GlobalFilter> = {};
      if (saved.timeUnit) patch.timeUnit = saved.timeUnit;
      if (saved.period) patch.period = saved.period;
      if ('comparison' in saved) patch.comparison = saved.comparison ?? null;
      if (Object.keys(patch).length) setGlobalFilter(patch);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // 패널 FILTER 슬롯 → searchCondId→fieldName 맵 (데이터셋 동적 검색조건)
  const filterBindings = useMemo(() => {
    const seen = new Map<number, string>();
    panels.forEach((panel) => {
      panel.fieldMap
        .filter((f) => f.slotType === 'FILTER' && f.searchCondId != null)
        .forEach((f) => {
          if (!seen.has(f.searchCondId!)) seen.set(f.searchCondId!, f.fieldName);
        });
    });
    return Array.from(seen.entries()).map(([searchCondId, fieldName]) => ({ searchCondId, fieldName }));
  }, [panels]);

  const fmt = getDateFormat(unit);
  // period는 항상 풀 ISO로 저장 → ISO로 파싱(단위별 fmt로 파싱하면 불일치로 Invalid Date 발생). 깨진 값은 오늘로 폴백.
  const startDate = useMemo(() => {
    const d = dayjs(globalFilter.period.from);
    return d.isValid() ? d : dayjs();
  }, [globalFilter.period.from]);
  const endDate = useMemo(() => {
    const d = dayjs(globalFilter.period.to);
    return d.isValid() ? d : dayjs();
  }, [globalFilter.period.to]);

  // disabledDate (시작일: 미래 비활성화 / 종료일: 시작일 이전·maxDays 초과 비활성화)
  const disabledStartDate = useMemo(() => createDisabledDate(unit), [unit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, unit), [globalFilter.period.from, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  // 시작일 또는 단위 변경 시 종료일이 범위를 벗어나면 자동 조정
  useEffect(() => {
    if (!startDate.isValid() || !endDate.isValid()) return;
    const maxDays = getMaxDays(unit);
    if (endDate.isBefore(startDate, 'day')) {
      setPeriod(startDate.format(ISO_DATE), startDate.format(ISO_DATE));
    } else if (endDate.diff(startDate, 'day') > maxDays) {
      const maxEnd = startDate.add(maxDays, 'day');
      const clamped = maxEnd.isAfter(dayjs(), 'day') ? dayjs() : maxEnd;
      setPeriod(startDate.format(ISO_DATE), clamped.format(ISO_DATE));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter.period.from, unit]);

  // 시간 단위로 변경 시 분 자동 조정 (시작 00분, 종료 50분)
  useEffect(() => {
    if (isHH) {
      setStartTime((prev) => (prev ? prev.minute(0) : prev));
      setEndTime((prev) => (prev ? prev.minute(50) : prev));
    }
  }, [isHH]);

  const handleSetStart = (date: Dayjs | null) => {
    if (date) setPeriod(date.format(ISO_DATE), globalFilter.period.to);
  };

  const handleSetEnd = (date: Dayjs | null) => {
    if (date) setPeriod(globalFilter.period.from, date.format(ISO_DATE));
  };

  // 빠른검색: 오늘 기준 상대기간으로 검색일자 세팅 (OFF=오늘). 조회 시 이 기간으로 질의됨.
  const handleQuick = (preset: ComparisonType | null) => {
    setQuickPreset(preset);
    setComparison(null); // 백엔드 비교는 사용 안 함
    const base = dayjs();
    const target =
      preset === 'PREV_DAY'
        ? base.subtract(1, 'day')
        : preset === 'PREV_WEEK'
          ? base.subtract(1, 'week')
          : preset === 'PREV_MONTH'
            ? base.subtract(1, 'month')
            : preset === 'PREV_YEAR'
              ? base.subtract(1, 'year')
              : base; // OFF → 오늘
    setPeriod(target.format(ISO_DATE), target.format(ISO_DATE));
  };

  const handleQuery = () => {
    const s = dayjs(globalFilter.period.from);
    const e = dayjs(globalFilter.period.to);
    if (s.isValid() && e.isValid() && !validateDateRange(s, e, unit)) {
      message.warning(`검색 기간은 ${DATE_RANGE_LABEL[unit]} 이내로 설정해주세요.`);
      return;
    }

    // 검색일자 시작/종료 시각만 백엔드로 전달 (제외요일/공휴일/점심/구간 미사용)
    const toHHmm = (t: Dayjs | null) => (t ? t.format('HHmm') : null);
    const conditions: GlobalConditions = {
      startTime: hasTime ? toHHmm(startTime) : null,
      endTime: hasTime ? toHHmm(endTime) : null,
      useInterval: false,
      intervalFrom: null,
      intervalTo: null,
      excludeDays: [],
    };
    setConditions(conditions);

    if (reportId) {
      try {
        const globalOnly = { period: globalFilter.period, timeUnit: globalFilter.timeUnit, comparison: globalFilter.comparison };
        localStorage.setItem(`reportFilter_${reportId}`, JSON.stringify(globalOnly));
      } catch {
        /* ignore */
      }
    }
    commitFilter();
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-white border-b-2 border-[var(--color-bt-border)] shadow-sm p-5">
      {/* 1행: 공통 조회조건 (상단 고정) — 좌: 검색일자/단위 · 우: 비교/조회/Export */}
      <div className="flex items-start gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <Select
            value={unit}
            onChange={(u: TimeUnit) => setTimeUnit(u)}
            options={[
              { label: '10분단위', value: '10MIN' },
              { label: '시간별', value: 'HOURLY' },
              { label: '일간', value: 'DAILY' },
              { label: '월간', value: 'MONTHLY' },
              { label: '년간', value: 'YEARLY' },
            ]}
            className="!max-w-[110px] !min-w-[90px]"
            popupMatchSelectWidth={false}
          />
          <DatePicker value={startDate} onChange={handleSetStart} picker={getPickerMode(unit)} format={fmt} allowClear={false} inputReadOnly disabledDate={disabledStartDate} />
          {hasTime && (
            <TimePicker
              value={startTime}
              onChange={setStartTime}
              format={isMI ? 'HH:mm' : 'HH:00'}
              minuteStep={10}
              allowClear={false}
              needConfirm={false}
              inputReadOnly
              style={{ width: 100 }}
            />
          )}
          <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
          <DatePicker value={endDate} onChange={handleSetEnd} picker={getPickerMode(unit)} format={fmt} allowClear={false} inputReadOnly disabledDate={disabledEndDate} />
          {hasTime && (
            <TimePicker
              value={endTime}
              onChange={setEndTime}
              format={isMI ? 'HH:mm' : 'HH:50'}
              minuteStep={10}
              allowClear={false}
              needConfirm={false}
              inputReadOnly
              style={{ width: 100 }}
            />
          )}

          {/* 비교분석 — 검색조건이므로 검색일자 바로 옆에 붙임 */}
          <Divider type="vertical" className="!h-5 !m-0" />
          <span className="text-sm font-medium text-[#495057] shrink-0">비교</span>
          <ComparisonToggle value={quickPreset} timeUnit={unit} onChange={handleQuick} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleQuery}>
            조회
          </Button>
          <Tooltip title={gridPanel ? undefined : '그리드 패널이 있는 보고서만 Export 가능합니다'}>
            <Button color="cyan" variant="solid" icon={<Download className="size-4" />} disabled={!gridPanel} loading={isExporting} onClick={handleExport}>
              Export
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 2행: 데이터셋 동적 검색조건 (공통 아래) */}
      {filterBindings.length > 0 && (
        <>
          <Divider className="!my-0" />
          <div className="flex flex-wrap items-center gap-3">
            {filterBindings.map(({ searchCondId, fieldName }) => (
              <SearchCondSelect
                key={searchCondId}
                searchCondId={searchCondId}
                fieldName={fieldName}
                value={globalFilter.searchValues[fieldName]}
                onChange={(val) => setSearchValue(fieldName, val)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
