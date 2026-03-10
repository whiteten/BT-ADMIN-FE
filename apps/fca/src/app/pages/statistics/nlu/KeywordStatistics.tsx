import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, Download } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetModels } from '../../../features/bot-config/hooks/useModelQueries';
import {
  createDisabledDate,
  createEndDisabledDate,
  getDatePickerFormat,
  getMaxDays,
  getPickerMode,
  getTimeFormat,
  validateDateRange,
} from '../../../features/statistics/hooks/useDateRangeLimit';
import { useGetKeywordStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { KeywordStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: 'NLU 통계', path: '/fca/statistics/nlu' },
  { title: '키워드 통계', path: '/fca/statistics/nlu/keyword' },
];

export default function KeywordStatistics() {
  // UI 상태 (사용자가 입력하는 값들)
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59));
  const [excludeLunch, setExcludeLunch] = useState(false);
  const [useInterval, setUseInterval] = useState(false);
  const [intervalStartTime, setIntervalStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [intervalEndTime, setIntervalEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(0));
  const [excludeDays, setExcludeDays] = useState<string[]>([]);
  const [excludeBusinessHoliday, setExcludeBusinessHoliday] = useState(false);
  const [excludeStatHoliday, setExcludeStatHoliday] = useState(false);
  const [isNotExistEntity, setIsNotExistEntity] = useState(false);

  // 조회 확정된 파라미터 (조회 버튼 눌렀을 때만 업데이트)
  const [queryParams, setQueryParams] = useState(() => {
    const fromDate = dayjs().startOf('day').format('YYYYMMDD');
    const toDate = dayjs().endOf('day').format('YYYYMMDD');
    return {
      timeUnit: 'DD',
      fromTime: fromDate,
      toTime: toDate,
      modelIds: modelIds,
      excludeLunch: false,
      useInterval: false,
      hourFrom: '',
      hourTo: '',
      excludeDays: [] as string[],
      excludeBusinessHoliday: false,
      excludeStatHoliday: false,
      isNotExistEntity: false,
    };
  });

  const [isSearched, setIsSearched] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<KeywordStatListItem>>(null);
  const { data: modelList } = useGetModels();
  const [rowData, setRowData] = useState<KeywordStatListItem[]>([]);

  // disabledDate 함수 (시작일: 미래 날짜 비활성화, 종료일: 시작일 이전 + maxDays 초과 비활성화)
  const disabledDate = useMemo(() => createDisabledDate(timeUnit), [timeUnit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  // 모델 옵션 조회
  const modelSelectOptions = useMemo(
    () => (modelList ?? []).filter((m) => Boolean(m?.modelId && m?.modelName)).map((m) => ({ label: String(m.modelName), value: String(m.modelId) })),
    [modelList],
  );

  // 키워드 통계 조회
  const { data: keywordStatList, isLoading: isLoadingKeywordStatList } = useGetKeywordStatList({
    params: queryParams,
    queryOptions: { enabled: isSearched },
  });

  useEffect(() => {
    setRowData(keywordStatList ?? []);
  }, [keywordStatList]);

  // 합계 행 계산 (pinnedBottomRowData)
  const summaryRow = useMemo<KeywordStatListItem[]>(() => {
    if (!rowData?.length) return [];
    const sum = (field: keyof KeywordStatListItem) => rowData.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    return [
      {
        psrTimeKey: '전체합계',
        modelName: '',
        entityTag: '',
        keyword: '',
        keywordCnt: sum('keywordCnt'),
      } as KeywordStatListItem,
    ];
  }, [rowData]);

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

  // timeUnit이 HH로 변경될 때 분을 자동 조정 (시작 00분, 종료 50분)
  useEffect(() => {
    if (timeUnit === 'HH') {
      setStartTime((prev) => (prev ? prev.minute(0) : prev));
      setEndTime((prev) => (prev ? prev.minute(50) : prev));
    }
  }, [timeUnit]);

  const handleSearch = () => {
    if (modelIds.length === 0) {
      toast.warning('모델을 선택해주세요.');
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

    if (useInterval && intervalStartTime && intervalEndTime && intervalStartTime.isAfter(intervalEndTime)) {
      toast.warning('구간검색 시작시간이 종료시간보다 늦을 수 없습니다.');
      return;
    }

    // 날짜 범위 검증 (timeUnit별 최대 기간 체크)
    if (!validateDateRange(startDate, endDate, timeUnit)) {
      const maxDays = getMaxDays(timeUnit);
      const dateRangeLabel = timeUnit === 'MI' ? '2일' : timeUnit === 'HH' ? '7일' : timeUnit === 'DD' ? '15일' : timeUnit === 'MM' ? '6개월' : '5년';
      toast.warning(`검색 기간은 ${dateRangeLabel} 이내로 설정해주세요. (최대 ${maxDays}일)`);
      return;
    }

    // 조회 버튼 클릭 시에만 queryParams 업데이트 → React Query 재조회
    const fromDateYY = startDate.format('YYYY');
    const toDateYY = endDate.format('YYYY');
    const fromDateMM = startDate.format('YYYYMM');
    const toDateMM = endDate.format('YYYYMM');
    const fromDateDD = startDate.format('YYYYMMDD');
    const toDateDD = endDate.format('YYYYMMDD');
    const fromDateHH = startDate.format('YYYYMMDD') + startTime?.format('HH');
    const toDateHH = endDate.format('YYYYMMDD') + endTime?.format('HH');
    const fromDateMI = startDate.format('YYYYMMDD') + startTime?.format('HHmm');
    const toDateMI = endDate.format('YYYYMMDD') + endTime?.format('HHmm');

    const fromTime = timeUnit === 'MI' ? fromDateMI : timeUnit === 'HH' ? fromDateHH : timeUnit === 'DD' ? fromDateDD : timeUnit === 'MM' ? fromDateMM : fromDateYY;
    const toTime = timeUnit === 'MI' ? toDateMI : timeUnit === 'HH' ? toDateHH : timeUnit === 'DD' ? toDateDD : timeUnit === 'MM' ? toDateMM : toDateYY;

    if (fromTime && toTime && fromTime > toTime) {
      toast.warning('검색 시작시간이 종료시간보다 늦을 수 없습니다.');
      return;
    }

    setIsSearched(true);
    setQueryParams({
      timeUnit,
      fromTime,
      toTime,
      modelIds: [modelIds].flat().filter(Boolean),
      excludeLunch,
      useInterval,
      hourFrom: useInterval && intervalStartTime ? intervalStartTime.format('HH00') : '',
      hourTo: useInterval && intervalEndTime ? intervalEndTime.format('HH00') : '',
      excludeDays,
      excludeBusinessHoliday,
      excludeStatHoliday,
      isNotExistEntity,
    });
  };

  const columnDefs: ColDef<KeywordStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: queryParams.timeUnit === 'MI' || queryParams.timeUnit === 'HH' ? 2 : 1,
      colSpan: (params) => (params.node?.rowPinned === 'bottom' ? 4 : 1),
      valueFormatter: ({ value, node }) => {
        if (node?.rowPinned === 'bottom') return value ?? '';
        return value ? dayjs(value).format(getTimeFormat(queryParams.timeUnit)) : '-';
      },
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
    { headerName: '모델ID', field: 'modelId', hide: true },
    { headerName: '모델명', field: 'modelName', flex: 2 },
    { headerName: '개체 태그', field: 'entityTag', flex: 1 },
    { headerName: '키워드', field: 'keyword', flex: 1 },
    {
      headerName: '검출횟수',
      field: 'keywordCnt',
      flex: 1,
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
  ];

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    const fileName = `KEYWORD_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '키워드 통계',
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
                      format={timeUnit === 'MI' ? 'HH:mm' : 'HH:50'}
                      minuteStep={10}
                      style={{ width: '100px' }}
                    />
                  ) : null}
                </div>
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">모델</span>
                  <Select
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
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">개체 태그 미분류</span>
                  <Checkbox checked={isNotExistEntity} onChange={(e) => setIsNotExistEntity(e.target.checked)} />
                </div>
                {timeUnit !== 'MM' && timeUnit !== 'YY' ? (
                  <>
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <span className="text-sm font-medium text-[#495057] shrink-0">제외요일</span>
                    <Select
                      mode="multiple"
                      value={excludeDays}
                      onChange={(value) => setExcludeDays(value ?? [])}
                      allowClear
                      maxTagCount="responsive"
                      options={[
                        { label: '월요일', value: 'MON' },
                        { label: '화요일', value: 'TUE' },
                        { label: '수요일', value: 'WED' },
                        { label: '목요일', value: 'THU' },
                        { label: '금요일', value: 'FRI' },
                        { label: '토요일', value: 'SAT' },
                        { label: '일요일', value: 'SUN' },
                      ]}
                      placeholder="제외할 요일 선택"
                      className="!min-w-[150px] !max-w-[300px]"
                      popupMatchSelectWidth={false}
                    />
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <span className="text-sm font-medium text-[#495057] shrink-0">업무공휴일 제외</span>
                    <Checkbox checked={excludeBusinessHoliday} onChange={(e) => setExcludeBusinessHoliday(e.target.checked)} />
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <span className="text-sm font-medium text-[#495057] shrink-0">통계공휴일 제외</span>
                    <Checkbox checked={excludeStatHoliday} onChange={(e) => setExcludeStatHoliday(e.target.checked)} />
                  </>
                ) : null}
                {timeUnit === 'MI' || timeUnit === 'HH' ? (
                  <>
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <span className="text-sm font-medium text-[#495057] shrink-0">점심시간 제외</span>
                    <Checkbox checked={excludeLunch} onChange={(e) => setExcludeLunch(e.target.checked)} />
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <span className="text-sm font-medium text-[#495057] shrink-0">구간검색</span>
                    <Checkbox checked={useInterval} onChange={(e) => setUseInterval(e.target.checked)} />
                    {useInterval ? (
                      <>
                        <TimePicker
                          value={intervalStartTime}
                          onChange={(date) => setIntervalStartTime(date)}
                          inputReadOnly
                          allowClear={false}
                          format="HH:00"
                          style={{ width: '100px' }}
                        />
                        <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
                        <TimePicker
                          value={intervalEndTime}
                          onChange={(date) => setIntervalEndTime(date)}
                          inputReadOnly
                          allowClear={false}
                          format="HH:00"
                          style={{ width: '100px' }}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </CollapsibleContent>
          </header>
        </Collapsible>
        <div className="w-full flex-1">
          <AgGridReact<KeywordStatListItem>
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) => `${params.data.psrTimeKey}_${params.data.scnId}_${params.data.modelId}_${params.data.entityTag}_${params.data.keyword}`}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            loading={isLoadingKeywordStatList}
            pagination={false}
            statusBar={{ statusPanels: [] }}
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
