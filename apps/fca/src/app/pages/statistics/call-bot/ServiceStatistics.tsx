import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Select, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { TIME_FORMAT } from '../../../features/statistics/hooks/useDateRangeLimit';
import { useGetServiceStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { ServiceStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '콜봇 통계', path: '/fca/statistics/call-bot' },
  { title: '서비스 통계', path: '/fca/statistics/call-bot/service' },
];

export default function ServiceStatistics() {
  // UI 상태 (사용자가 입력하는 값들)
  const [serviceIds, setServiceIds] = useState<string[]>([]);
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

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<ServiceStatListItem>>(null);
  const { data: botList } = useGetBots();

  const getTimeFormat = (unit?: string) => TIME_FORMAT[unit ?? ''] ?? 'YYYY-MM-DD';

  const [rowData, setRowData] = useState<ServiceStatListItem[]>([]);

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

  const { data: serviceStatList, isLoading: isLoadingServiceStatList } = useGetServiceStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!serviceStatList) return [];
    if (serviceIds.length === 0) return serviceStatList;
    return serviceStatList.filter((serviceStat) => serviceIds.includes(String(serviceStat.serviceId ?? '')));
  }, [serviceStatList, serviceIds]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

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

  const columnDefs: ColDef<ServiceStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: queryParams.timeUnit === 'MI' || queryParams.timeUnit === 'HH' ? 2 : 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(queryParams.timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '봇서비스ID', field: 'serviceId', hide: true },
    { headerName: '봇서비스', field: 'serviceName', flex: 2 },
    { headerName: '진입수', field: 'serviceEnterCount', flex: 1, cellStyle: { alignItems: 'center' } },
    { headerName: '완결수', field: 'serviceCompleteCount', flex: 1, cellStyle: { alignItems: 'center' } },
    {
      headerName: '완결율',
      field: 'serviceCompletePercent',
      flex: 1,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    { headerName: '상담연결수', field: 'reqAgentCount', flex: 1, cellStyle: { alignItems: 'center' } },
    {
      headerName: '진입별 상담연결율',
      field: 'enterReqAgentPercent',
      flex: 1,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    {
      headerName: '완결별 상담연결율',
      field: 'completeReqAgentPercent',
      flex: 1,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    { headerName: '질의수', field: 'botSlotInCount', flex: 1, cellStyle: { alignItems: 'center' } },
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
    const fileName = `SERVICE_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '서비스 통계',
      processCellCallback: (p: ProcessCellForExportParams) => {
        const colId = p.column.getColId();
        const v = p.value;

        if (colId === 'psrTimeKey') {
          return v ? dayjs(String(v)).format(getTimeFormat(queryParams.timeUnit)) : '-';
        }

        if (colId === 'serviceCompletePercent' || colId === 'enterReqAgentPercent' || colId === 'completeReqAgentPercent') {
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
        <div className="flex items-center justify-between gap-2 pb-5">
          <div className="flex gap-3 w-full items-center">
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
            <DatePicker value={startDate} onChange={(date) => setStartDate(date)} inputReadOnly allowClear={false} />
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
            <DatePicker value={endDate} onChange={(date) => setEndDate(date)} inputReadOnly allowClear={false} />
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
            <Divider orientation="vertical" className="!h-5 !m-0" />
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
        <div className="w-full flex-1">
          <AgGridReact<ServiceStatListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingServiceStatList} />
        </div>
      </div>
    </div>
  );
}
