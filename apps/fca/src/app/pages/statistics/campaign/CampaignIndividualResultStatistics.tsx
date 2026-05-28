import { useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { statisticsApi } from '../../../features/statistics/api/statisticsApi';
import { useGetCampaignOptionList, useGetCampaignResultStatList, useGetTenantOptionList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { CampaignResultStatListItem } from '../../../features/statistics/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '캠페인 통계', path: '/fca/statistics/campaign' },
  { title: '캠페인별 통계', path: '/fca/statistics/campaign/campaign-individual-result' },
];

const CAMPAIGN_INDIVIDUAL_TENANT_STORAGE_KEY = 'campaign-individual-result:tenant-ids';
const CAMPAIGN_INDIVIDUAL_CAMPAIGN_STORAGE_KEY = 'campaign-individual-result:campaign-selections';
const CAMPAIGN_INDIVIDUAL_SCENARIO_STORAGE_KEY = 'campaign-individual-result:scenario-selections';

// timeUnit별 최대 검색 기간 (일 단위) — 레거시 IPR94S1310 기준
// 일별: 3개월, 월별: 6개월, 년별: 2년
const MAX_DATE_RANGE: Record<string, number> = {
  MI: 2,
  HH: 7,
  DD: 92,
  MM: 186,
  YY: 730,
};

const DATE_RANGE_LABEL: Record<string, string> = {
  MI: '2일',
  HH: '7일',
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

function parseCampaignIds(selections: string[]): string[] {
  const campaignIds: string[] = [];
  for (const v of selections) {
    if (!v.startsWith('C:')) continue;
    const parts = v.split(':');
    if (parts.length >= 3) campaignIds.push(parts.slice(2).join(':'));
  }
  return campaignIds;
}

function parseScenarioListIds(selections: string[]): number[] {
  const campaignListIds: number[] = [];
  for (const v of selections) {
    if (!v.startsWith('L:')) continue;
    const parts = v.split(':');
    if (parts.length >= 3) campaignListIds.push(Number(parts[2]));
  }
  return campaignListIds;
}

function loadStoredStringArray(key: string): string[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

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

export default function CampaignIndividualResultStatistics() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 검색 조건 상태
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day').startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59));
  const [tenantIds, setTenantIds] = useState<string[]>(() => loadStoredStringArray(CAMPAIGN_INDIVIDUAL_TENANT_STORAGE_KEY));
  const [campaignSelections, setCampaignSelections] = useState<string[]>(() => loadStoredStringArray(CAMPAIGN_INDIVIDUAL_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('C:')));
  const [scenarioSelections, setScenarioSelections] = useState<string[]>(() => {
    const fromScenarioKey = loadStoredStringArray(CAMPAIGN_INDIVIDUAL_SCENARIO_STORAGE_KEY);
    if (fromScenarioKey.length > 0) return fromScenarioKey;
    return loadStoredStringArray(CAMPAIGN_INDIVIDUAL_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('L:'));
  });

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<CampaignResultStatListItem>>(null);
  const isInitialTenantHydrationDone = useRef(false);
  const [rowData, setRowData] = useState<CampaignResultStatListItem[]>([]);
  const [displayTimeUnit, setDisplayTimeUnit] = useState<string>('DD');

  // disabledDate 함수
  const disabledDate = useMemo(() => createDisabledDate(), []);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  // 테넌트 옵션
  const { data: tenantOptionList } = useGetTenantOptionList();
  const tenantSelectOptions = useMemo(
    () => (tenantOptionList ?? []).filter((t) => Boolean(t?.tenantId && t?.tenantName)).map((t) => ({ label: String(t.tenantName), value: String(t.tenantId) })),
    [tenantOptionList],
  );

  // 캠페인 옵션 (선택된 테넌트 기준)
  const tenantIdNums = useMemo(() => tenantIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)), [tenantIds]);
  const { data: campaignOptionList } = useGetCampaignOptionList({
    params: { tenantIds: tenantIdNums },
    queryOptions: { enabled: tenantIdNums.length > 0 },
  });
  const campaignSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const c of campaignOptionList ?? []) {
      const tid = String(c.tenantId ?? '');
      const value = `C:${tid}:${c.campaignId}`;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ label: c.campaignName, value });
    }
    return options;
  }, [campaignOptionList]);

  const scenarioSelectOptions = useMemo(() => {
    const selectedCampaigns = new Set(campaignSelections);
    return (campaignOptionList ?? [])
      .filter((c) => {
        const hasList = c.campaignListId != null && String(c.campaignListId).length > 0;
        if (!hasList) return false;
        const campaignKey = `C:${String(c.tenantId ?? '')}:${c.campaignId}`;
        return selectedCampaigns.has(campaignKey);
      })
      .map((c) => ({
        label: c.campaignListName ?? '',
        value: `L:${String(c.tenantId ?? '')}:${c.campaignListId}`,
      }));
  }, [campaignOptionList, campaignSelections]);

  // 테넌트 변경 시 캠페인·시나리오 선택 초기화
  useEffect(() => {
    if (!isInitialTenantHydrationDone.current) {
      isInitialTenantHydrationDone.current = true;
      return;
    }
    setCampaignSelections([]);
    setScenarioSelections([]);
  }, [tenantIds]);

  // 캠페인 변경 시 유효하지 않은 시나리오 선택 제거
  useEffect(() => {
    const validValues = new Set(scenarioSelectOptions.map((o) => o.value));
    setScenarioSelections((prev) => prev.filter((v) => validValues.has(v)));
  }, [scenarioSelectOptions]);

  useEffect(() => {
    localStorage.setItem(CAMPAIGN_INDIVIDUAL_TENANT_STORAGE_KEY, JSON.stringify(tenantIds));
  }, [tenantIds]);

  useEffect(() => {
    localStorage.setItem(CAMPAIGN_INDIVIDUAL_CAMPAIGN_STORAGE_KEY, JSON.stringify(campaignSelections));
  }, [campaignSelections]);

  useEffect(() => {
    localStorage.setItem(CAMPAIGN_INDIVIDUAL_SCENARIO_STORAGE_KEY, JSON.stringify(scenarioSelections));
  }, [scenarioSelections]);

  // fromTime / toTime 계산 (UI state에서 직접 도출)
  const fromTime = (() => {
    if (!startDate) return '';
    if (timeUnit === 'MI') return startDate.format('YYYYMMDD') + (startTime?.format('HHmm') ?? '0000');
    if (timeUnit === 'HH') return startDate.format('YYYYMMDD') + (startTime?.format('HH') ?? '00');
    if (timeUnit === 'DD') return startDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return startDate.format('YYYYMM');
    return startDate.format('YYYY');
  })();

  const toTime = (() => {
    if (!endDate) return '';
    if (timeUnit === 'MI') return endDate.format('YYYYMMDD') + (endTime?.format('HHmm') ?? '2359');
    if (timeUnit === 'HH') return endDate.format('YYYYMMDD') + (endTime?.format('HH') ?? '23');
    if (timeUnit === 'DD') return endDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return endDate.format('YYYYMM');
    return endDate.format('YYYY');
  })();

  const campaignStatParams = useMemo(() => {
    const campaignListIds = parseScenarioListIds(scenarioSelections);
    const campaignIds = parseCampaignIds(campaignSelections);
    const base: Record<string, unknown> = {
      timeUnit,
      fromTime,
      toTime,
      tenantIds: tenantIdNums,
    };
    if (campaignListIds.length > 0) {
      base.campaignListIds = campaignListIds;
    } else if (campaignIds.length > 0) {
      base.campaignIds = campaignIds;
    }
    return base;
  }, [timeUnit, fromTime, toTime, tenantIdNums, campaignSelections, scenarioSelections]);

  // 캠페인별 통계 — 캠페인 통계와 동일 데이터·API (BFF: stat-campaign-result)
  const {
    data: campaignResultStatData,
    isLoading: isLoadingCampaignResultStatList,
    refetch,
  } = useGetCampaignResultStatList({
    params: campaignStatParams,
    queryOptions: { enabled: false },
  });

  useEffect(() => {
    if (campaignResultStatData !== undefined) setRowData(campaignResultStatData.items);
  }, [campaignResultStatData]);

  // BE에서 받은 summary에 '전체합계' 라벨 주입 (날짜 컬럼 colSpan 3에 표시)
  const summaryRow: CampaignResultStatListItem[] = campaignResultStatData?.summary ? [{ ...campaignResultStatData.summary, viewDate: '전체합계' }] : [];

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

  useEffect(() => {
    if (timeUnit === 'HH') {
      setStartTime((prev) => (prev ? prev.minute(0) : prev));
      setEndTime((prev) => (prev ? prev.minute(50) : prev));
    }
  }, [timeUnit]);

  const handleSearch = () => {
    if (tenantIds.length === 0) {
      toast.warning('테넌트를 선택해주세요.');
      return;
    }

    if (campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }

    if ((timeUnit === 'MI' || timeUnit === 'HH') && (!startTime || !endTime)) {
      toast.warning('검색시간을 선택해주세요.');
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
    refetch();
  };

  const columnDefs: ColDef<CampaignResultStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'viewDate',
      width: 120,
      pinned: 'left',
      colSpan: (params) => (params.node?.rowPinned === 'bottom' ? 3 : 1),
      cellStyle: textCellStyle,
    },
    {
      headerName: '캠페인',
      field: 'campaignName',
      width: 140,
      pinned: 'left',
      cellStyle: textCellStyle,
    },
    {
      headerName: '시나리오',
      field: 'campaignScenarioName',
      width: 160,
      pinned: 'left',
      cellStyle: textCellStyle,
    },
    { headerName: '대상건수', field: 'totalTargetCnt', width: 100, cellStyle: numberCellStyle },
    { headerName: '발신진행건수 (실시간)', field: 'outboundProgressCnt', width: 250, cellStyle: numberCellStyle },
    { headerName: '총발신시도건수(누적)', field: 'outboundAttemptCnt', width: 250, cellStyle: numberCellStyle },
    { headerName: '진행율', field: 'progressRatePct', width: 90, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '재시도발신건수', field: 'retryOutboundCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '본인통화건수', field: 'selfCallCnt', width: 110, cellStyle: numberCellStyle },
    { headerName: '본인통화완료율', field: 'selfCallCompleteRatePct', width: 120, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '실패건수', field: 'failCnt', width: 100, cellStyle: numberCellStyle },
    { headerName: '부재건수', field: 'absentCnt', width: 100, cellStyle: numberCellStyle },
    {
      headerName: '발신시도별 본인통화 성공률(1차)',
      field: 'firstAttemptSelfCallSuccessRatePct',
      width: 180,
      cellStyle: numberCellStyle,
      cellRenderer: 'percentBarRenderer',
    },
    {
      headerName: '발신시도별 본인통화 성공률(2차)',
      field: 'secondAttemptSelfCallSuccessRatePct',
      width: 180,
      cellStyle: numberCellStyle,
      cellRenderer: 'percentBarRenderer',
    },
    { headerName: '검증실패율', field: 'verifyFailRatePct', width: 100, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
  ];

  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:stats-campaign-individual-result:export');

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = async () => {
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await statisticsApi.exportCampaignResultStatExcel({
        ...campaignStatParams,
        timeUnit: displayTimeUnit,
      });
      const fileName = extractFileName(response.headers['content-disposition'], `CAMPAIGN_RESULT_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-start gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#495057] shrink-0">구분</span>
              <Select
                value={timeUnit}
                onChange={(v) => setTimeUnit(v)}
                options={[
                  { label: '10분단위', value: 'MI' },
                  { label: '시간별', value: 'HH' },
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
              {timeUnit === 'MI' || timeUnit === 'HH' ? (
                <TimePicker
                  value={startTime}
                  onChange={(date) => setStartTime(date)}
                  inputReadOnly
                  allowClear={false}
                  needConfirm={false}
                  format={timeUnit === 'MI' ? 'HH:mm' : 'HH:00'}
                  minuteStep={10}
                  style={{ width: '100px' }}
                />
              ) : null}
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
              {timeUnit === 'MI' || timeUnit === 'HH' ? (
                <TimePicker
                  value={endTime}
                  onChange={(date) => setEndTime(date)}
                  inputReadOnly
                  allowClear={false}
                  needConfirm={false}
                  format={timeUnit === 'MI' ? 'HH:mm' : 'HH:50'}
                  minuteStep={10}
                  style={{ width: '100px' }}
                />
              ) : null}
            </div>
            <Divider orientation="vertical" className="!h-5 !m-0" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#495057] shrink-0">테넌트</span>
              <Select
                mode="multiple"
                value={tenantIds}
                onChange={(value) => setTenantIds(value ?? [])}
                allowClear
                showSearch
                maxTagCount="responsive"
                options={tenantSelectOptions}
                placeholder="테넌트를 선택하세요."
                optionFilterProp="label"
                style={{ width: '15rem' }}
                popupMatchSelectWidth={false}
                dropdownRender={(menu) => (
                  <>
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (tenantIds.length === tenantSelectOptions.length) {
                          setTenantIds([]);
                        } else {
                          setTenantIds(tenantSelectOptions.map((o) => o.value));
                        }
                      }}
                    >
                      <Checkbox
                        checked={tenantIds.length === tenantSelectOptions.length && tenantSelectOptions.length > 0}
                        indeterminate={tenantIds.length > 0 && tenantIds.length < tenantSelectOptions.length}
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
              <span className="text-sm font-medium text-[#495057] shrink-0">캠페인</span>
              <Select
                mode="multiple"
                value={campaignSelections}
                onChange={(value) => setCampaignSelections(value ?? [])}
                allowClear
                showSearch
                maxTagCount="responsive"
                options={campaignSelectOptions}
                placeholder="캠페인을 선택하세요."
                optionFilterProp="label"
                style={{ width: '15rem' }}
                popupMatchSelectWidth={false}
                disabled={tenantIds.length === 0}
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
                disabled={tenantIds.length === 0 || campaignSelections.length === 0}
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
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button type="primary" onClick={handleSearch}>
              조회
            </Button>
            {hasExcelPermission && (
              <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />} onClick={handleExcelDownload}>
                Export
              </Button>
            )}
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<CampaignResultStatListItem>
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) => `${params.data.tenantId ?? ''}_${params.data.campaignId ?? ''}_${params.data.campaignListId ?? ''}_${params.data.psrTimeKey}_${params.data.seq}`}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoadingCampaignResultStatList}
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
