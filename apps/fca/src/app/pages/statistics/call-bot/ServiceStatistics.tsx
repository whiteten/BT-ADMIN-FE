import { useEffect, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { useGetServiceStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { ServiceStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '콜봇 통계', path: '/fca/statistics/call-bot' },
  { title: '서비스 통계', path: '/fca/statistics/call-bot/service' },
];

const TIME_FORMAT: Record<string, string> = {
  MI: 'YYYY-MM-DD HH시 mm분',
  HH: 'YYYY-MM-DD HH시',
  DD: 'YYYY-MM-DD',
  MM: 'YYYY-MM',
  YY: 'YYYY',
};

export default function ServiceStatistics() {
  const [serviceId, setServiceId] = useState('');

  const { gridOptions } = useAggridOptions();
  const { RangePicker } = DatePicker;
  const { data: botList } = useGetBots();

  const [draftDateRange, setDraftDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [queryDateRange, setQueryDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [timeUnit, setTimeUnit] = useState<string>('DD');

  const [rowData, setRowData] = useState<ServiceStatListItem[]>([]);

  const getTimeFormat = (unit?: string) => TIME_FORMAT[unit ?? ''] ?? 'YYYY-MM-DD';

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
    };
  }, [timeUnit, queryDateRange]);

  const { data: serviceStatList, isLoading: isLoadingServiceStatList } = useGetServiceStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!serviceStatList) return [];
    if (!serviceId.trim()) return serviceStatList;
    return serviceStatList.filter((serviceStat) => String(serviceStat.serviceId ?? '') === serviceId);
  }, [serviceStatList, serviceId]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleTimeUnitChange = (value?: string) => {
    setTimeUnit(value ?? '');
  };

  const handleColumnChange = (value?: string) => {
    setServiceId(value ?? '');
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates?.[1]) {
      setDraftDateRange([dates[0], dates[1]]);
    }
  };

  const columnDefs: ColDef<ServiceStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '서비스ID', field: 'serviceId', hide: true },
    { headerName: '봇서비스', field: 'serviceName', flex: 2 },
    { headerName: '진입수', field: 'serviceEnterCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '완결수', field: 'serviceCompleteCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    {
      headerName: '완결율',
      field: 'serviceCompletePercent',
      maxWidth: 100,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    { headerName: '상담연결수', field: 'reqAgentCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    {
      headerName: '진입수별 상담연결율',
      field: 'enterReqAgentPercent',
      maxWidth: 100,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    {
      headerName: '완결수별 상담연결율',
      field: 'completeReqAgentPercent',
      maxWidth: 100,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    { headerName: '질의수', field: 'botSlotInCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
  ];

  const handleSearch = () => {
    setQueryDateRange(draftDateRange);
  };

  const handleExport = () => {
    console.log('엑셀 다운로드');
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
            <RangePicker value={draftDateRange} onChange={handleDateRangeChange} inputReadOnly allowClear={false} />
            <Divider orientation="vertical" className="!h-5 !m-0" />
            <span className="text-sm font-normal text-[#495057] shrink-0">봇서비스</span>
            <Select
              value={serviceId || undefined}
              onChange={handleColumnChange}
              allowClear
              showSearch
              options={serviceSelectOptions}
              placeholder="검색할 봇서비스를 선택하세요."
              optionFilterProp="label"
              className="!min-w-[200px] !max-w-[250px]"
              popupMatchSelectWidth={false}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="primary" onClick={handleSearch}>
              조회
            </Button>
            <Button type="primary" icon={<Download className="size-4" />} className="!bg-[#10B981] !border-[#10B981] hover:!bg-[#0FA968]" onClick={handleExport}>
              엑셀
            </Button>
          </div>
        </div>
        <div className="w-full h-[calc(100%-56px)]">
          <AgGridReact<ServiceStatListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingServiceStatList} />
        </div>
      </div>
    </div>
  );
}
