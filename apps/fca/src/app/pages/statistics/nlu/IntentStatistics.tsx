import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Input, Select, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { useGetModels } from '../../../features/bot-config/hooks/useModelQueries';
import { createDisabledDate, createEndDisabledDate, getMaxDays, getTimeFormat, validateDateRange } from '../../../features/statistics/hooks/useDateRangeLimit';
import { useGetIntentStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { IntentStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: 'NLU 통계', path: '/fca/statistics/nlu' },
  { title: '의도 통계', path: '/fca/statistics/nlu/intent' },
];

export default function IntentStatistics() {
  // UI 상태 (사용자가 입력하는 값들)
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [scnIds, setScnIds] = useState<string[]>([]);
  const [intentName, setIntentName] = useState('');
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59));

  // 조회 확정된 파라미터 (조회 버튼 눌렀을 때만 업데이트)
  const [queryParams, setQueryParams] = useState(() => {
    const fromDate = dayjs().startOf('day').format('YYYYMMDD');
    const toDate = dayjs().endOf('day').format('YYYYMMDD');
    return {
      timeUnit: 'DD',
      fromTime: fromDate,
      toTime: toDate,
    };
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<IntentStatListItem>>(null);
  const { data: scnList } = useGetBots();
  const { data: modelList } = useGetModels();

  const [rowData, setRowData] = useState<IntentStatListItem[]>([]);

  // disabledDate 함수 (시작일: 미래 날짜 비활성화, 종료일: 시작일 이전 + maxDays 초과 비활성화)
  const disabledDate = useMemo(() => createDisabledDate(timeUnit), [timeUnit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  type ScnOption = { id: string; name: string };
  type ModelOption = { id: string; name: string };

  const scns: ScnOption[] = useMemo(() => {
    if (scnList?.length) {
      return scnList.filter((b) => Boolean(b?.serviceId && b?.serviceName)).map((b) => ({ id: String(b.serviceId), name: String(b.serviceName) }));
    }
    return [];
  }, [scnList]);

  const models: ModelOption[] = useMemo(() => {
    if (modelList?.length) {
      return modelList.filter((m) => Boolean(m?.modelId && m?.modelName)).map((m) => ({ id: String(m.modelId), name: String(m.modelName) }));
    }
    return [];
  }, [modelList]);

  const scnSelectOptions = useMemo(
    () =>
      scns.map((s) => ({
        label: s.name,
        value: s.id,
      })),
    [scns],
  );

  const modelSelectOptions = useMemo(
    () =>
      models.map((m) => ({
        label: m.name,
        value: m.id,
      })),
    [models],
  );

  const { data: intentStatList, isLoading: isLoadingIntentStatList } = useGetIntentStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!intentStatList) return [];
    const trimmedIntentName = intentName?.trim().toLowerCase();
    if (scnIds.length === 0 && modelIds.length === 0 && !trimmedIntentName) return intentStatList;
    return intentStatList.filter((intentStat) => {
      const matchesScn = scnIds.length === 0 || scnIds.includes(String(intentStat.scnId ?? ''));
      const matchesModel = modelIds.length === 0 || modelIds.includes(String(intentStat.modelId ?? ''));
      const matchesIntentName =
        !trimmedIntentName ||
        String(intentStat.intent ?? '')
          .toLowerCase()
          .includes(trimmedIntentName);
      return matchesScn && matchesModel && matchesIntentName;
    });
  }, [intentStatList, scnIds, modelIds, intentName]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

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
  }, [startDate, timeUnit]);

  // timeUnit이 HH로 변경될 때 분을 자동 조정 (시작 00분, 종료 50분)
  useEffect(() => {
    if (timeUnit === 'HH') {
      setStartTime((prev) => (prev ? prev.minute(0) : prev));
      setEndTime((prev) => (prev ? prev.minute(50) : prev));
    }
  }, [timeUnit]);

  const handleSearch = () => {
    if (!startDate || !endDate) {
      message.warning('검색일자를 선택해주세요.');
      return;
    }

    if ((timeUnit === 'MI' || timeUnit === 'HH') && (!startTime || !endTime)) {
      message.warning('검색시간을 선택해주세요.');
      return;
    }

    // 날짜 범위 검증 (timeUnit별 최대 기간 체크)
    if (!validateDateRange(startDate, endDate, timeUnit)) {
      const maxDays = getMaxDays(timeUnit);
      const dateRangeLabel = timeUnit === 'MI' ? '2일' : timeUnit === 'HH' ? '7일' : timeUnit === 'DD' ? '15일' : timeUnit === 'MM' ? '6개월' : '5년';
      message.warning(`검색 기간은 ${dateRangeLabel} 이내로 설정해주세요. (최대 ${maxDays}일)`);
      return;
    }

    // 조회 버튼 클릭 시에만 queryParams 업데이트 → React Query 재조회
    const fromDate = startDate.format('YYYYMMDD');
    const toDate = endDate.format('YYYYMMDD');
    // HH 모드일 때는 시작 00분, 종료 50분 고정
    const normalizedStartTime = timeUnit === 'HH' && startTime ? startTime.minute(0) : startTime;
    const normalizedEndTime = timeUnit === 'HH' && endTime ? endTime.minute(50) : endTime;
    const fromTime = normalizedStartTime?.format('HHmm');
    const toTime = normalizedEndTime?.format('HHmm');
    const fromDateTime = timeUnit === 'MI' || timeUnit === 'HH' ? `${fromDate}${fromTime}` : fromDate;
    const toDateTime = timeUnit === 'MI' || timeUnit === 'HH' ? `${toDate}${toTime}` : toDate;

    setQueryParams({
      timeUnit,
      fromTime: fromDateTime,
      toTime: toDateTime,
    });
  };

  const columnDefs: ColDef<IntentStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: queryParams.timeUnit === 'MI' || queryParams.timeUnit === 'HH' ? 2 : 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(queryParams.timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '봇서비스ID', field: 'scnId', hide: true },
    { headerName: '봇서비스', field: 'scnName', flex: 2 },
    { headerName: '모델ID', field: 'modelId', hide: true },
    { headerName: '모델명', field: 'modelName', flex: 1 },
    { headerName: '의도명', field: 'intent', flex: 1 },
    { headerName: '검출횟수', field: 'intentCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '신뢰도', field: 'confidence', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '임계값 최대', field: 'thresholdMaxCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '임계값 체크', field: 'thresholdCheckCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '임계값 실패', field: 'thresholdFailCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
  ];

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (!rowData?.length) {
      message.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    const fileName = `INTENT_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '의도 통계',
      processCellCallback: (p: ProcessCellForExportParams) => {
        const colId = p.column.getColId();
        const v = p.value;

        if (colId === 'psrTimeKey') {
          return v ? dayjs(String(v)).format(getTimeFormat(queryParams.timeUnit)) : '-';
        }

        return v ?? '-';
      },
    };

    api.exportDataAsExcel(exportParams);
    window.setTimeout(() => setIsExporting(false), 300);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      {/* Filter */}
      <div className="flex flex-col w-full h-full bg-white bt-shadow p-5">
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <header className="flex flex-col gap-3 pb-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
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
                  <DatePicker value={startDate} onChange={(date) => setStartDate(date)} disabledDate={disabledDate} inputReadOnly allowClear={false} />
                  {timeUnit === 'MI' || timeUnit === 'HH' ? (
                    <TimePicker
                      value={startTime}
                      onChange={(date) => setStartTime(date)}
                      inputReadOnly
                      allowClear={false}
                      format={timeUnit === 'MI' ? 'HH:mm' : 'HH:00'}
                      minuteStep={10}
                      style={{ width: '100px' }}
                    />
                  ) : null}
                  <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
                  <DatePicker value={endDate} onChange={(date) => setEndDate(date)} disabledDate={disabledEndDate} inputReadOnly allowClear={false} />
                  {timeUnit === 'MI' || timeUnit === 'HH' ? (
                    <TimePicker
                      value={endTime}
                      onChange={(date) => setEndTime(date)}
                      inputReadOnly
                      allowClear={false}
                      format={timeUnit === 'MI' ? 'HH:mm' : 'HH:50'}
                      minuteStep={10}
                      style={{ width: '100px' }}
                    />
                  ) : null}
                </div>
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
                  <Select
                    mode="multiple"
                    value={scnIds}
                    onChange={(value) => setScnIds(value ?? [])}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={scnSelectOptions}
                    placeholder="검색할 봇서비스를 선택하세요."
                    optionFilterProp="label"
                    className="!min-w-[250px] !max-w-[400px]"
                    popupMatchSelectWidth={false}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <Button type="default" icon={<ChevronDown className={cn('size-4 transition-transform', isFilterOpen && 'rotate-180')} />} className="!size-8 !min-w-8" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button type="primary" onClick={handleSearch}>
                  조회
                </Button>
                <Button
                  type="primary"
                  loading={isExporting}
                  icon={<Download className="size-4" />}
                  className="!bg-[#10B981] !border-[#10B981] hover:!bg-[#0FA968]"
                  onClick={handleExcelDownload}
                >
                  엑셀
                </Button>
              </div>
            </div>
            <CollapsibleContent>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#495057] shrink-0">모델</span>
                <Select
                  mode="multiple"
                  value={modelIds}
                  onChange={(value) => setModelIds(value ?? [])}
                  allowClear
                  showSearch
                  maxTagCount="responsive"
                  options={modelSelectOptions}
                  placeholder="검색할 모델을 선택하세요."
                  optionFilterProp="label"
                  className="!min-w-[250px] !max-w-[400px]"
                  popupMatchSelectWidth={false}
                />
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <span className="text-sm font-medium text-[#495057] shrink-0">의도명</span>
                <Input value={intentName} onChange={(e) => setIntentName(e.target.value)} className="!min-w-[200px] !max-w-[250px]" placeholder="검색할 의도명을 입력하세요." />
              </div>
            </CollapsibleContent>
          </header>
        </Collapsible>
        <div className="w-full flex-1">
          <AgGridReact<IntentStatListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingIntentStatList} />
        </div>
      </div>
    </div>
  );
}
