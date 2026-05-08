import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, Download } from 'lucide-react';
import { useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { useGetModels } from '../../../features/bot-config/hooks/useModelQueries';
import { statisticsApi } from '../../../features/statistics/api/statisticsApi';
import {
  createDisabledDate,
  createEndDisabledDate,
  getDatePickerFormat,
  getMaxDays,
  getPickerMode,
  getTimeFormat,
  validateDateRange,
} from '../../../features/statistics/hooks/useDateRangeLimit';
import { useStatisticsFilterStore } from '../../../features/statistics/hooks/useStatisticsFilterStore';
import { useGetEntityOptionList, useGetEntityStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { EntityStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: 'NLU 통계', path: '/fca/statistics/nlu' },
  { title: '개체 통계', path: '/fca/statistics/nlu/entity' },
];

export default function EntityStatistics() {
  const { modelIds, setModelIds } = useStatisticsFilterStore();
  // UI 상태 (사용자가 입력하는 값들)
  const [entityTagIds, setEntityTagIds] = useState<string[]>([]);
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

  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<EntityStatListItem>>(null);
  const { data: modelList } = useGetModels();
  const [rowData, setRowData] = useState<EntityStatListItem[]>([]);
  // 조회 시점의 timeUnit (그리드 날짜 포맷팅에 사용)
  const [displayTimeUnit, setDisplayTimeUnit] = useState<string>('DD');

  // disabledDate 함수 (시작일: 미래 날짜 비활성화, 종료일: 시작일 이전 + maxDays 초과 비활성화)
  const disabledDate = useMemo(() => createDisabledDate(timeUnit), [timeUnit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  // 모델 옵션 조회
  const modelSelectOptions = useMemo(
    () => (modelList ?? []).filter((m) => Boolean(m?.modelId && m?.modelName)).map((m) => ({ label: String(m.modelName), value: String(m.modelId) })),
    [modelList],
  );

  // 개체 태그 옵션 조회 (모델 선택 시)
  const modelIdParams = [modelIds].flat().filter(Boolean);
  const { data: entityTagOptionList } = useGetEntityOptionList({
    params: { modelIds: modelIdParams },
    queryOptions: { enabled: modelIdParams.length > 0 },
  });

  const entityTagSelectOptions = useMemo(
    () => (entityTagOptionList ?? []).filter((e) => Boolean(e?.entityId && e?.entityName)).map((e) => ({ label: String(e.entityName), value: String(e.entityId) })),
    [entityTagOptionList],
  );

  // 모델 변경 시 개체 태그 옵션 초기화
  useEffect(() => {
    setEntityTagIds([]);
  }, [modelIds]);

  // 개체 태그 옵션 로드 시 전체 선택
  useEffect(() => {
    setEntityTagIds(entityTagSelectOptions.map((o) => o.value));
  }, [entityTagSelectOptions]);

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

  // 개체 통계 조회
  const {
    data: entityStatData,
    isLoading: isLoadingEntityStatList,
    refetch,
  } = useGetEntityStatList({
    params: {
      timeUnit,
      fromTime,
      toTime,
      modelIds: [modelIds].flat().filter(Boolean),
      entityTagIds: [entityTagIds].flat().filter(Boolean),
      excludeLunch: timeUnit === 'MI' || timeUnit === 'HH' ? excludeLunch : false,
      useInterval: timeUnit === 'MI' || timeUnit === 'HH' ? useInterval : false,
      hourFrom: timeUnit === 'MI' || timeUnit === 'HH' ? (useInterval && intervalStartTime ? intervalStartTime.format('HH00') : '') : '',
      hourTo: timeUnit === 'MI' || timeUnit === 'HH' ? (useInterval && intervalEndTime ? intervalEndTime.format('HH00') : '') : '',
      excludeDays: timeUnit !== 'MM' && timeUnit !== 'YY' ? excludeDays : [],
      excludeBusinessHoliday: timeUnit !== 'MM' && timeUnit !== 'YY' ? excludeBusinessHoliday : false,
      excludeStatHoliday: timeUnit !== 'MM' && timeUnit !== 'YY' ? excludeStatHoliday : false,
    },
    queryOptions: { enabled: false },
  });

  useEffect(() => {
    if (entityStatData !== undefined) setRowData(entityStatData.items);
  }, [entityStatData]);

  // BE에서 받은 summary에 '전체합계' 라벨 주입
  const summaryRow: EntityStatListItem[] = entityStatData?.summary ? [{ ...entityStatData.summary, psrTimeKey: '전체합계' }] : [];

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

    if (fromTime && toTime && fromTime > toTime) {
      toast.warning('검색 시작시간이 종료시간보다 늦을 수 없습니다.');
      return;
    }

    setDisplayTimeUnit(timeUnit);
    refetch();
  };

  const columnDefs: ColDef<EntityStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: displayTimeUnit === 'MI' || displayTimeUnit === 'HH' ? 2 : 1,
      colSpan: (params) => (params.node?.rowPinned === 'bottom' ? 4 : 1),
      valueFormatter: ({ value, node }) => {
        if (node?.rowPinned === 'bottom') return value ?? '';
        return value ? dayjs(value).format(getTimeFormat(displayTimeUnit)) : '-';
      },
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
    { headerName: '모델ID', field: 'modelId', hide: true },
    { headerName: '모델명', field: 'modelName', flex: 2 },
    { headerName: '개체 태그', field: 'entityTag', flex: 1 },
    { headerName: '개체 값', field: 'entityValue', flex: 1 },
    {
      headerName: '검출횟수',
      field: 'entityCnt',
      flex: 1,
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
  ];

  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:stats-entity:excel');

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = async () => {
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await statisticsApi.exportEntityStatExcel({
        timeUnit: displayTimeUnit,
        fromTime,
        toTime,
        modelIds: [modelIds].flat().filter(Boolean),
        entityTagIds: [entityTagIds].flat().filter(Boolean),
        excludeLunch: displayTimeUnit === 'MI' || displayTimeUnit === 'HH' ? excludeLunch : false,
        useInterval: displayTimeUnit === 'MI' || displayTimeUnit === 'HH' ? useInterval : false,
        hourFrom: displayTimeUnit === 'MI' || displayTimeUnit === 'HH' ? (useInterval && intervalStartTime ? intervalStartTime.format('HH00') : '') : '',
        hourTo: displayTimeUnit === 'MI' || displayTimeUnit === 'HH' ? (useInterval && intervalEndTime ? intervalEndTime.format('HH00') : '') : '',
        excludeDays: displayTimeUnit !== 'MM' && displayTimeUnit !== 'YY' ? excludeDays : [],
        excludeBusinessHoliday: displayTimeUnit !== 'MM' && displayTimeUnit !== 'YY' ? excludeBusinessHoliday : false,
        excludeStatHoliday: displayTimeUnit !== 'MM' && displayTimeUnit !== 'YY' ? excludeStatHoliday : false,
      });
      const fileName = extractFileName(response.headers['content-disposition'], `ENTITY_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <header className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
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
                    mode="multiple"
                    value={modelIds}
                    onChange={(value) => setModelIds(value ?? [])}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={modelSelectOptions}
                    placeholder="검색할 모델을 선택하세요."
                    optionFilterProp="label"
                    style={{ width: '15rem' }}
                    popupMatchSelectWidth={false}
                    dropdownRender={(menu) => (
                      <>
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (modelIds.length === modelSelectOptions.length) {
                              setModelIds([]);
                            } else {
                              setModelIds(modelSelectOptions.map((o) => o.value));
                            }
                          }}
                        >
                          <Checkbox
                            checked={modelIds.length === modelSelectOptions.length && modelSelectOptions.length > 0}
                            indeterminate={modelIds.length > 0 && modelIds.length < modelSelectOptions.length}
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
                <Button type="primary" onClick={handleSearch}>
                  조회
                </Button>
                {hasExcelPermission && (
                  <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />} onClick={handleExcelDownload}>
                    Export
                  </Button>
                )}
              </div>
            </div>
            <CollapsibleContent>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">개체 태그</span>
                  <Select
                    mode="multiple"
                    value={entityTagIds}
                    onChange={(value) => setEntityTagIds(value ?? [])}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={entityTagSelectOptions}
                    placeholder="검색할 개체 태그를 선택하세요."
                    optionFilterProp="label"
                    style={{ width: '15rem' }}
                    popupMatchSelectWidth={false}
                    dropdownRender={(menu) => (
                      <>
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (entityTagIds.length === entityTagSelectOptions.length) {
                              setEntityTagIds([]);
                            } else {
                              setEntityTagIds(entityTagSelectOptions.map((o) => o.value));
                            }
                          }}
                        >
                          <Checkbox
                            checked={entityTagIds.length === entityTagSelectOptions.length && entityTagSelectOptions.length > 0}
                            indeterminate={entityTagIds.length > 0 && entityTagIds.length < entityTagSelectOptions.length}
                          />
                          <span className="text-sm">전체 선택</span>
                        </div>
                        <Divider style={{ margin: '4px 0' }} />
                        {menu}
                      </>
                    )}
                  />
                </div>
                {timeUnit !== 'MM' && timeUnit !== 'YY' ? (
                  <>
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <div className="flex items-center gap-3">
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
                    </div>
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#495057] shrink-0">업무공휴일 제외</span>
                      <Checkbox checked={excludeBusinessHoliday} onChange={(e) => setExcludeBusinessHoliday(e.target.checked)} />
                    </div>
                    <Divider orientation="vertical" className="!h-5 !m-0" />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#495057] shrink-0">통계공휴일 제외</span>
                      <Checkbox checked={excludeStatHoliday} onChange={(e) => setExcludeStatHoliday(e.target.checked)} />
                    </div>
                    {timeUnit === 'MI' || timeUnit === 'HH' ? (
                      <>
                        <Divider orientation="vertical" className="!h-5 !m-0" />
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#495057] shrink-0">점심시간 제외</span>
                          <Checkbox checked={excludeLunch} onChange={(e) => setExcludeLunch(e.target.checked)} />
                        </div>
                        <Divider orientation="vertical" className="!h-5 !m-0" />
                        <div className="flex items-center gap-3">
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
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </CollapsibleContent>
          </header>
        </Collapsible>
        <div className="w-full h-full">
          <AgGridReact<EntityStatListItem>
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) => `${params.data.psrTimeKey}_${params.data.scnId}_${params.data.modelId}_${params.data.entityTag}_${params.data.entityValue}`}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoadingEntityStatList}
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
