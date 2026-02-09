import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Input, Select, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import {
  createDisabledDate,
  createEndDisabledDate,
  getDatePickerFormat,
  getMaxDays,
  getPickerMode,
  getTimeFormat,
  validateDateRange,
} from '../../../features/statistics/hooks/useDateRangeLimit';
import { useGetDialogStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { DialogStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/libs/shared-ui/src/components/shadcn/collapsible';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '콜봇 통계', path: '/fca/statistics/call-bot' },
  { title: '대화 통계', path: '/fca/statistics/call-bot/dialog' },
];

export default function DialogStatistics() {
  // UI 상태 (사용자가 입력하는 값들)
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dialogName, setDialogName] = useState('');
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(50));

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
  const gridRef = useRef<AgGridReact<DialogStatListItem>>(null);
  const { data: botList } = useGetBots();

  const [rowData, setRowData] = useState<DialogStatListItem[]>([]);

  // disabledDate 함수 (시작일: 미래 날짜 비활성화, 종료일: 시작일 이전 + maxDays 초과 비활성화)
  const disabledDate = useMemo(() => createDisabledDate(timeUnit), [timeUnit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  type ServiceOption = { id: string; name: string };

  const services: ServiceOption[] = useMemo(() => {
    if (botList?.length) {
      return botList.filter((b) => Boolean(b?.serviceId && b?.serviceName)).map((b) => ({ id: String(b.serviceId), name: String(b.serviceName) }));
    }
    return [];
  }, [botList]);

  const serviceSelectOptions = useMemo(
    () =>
      services.map((s) => ({
        label: s.name,
        value: s.id,
      })),
    [services],
  );

  const { data: dialogStatList, isLoading: isLoadingDialogStatList } = useGetDialogStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!dialogStatList) return [];
    const trimmedDialogName = dialogName?.trim().toLowerCase();
    if (serviceIds.length === 0 && !trimmedDialogName) return dialogStatList;
    return dialogStatList.filter((dialogStat) => {
      const matchesServiceIds = serviceIds.length === 0 || serviceIds.includes(String(dialogStat.serviceId ?? ''));
      const matchesDialogName =
        !trimmedDialogName ||
        String(dialogStat.dialogName ?? '')
          .toLowerCase()
          .includes(trimmedDialogName);
      return matchesServiceIds && matchesDialogName;
    });
  }, [dialogStatList, serviceIds, dialogName]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  // 합계 행 계산 (pinnedBottomRowData)
  const summaryRow = useMemo<DialogStatListItem[]>(() => {
    if (!rowData?.length) return [];
    const count = rowData.length;
    const sum = (field: keyof DialogStatListItem) => rowData.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    const avg = (field: keyof DialogStatListItem) => Math.round((sum(field) / count) * 10) / 10;
    return [
      {
        psrTimeKey: '전체합계',
        serviceName: '',
        dialogName: '',
        inCount: sum('inCount'),
        successCount: sum('successCount'),
        successPercent: avg('successPercent'),
      } as DialogStatListItem,
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

    setQueryParams({
      timeUnit,
      fromTime: timeUnit === 'MI' ? fromDateMI : timeUnit === 'HH' ? fromDateHH : timeUnit === 'DD' ? fromDateDD : timeUnit === 'MM' ? fromDateMM : fromDateYY,
      toTime: timeUnit === 'MI' ? toDateMI : timeUnit === 'HH' ? toDateHH : timeUnit === 'DD' ? toDateDD : timeUnit === 'MM' ? toDateMM : toDateYY,
    });
  };

  const columnDefs: ColDef<DialogStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: queryParams.timeUnit === 'MI' || queryParams.timeUnit === 'HH' ? 2 : 1,
      colSpan: (params) => (params.node?.rowPinned === 'bottom' ? 2 : 1),
      valueFormatter: ({ value, node }) => {
        if (node?.rowPinned === 'bottom') return value ?? '';
        return value ? dayjs(value).format(getTimeFormat(queryParams.timeUnit)) : '-';
      },
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
    { headerName: '봇서비스ID', field: 'serviceId', hide: true },
    { headerName: '봇서비스', field: 'serviceName', hide: true },
    { headerName: '대화ID', field: 'dialogId', hide: true },
    { headerName: '대화명', field: 'dialogName', flex: 2 },
    {
      headerName: '진입수',
      field: 'inCount',
      flex: 1,
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
    {
      headerName: '완결수',
      field: 'successCount',
      flex: 1,
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
    },
    {
      headerName: '완결율',
      field: 'successPercent',
      flex: 1,
      cellStyle: (params) => (params.node?.rowPinned === 'bottom' ? { fontWeight: 'bold', alignItems: 'center' } : { fontWeight: 'normal', alignItems: 'center' }),
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
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
    const fileName = `DIALOG_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '대화 통계',
      processCellCallback: (p: ProcessCellForExportParams) => {
        const colId = p.column.getColId();
        const v = p.value;

        if (colId === 'psrTimeKey') {
          return v ? dayjs(String(v)).format(getTimeFormat(queryParams.timeUnit)) : '-';
        }

        if (colId === 'successPercent') {
          return typeof v === 'number' ? `${v}%` : v ? `${v}%` : '-';
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
                  <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
                  <Select
                    mode="multiple"
                    value={serviceIds}
                    onChange={(value) => setServiceIds(value ?? [])}
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={serviceSelectOptions}
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
              <div className="flex items-center gap-2 shrink-0">
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
                <span className="text-sm font-medium text-[#495057] shrink-0">대화명</span>
                <Input value={dialogName} onChange={(e) => setDialogName(e.target.value)} className="!min-w-[200px] !max-w-[250px]" placeholder="검색할 대화명을 입력하세요." />
              </div>
            </CollapsibleContent>
          </header>
        </Collapsible>
        <div className="w-full flex-1">
          <AgGridReact<DialogStatListItem>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            loading={isLoadingDialogStatList}
            pagination={false}
            statusBar={{ statusPanels: [] }}
            rowNumbers={false}
            sideBar={false}
            pinnedBottomRowData={summaryRow}
            getRowStyle={(params) => (params.node?.rowPinned === 'bottom' ? { background: '#F8F9FA', borderTop: '2px solid #dee2e6' } : undefined)}
          />
        </div>
      </div>
    </div>
  );
}
