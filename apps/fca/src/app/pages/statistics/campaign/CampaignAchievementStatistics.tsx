import { useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, Download, Search } from 'lucide-react';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_CODES, CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_OPTIONS, type CampaignAchievementStatCategory } from './campaignAchievementStatConfig';
import {
  buildAchievementCampaignOptions,
  buildAchievementScenarioOptions,
  isAllOptionsSelected,
  parseCampaignIds,
  parseScenarioListIds,
} from './campaignAchievementStatOptionUtils';
import { createFlexibleNameColumnDef } from './campaignResultStatGridColumns';
import { CampaignStatExcludeFilterRow, buildCampaignExcludeFilterParams } from './campaignStatExcludeFilters';
import { statisticsApi } from '../../../features/statistics/api/statisticsApi';
import { getTimeFormat } from '../../../features/statistics/hooks/useDateRangeLimit';
import { useGetCampaignAchievementStatList, useGetCampaignOptionList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { CampaignAchievementStatListItem } from '../../../features/statistics/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/libs/shared-ui/src/components/shadcn/collapsible';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const DEFAULT_STAT_CATEGORY = CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_CODES[0];

const CAMPAIGN_ACHIEVEMENT_CATEGORY_STORAGE_KEY = 'campaign-achievement-result:stat-category';
const CAMPAIGN_ACHIEVEMENT_SELECTIONS_STORAGE_KEY = 'campaign-achievement-result:selections-by-category';

type CategorySelections = { campaigns: string[]; scenarios: string[] };

function loadStoredStatCategory(): CampaignAchievementStatCategory | null {
  try {
    const saved = localStorage.getItem(CAMPAIGN_ACHIEVEMENT_CATEGORY_STORAGE_KEY);
    if (saved && CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_CODES.includes(saved as CampaignAchievementStatCategory)) {
      return saved as CampaignAchievementStatCategory;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function loadStoredSelectionsByCategory(): Partial<Record<CampaignAchievementStatCategory, CategorySelections>> {
  try {
    const saved = localStorage.getItem(CAMPAIGN_ACHIEVEMENT_SELECTIONS_STORAGE_KEY);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<Record<CampaignAchievementStatCategory, CategorySelections>>) : {};
  } catch {
    return {};
  }
}

function resolveSelectionsForCategory(
  category: CampaignAchievementStatCategory,
  campaignOptionList: Parameters<typeof buildAchievementCampaignOptions>[1],
  saved: CategorySelections | undefined,
): CategorySelections {
  const campaignOptions = buildAchievementCampaignOptions(category, campaignOptionList);
  if (campaignOptions.length === 0) return { campaigns: [], scenarios: [] };

  const allCampaigns = campaignOptions.map((o) => o.value);
  const validSavedCampaigns = (saved?.campaigns ?? []).filter((v) => allCampaigns.includes(v));
  const campaigns = validSavedCampaigns.length > 0 ? validSavedCampaigns : allCampaigns;

  const scenarioOptions = buildAchievementScenarioOptions(category, campaignOptionList, campaigns);
  const allScenarios = scenarioOptions.map((o) => o.value);
  const validSavedScenarios = (saved?.scenarios ?? []).filter((v) => allScenarios.includes(v));
  const scenarios = validSavedScenarios.length > 0 ? validSavedScenarios : allScenarios;

  return { campaigns, scenarios };
}

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '캠페인 통계', path: '/fca/statistics/campaign' },
  { title: '캠페인 목적 달성률 통계', path: '/fca/statistics/campaign/achievement-result' },
];

// timeUnit별 최대 검색 기간 (일 단위) — 레거시 IPR94S1310 기준
// 일별: 3개월, 월별: 6개월, 년별: 2년
const MAX_DATE_RANGE: Record<string, number> = {
  DD: 92,
  MM: 186,
  YY: 730,
};

const DATE_RANGE_LABEL: Record<string, string> = {
  DD: '3개월',
  MM: '6개월',
  YY: '2년',
};

const getMaxDays = (unit: string) => MAX_DATE_RANGE[unit] ?? 92;
const getPickerMode = (unit: string): 'date' | 'month' | 'year' => {
  if (unit === 'MM') return 'month';
  if (unit === 'YY') return 'year';
  return 'date';
};
const getDatePickerFormat = (unit: string): string => {
  if (unit === 'MM') return 'YYYY-MM';
  if (unit === 'YY') return 'YYYY';
  return 'YYYY-MM-DD';
};
const validateDateRange = (start: Dayjs, end: Dayjs, unit: string): boolean => {
  if (end.isBefore(start, 'day')) return false;
  return end.diff(start, 'day') <= getMaxDays(unit);
};

// 시작일 비활성화 함수 (미래 날짜)
const createDisabledDate = () => (current: Dayjs) => {
  if (!current) return false;
  return current.isAfter(dayjs(), 'day');
};

// 종료일 비활성화 함수 (미래 + 시작일 이전 + 최대범위 초과)
const createEndDisabledDate = (start: Dayjs | null, unit: string) => (current: Dayjs) => {
  if (!current) return false;
  if (current.isAfter(dayjs(), 'day')) return true;
  if (start) {
    if (current.isBefore(start, 'day')) return true;
    if (current.diff(start, 'day') > getMaxDays(unit)) return true;
  }
  return false;
};

// 셀 스타일 헬퍼
const numberCellStyle = (params: { node?: { rowPinned?: string | null } }): CellStyle =>
  params.node?.rowPinned === 'bottom'
    ? { display: 'flex', fontWeight: 'bold', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }
    : { display: 'flex', fontWeight: 'normal', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' };

const textCellStyle = (params: { node?: { rowPinned?: string | null } }): CellStyle =>
  params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' };

const dateColDef = (displayTimeUnit: string): Pick<ColDef, 'flex' | 'minWidth' | 'maxWidth'> => ({
  flex: 0,
  minWidth: displayTimeUnit === 'YY' ? 88 : displayTimeUnit === 'MM' ? 96 : 112,
  maxWidth: displayTimeUnit === 'YY' ? 100 : displayTimeUnit === 'MM' ? 110 : 130,
});

// 평균통화시간 포맷터 (초 단위 가정)
const durationFormatter = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return '';
  const sec = Number(value);
  if (Number.isNaN(sec)) return String(value);
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const CAMPAIGN_ACHIEVEMENT_COLUMN_DEFS: Record<CampaignAchievementStatCategory, ColDef<CampaignAchievementStatListItem>[]> = {
  HAPPY_CALL: [
    { headerName: '설문완료 건수', field: 'surveyCompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '부정답변 건수', field: 'negativeAnswerCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '성공률', field: 'successRatePct', width: 100, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '평균통화시간', field: 'avgCallDurationSec', width: 120, valueFormatter: durationFormatter, cellStyle: numberCellStyle },
  ],
  PHYSICAL_TRANSFER: [
    { headerName: '접수건수', field: 'transferReceiptCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '접수거절건수', field: 'transferRejectCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '중간안내', field: 'transferMidGuideCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '취소안내', field: 'transferCancelGuideCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '인증실패건수', field: 'transferAuthFailCnt', width: 130, cellStyle: numberCellStyle },
    { headerName: '평균통화시간', field: 'transferAvgCallDurationSec', width: 120, valueFormatter: durationFormatter, cellStyle: numberCellStyle },
  ],
  MATURITY_NOTICE: [
    { headerName: '완결 건수', field: 'noticeCompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '미완료 건수', field: 'noticeIncompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '성공률', field: 'noticeSuccessRatePct', width: 100, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '문자발송건수', field: 'noticeNoSendCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '평균통화시간', field: 'noticeAvgCallDurationSec', width: 120, valueFormatter: durationFormatter, cellStyle: numberCellStyle },
  ],
  SHORT_TERM_OVERDUE: [
    { headerName: '완결 건수', field: 'overdueCompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '미완료 건수', field: 'overdueIncompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '성공률', field: 'overdueSuccessRatePct', width: 100, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '문자발송건수', field: 'overdueNoSendCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '평균통화시간', field: 'overdueAvgCallDurationSec', width: 120, valueFormatter: durationFormatter, cellStyle: numberCellStyle },
  ],
};

export default function CampaignAchievementStatistics() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 검색 조건 상태
  const [statCategory, setStatCategory] = useState<CampaignAchievementStatCategory>(() => loadStoredStatCategory() ?? DEFAULT_STAT_CATEGORY);
  const [campaignSelections, setCampaignSelections] = useState<string[]>([]);
  const [scenarioSelections, setScenarioSelections] = useState<string[]>([]);
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day').startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));
  const [excludeDays, setExcludeDays] = useState<string[]>([]);
  const [excludeBusinessHoliday, setExcludeBusinessHoliday] = useState(false);
  const [excludeStatHoliday, setExcludeStatHoliday] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<CampaignAchievementStatListItem>>(null);
  const [rowData, setRowData] = useState<CampaignAchievementStatListItem[]>([]);
  const [displayTimeUnit, setDisplayTimeUnit] = useState<string>('DD');
  const [displayStatCategory, setDisplayStatCategory] = useState<CampaignAchievementStatCategory>(DEFAULT_STAT_CATEGORY);

  // disabledDate 함수
  const disabledDate = useMemo(() => createDisabledDate(), []);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  const { data: campaignOptionList } = useGetCampaignOptionList();

  const campaignSelectOptions = useMemo(() => buildAchievementCampaignOptions(statCategory, campaignOptionList), [statCategory, campaignOptionList]);

  const scenarioSelectOptions = useMemo(
    () => buildAchievementScenarioOptions(statCategory, campaignOptionList, campaignSelections),
    [statCategory, campaignOptionList, campaignSelections],
  );

  const skipSaveSelectionsRef = useRef(true);

  // 구분·옵션 로드 시 저장값 복원, 없으면 전체 선택
  useEffect(() => {
    if (!campaignOptionList) return;

    const campaignOptions = buildAchievementCampaignOptions(statCategory, campaignOptionList);
    if (campaignOptions.length === 0) {
      setCampaignSelections([]);
      setScenarioSelections([]);
      return;
    }

    const store = loadStoredSelectionsByCategory();
    const { campaigns, scenarios } = resolveSelectionsForCategory(statCategory, campaignOptionList, store[statCategory]);

    skipSaveSelectionsRef.current = true;
    setCampaignSelections(campaigns);
    setScenarioSelections(scenarios);
    requestAnimationFrame(() => {
      skipSaveSelectionsRef.current = false;
    });
  }, [statCategory, campaignOptionList]);

  useEffect(() => {
    localStorage.setItem(CAMPAIGN_ACHIEVEMENT_CATEGORY_STORAGE_KEY, statCategory);
  }, [statCategory]);

  useEffect(() => {
    if (skipSaveSelectionsRef.current) return;
    if (campaignSelections.length === 0 && scenarioSelections.length === 0) return;

    const store = loadStoredSelectionsByCategory();
    store[statCategory] = { campaigns: campaignSelections, scenarios: scenarioSelections };
    localStorage.setItem(CAMPAIGN_ACHIEVEMENT_SELECTIONS_STORAGE_KEY, JSON.stringify(store));
  }, [statCategory, campaignSelections, scenarioSelections]);

  // fromTime / toTime 계산 (UI state에서 직접 도출)
  const fromTime = (() => {
    if (!startDate) return '';
    if (timeUnit === 'DD') return startDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return startDate.format('YYYYMM');
    return startDate.format('YYYY');
  })();

  const toTime = (() => {
    if (!endDate) return '';
    if (timeUnit === 'DD') return endDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return endDate.format('YYYYMM');
    return endDate.format('YYYY');
  })();

  const campaignStatParams = useMemo(() => {
    const campaignListIds = parseScenarioListIds(scenarioSelections);
    const campaignIds = parseCampaignIds(campaignSelections);
    const allScenariosSelected = isAllOptionsSelected(scenarioSelections, scenarioSelectOptions);
    const base: Record<string, unknown> = {
      timeUnit,
      fromTime,
      toTime,
      statCategory,
      ...buildCampaignExcludeFilterParams(timeUnit, excludeDays, excludeBusinessHoliday, excludeStatHoliday),
    };
    if (campaignListIds.length > 0 && !allScenariosSelected) {
      base.campaignListIds = campaignListIds;
    } else if (campaignIds.length > 0) {
      base.campaignIds = campaignIds;
    }
    return base;
  }, [timeUnit, fromTime, toTime, statCategory, excludeDays, excludeBusinessHoliday, excludeStatHoliday, campaignSelections, scenarioSelections, scenarioSelectOptions]);

  const {
    data: campaignAchievementStatData,
    isLoading: isLoadingCampaignAchievementStatList,
    refetch,
  } = useGetCampaignAchievementStatList({
    params: campaignStatParams,
    queryOptions: { enabled: false },
  });

  useEffect(() => {
    if (campaignAchievementStatData !== undefined) setRowData(campaignAchievementStatData.items);
  }, [campaignAchievementStatData]);

  const summaryRow: CampaignAchievementStatListItem[] = campaignAchievementStatData?.summary ? [{ ...campaignAchievementStatData.summary, psrTimeKey: '전체합계' }] : [];

  // startDate 또는 timeUnit 변경 시 endDate 자동 조정
  useEffect(() => {
    if (startDate && endDate) {
      const maxDays = getMaxDays(timeUnit);
      if (endDate.isBefore(startDate, 'day')) {
        setEndDate(startDate);
      } else if (endDate.diff(startDate, 'day') > maxDays) {
        const maxEnd = startDate.add(maxDays, 'day');
        setEndDate(maxEnd.isAfter(dayjs(), 'day') ? dayjs() : maxEnd);
      }
    }
  }, [endDate, startDate, timeUnit]);

  const handleStatCategoryChange = (value: CampaignAchievementStatCategory) => {
    setStatCategory(value);
    setRowData([]);
  };

  const handleSearch = () => {
    if (campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return;
    }

    if (scenarioSelections.length === 0) {
      toast.warning('시나리오를 선택해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }

    if (!validateDateRange(startDate, endDate, timeUnit)) {
      toast.warning(`검색 기간은 ${DATE_RANGE_LABEL[timeUnit]} 이내로 설정해주세요.`);
      return;
    }

    if (fromTime && toTime && fromTime > toTime) {
      toast.warning('시작일자가 종료일자보다 늦을 수 없습니다.');
      return;
    }

    setDisplayTimeUnit(timeUnit);
    setDisplayStatCategory(statCategory);
    refetch();
  };

  const columnDefs = useMemo(() => {
    const dateCol: ColDef<CampaignAchievementStatListItem> = {
      headerName: '날짜',
      field: 'psrTimeKey',
      ...dateColDef(displayTimeUnit),
      pinned: 'left',
      colSpan: (params) => (params.node?.rowPinned === 'bottom' ? 2 : 1),
      valueFormatter: ({ value, node }) => {
        if (node?.rowPinned === 'bottom') return value ?? '';
        return value ? dayjs(value).format(getTimeFormat(displayTimeUnit)) : '-';
      },
      cellStyle: textCellStyle,
    };
    const scenarioCol = createFlexibleNameColumnDef<CampaignAchievementStatListItem>(
      '시나리오',
      'campaignListName',
      (data) => String(data?.campaignListName ?? ''),
      textCellStyle,
      { minWidth: 160, pinned: 'left' },
    );
    return [dateCol, scenarioCol, ...CAMPAIGN_ACHIEVEMENT_COLUMN_DEFS[displayStatCategory]];
  }, [displayStatCategory, displayTimeUnit]);

  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:stats-campaign-achievement-result:export');

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = async () => {
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await statisticsApi.exportCampaignAchievementStatExcel({
        ...campaignStatParams,
        timeUnit: displayTimeUnit,
        statCategory: displayStatCategory,
        ...buildCampaignExcludeFilterParams(displayTimeUnit, excludeDays, excludeBusinessHoliday, excludeStatHoliday),
      });
      const fileName = extractFileName(response.headers['content-disposition'], `CAMPAIGN_ACHIEVEMENT_RESULT_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0">
      <div className="flex flex-col gap-5 w-full h-full min-h-0 bg-white bt-shadow p-5">
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <header className="flex flex-col gap-3 shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">기간구분</span>
                  <Select
                    value={timeUnit}
                    onChange={(v) => setTimeUnit(v)}
                    options={[
                      { label: '일간', value: 'DD' },
                      { label: '월간', value: 'MM' },
                      { label: '년간', value: 'YY' },
                    ]}
                    className="!max-w-[110px] !min-w-[90px]"
                    popupMatchSelectWidth={false}
                    defaultValue="DD"
                  />
                  <span className="text-sm font-medium text-[#495057] shrink-0">조회기간</span>
                  <DatePicker
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    picker={getPickerMode(timeUnit)}
                    format={getDatePickerFormat(timeUnit)}
                    disabledDate={disabledDate}
                    inputReadOnly
                    allowClear={false}
                  />
                  <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
                  <DatePicker
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    picker={getPickerMode(timeUnit)}
                    format={getDatePickerFormat(timeUnit)}
                    disabledDate={disabledEndDate}
                    inputReadOnly
                    allowClear={false}
                  />
                </div>
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">구분</span>
                  <Select
                    value={statCategory}
                    onChange={handleStatCategoryChange}
                    options={CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_OPTIONS}
                    className="!min-w-[120px]"
                    popupMatchSelectWidth={false}
                  />
                  <span className="text-sm font-medium text-[#495057] shrink-0">캠페인</span>
                  <Select
                    mode="multiple"
                    value={campaignSelections}
                    onChange={(value) => {
                      const next = value ?? [];
                      setCampaignSelections(next);
                      const validScenarios = buildAchievementScenarioOptions(statCategory, campaignOptionList, next);
                      const validSet = new Set(validScenarios.map((o) => o.value));
                      setScenarioSelections((prev) => {
                        const filtered = prev.filter((v) => validSet.has(v));
                        if (filtered.length > 0) return filtered;
                        return validScenarios.map((o) => o.value);
                      });
                    }}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={campaignSelectOptions}
                    placeholder="캠페인을 선택하세요."
                    optionFilterProp="label"
                    style={{ width: '15rem' }}
                    popupMatchSelectWidth={false}
                    dropdownRender={(menu) => (
                      <>
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (campaignSelections.length === campaignSelectOptions.length) {
                              setCampaignSelections([]);
                            } else {
                              setCampaignSelections(campaignSelectOptions.map((o) => o.value));
                            }
                          }}
                        >
                          <Checkbox
                            checked={campaignSelections.length === campaignSelectOptions.length && campaignSelectOptions.length > 0}
                            indeterminate={campaignSelections.length > 0 && campaignSelections.length < campaignSelectOptions.length}
                          />
                          <span className="text-sm">전체 선택</span>
                        </div>
                        <Divider style={{ margin: '4px 0' }} />
                        {menu}
                      </>
                    )}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">시나리오</span>
                  <Select
                    mode="multiple"
                    value={scenarioSelections}
                    onChange={(value) => setScenarioSelections(value ?? [])}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={scenarioSelectOptions}
                    placeholder="시나리오를 선택하세요."
                    optionFilterProp="label"
                    style={{ width: '15rem' }}
                    popupMatchSelectWidth={false}
                    disabled={campaignSelections.length === 0}
                    dropdownRender={(menu) => (
                      <>
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (scenarioSelections.length === scenarioSelectOptions.length) {
                              setScenarioSelections([]);
                            } else {
                              setScenarioSelections(scenarioSelectOptions.map((o) => o.value));
                            }
                          }}
                        >
                          <Checkbox
                            checked={scenarioSelections.length === scenarioSelectOptions.length && scenarioSelectOptions.length > 0}
                            indeterminate={scenarioSelections.length > 0 && scenarioSelections.length < scenarioSelectOptions.length}
                          />
                          <span className="text-sm">전체 선택</span>
                        </div>
                        <Divider style={{ margin: '4px 0' }} />
                        {menu}
                      </>
                    )}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <Button type="default" icon={<ChevronDown className={cn('size-4 transition-transform', isFilterOpen && 'rotate-180')} />} className="!size-8 !min-w-8" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
                  조회
                </Button>
                {hasExcelPermission && (
                  <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />} onClick={handleExcelDownload}>
                    Export
                  </Button>
                )}
              </div>
            </div>
            {timeUnit !== 'MM' && timeUnit !== 'YY' ? (
              <CollapsibleContent>
                <div className="flex flex-wrap items-center gap-3">
                  <CampaignStatExcludeFilterRow
                    excludeDays={excludeDays}
                    onExcludeDaysChange={setExcludeDays}
                    excludeBusinessHoliday={excludeBusinessHoliday}
                    onExcludeBusinessHolidayChange={setExcludeBusinessHoliday}
                    excludeStatHoliday={excludeStatHoliday}
                    onExcludeStatHolidayChange={setExcludeStatHoliday}
                  />
                </div>
              </CollapsibleContent>
            ) : null}
          </header>
        </Collapsible>
        <div className="flex-1 min-h-0 w-full">
          <AgGridReact<CampaignAchievementStatListItem>
            key={displayStatCategory}
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) =>
              `${displayStatCategory}_${params.data.tenantId ?? ''}_${params.data.campaignId ?? ''}_${params.data.campaignListId ?? ''}_${params.data.psrTimeKey ?? ''}_${params.data.seq ?? ''}`
            }
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoadingCampaignAchievementStatList}
            pagination={false}
            rowNumbers={false}
            sideBar={false}
            pinnedBottomRowData={summaryRow}
            rowClassRules={{
              '!bg-[#F8F9FA]': (params) => params.node.rowPinned === 'bottom',
            }}
          />
        </div>
      </div>
    </div>
  );
}
