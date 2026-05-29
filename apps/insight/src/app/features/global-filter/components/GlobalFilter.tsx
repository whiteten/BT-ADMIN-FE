import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Divider, Radio, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import ComparisonToggle from './ComparisonToggle';
import TimeUnitToggle from './TimeUnitToggle';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useReportViewStore } from '../../report/hooks/useReportViewStore';
import { useGetSearchConditionOptions } from '../../search-condition/hooks/useSearchConditionQueries';
import type { ComparisonType, GlobalFilter, TimeUnit } from '../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/libs/shared-ui/src/components/shadcn/collapsible';

interface GlobalFilterProps {
  reportId: number;
  mode: 'editor' | 'view';
}

// ── 검색조건 Select — inputType별 렌더링 ──────────────────────────────────
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

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function GlobalFilter({ reportId, mode: _mode }: GlobalFilterProps) {
  const { panels } = useReportEditorStore();
  const { globalFilter, setGlobalFilter, setTimeUnit, setComparison, setPeriod, setSearchValue, commitFilter } = useReportViewStore();

  // 보고서 진입 시 localStorage에서 필터 복원
  useEffect(() => {
    if (!reportId) return;
    try {
      const raw = localStorage.getItem(`reportFilter_${reportId}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<GlobalFilter>;
      const patch: Partial<GlobalFilter> = {};
      if (saved.timeUnit) patch.timeUnit = saved.timeUnit;
      if ('comparison' in saved) patch.comparison = saved.comparison ?? null;
      if (saved.period) patch.period = saved.period;
      if (Object.keys(patch).length) setGlobalFilter(patch);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleQuery = () => {
    if (reportId) {
      try {
        const { searchValues: _, ...globalOnly } = globalFilter;
        localStorage.setItem(`reportFilter_${reportId}`, JSON.stringify(globalOnly));
      } catch {
        /* ignore */
      }
    }
    commitFilter();
  };

  const unit = globalFilter.timeUnit;
  const isMI = unit === '10MIN';
  const isHH = unit === 'HOURLY';
  const hasTime = isMI || isHH;

  // 시작/종료 시간 (MI/HH 전용, 로컬 상태)
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(
    dayjs()
      .hour(23)
      .minute(isMI ? 59 : 50),
  );

  // 구간검색 / 점심시간
  const [excludeLunch, setExcludeLunch] = useState(false);
  const [useInterval, setUseInterval] = useState(false);
  const [intervalStart, setIntervalStart] = useState<Dayjs | null>(dayjs().hour(9).minute(0));
  const [intervalEnd, setIntervalEnd] = useState<Dayjs | null>(dayjs().hour(18).minute(0));

  // Collapsible (MI/HH만 존재)
  const [isOpen, setIsOpen] = useState(true);

  // 패널 FILTER 슬롯 → searchCondId→fieldName 맵
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
  const startDate = dayjs(globalFilter.period.from, fmt);
  const endDate = dayjs(globalFilter.period.to, fmt);

  const handleSetStart = (date: Dayjs | null) => {
    if (date) setPeriod(date.format(fmt), globalFilter.period.to);
  };

  const handleSetEnd = (date: Dayjs | null) => {
    if (date) setPeriod(globalFilter.period.from, date.format(fmt));
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-white border-b-2 border-[var(--color-bt-border)] shadow-sm p-5">
      {/* ── 1행: 글로벌 검색조건 (항상 노출) ─────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 검색일자 그룹 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>

          {/* 시작일 */}
          <DatePicker
            value={startDate}
            onChange={handleSetStart}
            picker={getPickerMode(unit)}
            format={fmt}
            allowClear={false}
            inputReadOnly
            disabledDate={(c) => c && c > dayjs().endOf('day')}
          />

          {/* 시작 시간 (MI/HH) */}
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

          <span className="text-sm text-[#495057]">~</span>

          {/* 종료일 */}
          <DatePicker
            value={endDate}
            onChange={handleSetEnd}
            picker={getPickerMode(unit)}
            format={fmt}
            allowClear={false}
            inputReadOnly
            disabledDate={(c) => c && (c > dayjs().endOf('day') || c.isBefore(startDate, 'day'))}
          />

          {/* 종료 시간 (MI/HH) */}
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
        </div>

        {/* 단위 */}
        <TimeUnitToggle value={unit} onChange={(u: TimeUnit) => setTimeUnit(u)} />

        {/* 비교분석 */}
        <ComparisonToggle value={globalFilter.comparison} timeUnit={unit} onChange={(c: ComparisonType | null) => setComparison(c)} />

        {/* Collapsible 토글 (MI/HH만) */}
        {hasTime && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="text"
                size="small"
                icon={isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                className="text-[var(--color-bt-fg-muted)]"
              />
            </CollapsibleTrigger>
          </Collapsible>
        )}

        {/* 조회 / Export */}
        <div className="ml-auto flex items-center gap-2">
          <Button type="primary" icon={<Search className="w-3.5 h-3.5" />} onClick={handleQuery}>
            조회
          </Button>
          <Button color="cyan" variant="solid" icon={<Download className="w-3.5 h-3.5" />}>
            Export
          </Button>
        </div>
      </div>

      {/* ── 2행: 추가 검색조건 (동적, FILTER 슬롯 바인딩) ───────────── */}
      {filterBindings.length > 0 && (
        <>
          <Divider className="!my-0" />
          <div className="flex items-center gap-4 flex-wrap">
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

      {/* ── 3행: Collapsible (MI/HH만) — 점심시간/구간검색 ─────────── */}
      {hasTime && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <Divider className="!my-0 !mb-3" />
            <div className="flex items-center gap-5 flex-wrap">
              <Checkbox checked={excludeLunch} onChange={(e) => setExcludeLunch(e.target.checked)}>
                <span className="text-sm">점심시간 제외</span>
              </Checkbox>

              <div className="flex items-center gap-2">
                <Checkbox checked={useInterval} onChange={(e) => setUseInterval(e.target.checked)}>
                  <span className="text-sm">구간검색</span>
                </Checkbox>
                {useInterval && (
                  <>
                    <TimePicker
                      value={intervalStart}
                      onChange={setIntervalStart}
                      format={isMI ? 'HH:mm' : 'HH:00'}
                      minuteStep={10}
                      size="small"
                      needConfirm={false}
                      style={{ width: 90 }}
                    />
                    <span className="text-sm text-[#495057]">~</span>
                    <TimePicker
                      value={intervalEnd}
                      onChange={setIntervalEnd}
                      format={isMI ? 'HH:mm' : 'HH:00'}
                      minuteStep={10}
                      size="small"
                      needConfirm={false}
                      style={{ width: 90 }}
                    />
                  </>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
