import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ColGroupDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Input, Select, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { useGetSlotStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { SlotStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '콜봇 통계', path: '/fca/statistics/call-bot' },
  { title: '슬롯 통계', path: '/fca/statistics/call-bot/slot' },
];

const TIME_FORMAT: Record<string, string> = {
  MI: 'YYYY-MM-DD HH시 mm분',
  HH: 'YYYY-MM-DD HH시',
  DD: 'YYYY-MM-DD',
  MM: 'YYYY-MM',
  YY: 'YYYY',
};

export default function SlotStatistics() {
  const [serviceId, setServiceId] = useState('');
  const [dialogName, setDialogName] = useState('');

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<SlotStatListItem>>(null);
  const { RangePicker } = DatePicker;
  const { data: botList } = useGetBots();

  const [draftDateRange, setDraftDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [queryDateRange, setQueryDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [timeUnit, setTimeUnit] = useState<string>('DD');

  const [rowData, setRowData] = useState<SlotStatListItem[]>([]);

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
      serviceId: serviceId?.trim(),
      dialogName: dialogName?.trim(),
    };
  }, [timeUnit, queryDateRange, serviceId, dialogName]);

  const { data: slotStatList, isLoading: isLoadingSlotStatList } = useGetSlotStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!slotStatList) return [];
    const trimmedServiceId = serviceId?.trim();
    const trimmedDialogName = dialogName?.trim().toLowerCase();
    if (!trimmedServiceId && !trimmedDialogName) return slotStatList;
    return slotStatList.filter((slotStat) => {
      const matchesService = !trimmedServiceId || String(slotStat.serviceId ?? '') === trimmedServiceId;
      const matchesDialogName =
        !trimmedDialogName ||
        String(slotStat.dialogName ?? '')
          .toLowerCase()
          .includes(trimmedDialogName);
      return matchesService && matchesDialogName;
    });
  }, [slotStatList, serviceId, dialogName]);

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

  const columnDefs: Array<ColDef<SlotStatListItem> | ColGroupDef<SlotStatListItem>> = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '서비스ID', field: 'serviceId', hide: true },
    { headerName: '봇서비스', field: 'serviceName', hide: true },
    { headerName: '대화ID', field: 'dialogId', hide: true },
    { headerName: '대화명', field: 'dialogName', flex: 2 },
    { headerName: '슬롯ID', field: 'slotId', hide: true },
    { headerName: '슬롯명', field: 'slotName', flex: 2 },
    { headerName: '진입수', field: 'inCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    { headerName: '완결수', field: 'successCount', maxWidth: 100, cellStyle: { alignItems: 'center' } },
    {
      headerName: '완결율',
      field: 'successPercent',
      maxWidth: 100,
      cellStyle: { alignItems: 'center' },
      valueFormatter: ({ value }: { value?: number }) => (value ? `${value}%` : '-'),
    },
    {
      headerName: '재질문(성공)',
      children: [
        { headerName: '1회이하', field: 'oneTimeOrLess', maxWidth: 100, cellStyle: { alignItems: 'center' } },
        { headerName: '2회', field: 'twoTimes', maxWidth: 100, cellStyle: { alignItems: 'center' } },
        { headerName: '3회이상', field: 'threeTimesOrMore', maxWidth: 100, cellStyle: { alignItems: 'center' } },
      ],
    },
  ];

  const handleSearch = () => {
    setQueryDateRange(draftDateRange);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (!rowData?.length) {
      message.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    const fileName = `SLOT_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '슬롯 통계',
      processCellCallback: (p: ProcessCellForExportParams) => {
        const colId = p.column.getColId();
        const v = p.value;

        if (colId === 'psrTimeKey') {
          return v ? dayjs(String(v)).format(getTimeFormat(timeUnit)) : '-';
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
      <PageHeader title="슬롯 통계" breadcrumb={breadcrumb} />
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
            <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
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
            <Divider orientation="vertical" className="!h-5 !m-0" />
            <span className="text-sm font-medium text-[#495057] shrink-0">대화명</span>
            <Input value={dialogName} onChange={(e) => setDialogName(e.target.value)} className="!min-w-[200px] !max-w-[250px]" placeholder="검색할 대화명을 입력하세요." />
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
        <div className="w-full h-[calc(100%-56px)]">
          <AgGridReact<SlotStatListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingSlotStatList} />
        </div>
      </div>
    </div>
  );
}
