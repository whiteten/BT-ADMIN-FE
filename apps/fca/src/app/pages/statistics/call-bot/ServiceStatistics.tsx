import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Select, message } from 'antd';
import dayjs from 'dayjs';
import { Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { useDateRangeLimit } from '../../../features/statistics/hooks/useDateRangeLimit';
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
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [draftServiceIds, setDraftServiceIds] = useState<string[]>([]);

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<ServiceStatListItem>>(null);
  const { RangePicker } = DatePicker;
  const { data: botList } = useGetBots();

  const {
    draftDateRange,
    queryDateRange,
    timeUnit,
    handleTimeUnitChange,
    handleDateRangeChange,
    handleSearch: handleDateSearch,
    disabledDate,
    getTimeFormat,
  } = useDateRangeLimit();

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

  const queryParams = useMemo(() => {
    return {
      timeUnit: timeUnit,
      fromTime: queryDateRange[0].format('YYYYMMDD'),
      toTime: queryDateRange[1].format('YYYYMMDD'),
      serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
    };
  }, [timeUnit, queryDateRange, serviceIds]);

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

  useEffect(() => {
    handleDateSearch();
  }, [draftDateRange]);

  useEffect(() => {
    setServiceIds(draftServiceIds);
  }, [draftServiceIds]);

  const handleServiceIdsChange = (value: string[]) => {
    setDraftServiceIds(value ?? []);
  };

  const columnDefs: ColDef<ServiceStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(timeUnit)) : '-'),
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
          return v ? dayjs(String(v)).format(getTimeFormat(timeUnit)) : '-';
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
      <PageHeader title="서비스 통계" breadcrumb={breadcrumb} />
      {/* Filter */}
      <div className="w-full h-full bg-white bt-shadow p-5">
        <div className="flex items-center justify-between gap-2 pb-5">
          <div className="flex gap-3 w-full items-center">
            <Select
              value={timeUnit}
              onChange={handleTimeUnitChange}
              options={[
                { label: '분간', value: 'MI' },
                { label: '시간', value: 'HH' },
                { label: '일간', value: 'DD' },
                { label: '월간', value: 'MM' },
                { label: '년간', value: 'YY' },
              ]}
              className="!max-w-[110px] !min-w-[90px]"
              popupMatchSelectWidth={false}
              defaultValue="DD"
            />
            <RangePicker value={draftDateRange} onChange={handleDateRangeChange} disabledDate={disabledDate} inputReadOnly allowClear={false} />
            <Divider orientation="vertical" className="!h-5 !m-0" />
            <span className="text-sm font-normal text-[#495057] shrink-0">봇서비스</span>
            <Select
              mode="multiple"
              value={draftServiceIds}
              onChange={handleServiceIdsChange}
              allowClear
              showSearch
              maxTagCount="responsive"
              options={serviceSelectOptions}
              placeholder="검색할 봇서비스를 선택하세요."
              optionFilterProp="label"
              className="!min-w-[200px] !max-w-[400px]"
              popupMatchSelectWidth={false}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
        <div className="w-full h-[calc(100%-56px)]">
          <AgGridReact<ServiceStatListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingServiceStatList} />
        </div>
      </div>
    </div>
  );
}
