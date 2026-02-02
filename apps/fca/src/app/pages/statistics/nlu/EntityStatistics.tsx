import { useEffect, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useGetModels } from '../../../features/bot-config/hooks/useModelQueries';
import { useGetEntityStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { EntityStatListItem } from '../../../features/statistics/types/statistics.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: 'NLU 통계', path: '/fca/statistics/nlu' },
  { title: '개체 통계', path: '/fca/statistics/nlu/entity' },
];

const TIME_FORMAT: Record<string, string> = {
  MI: 'YYYY-MM-DD HH시 mm분',
  HH: 'YYYY-MM-DD HH시',
  DD: 'YYYY-MM-DD',
  MM: 'YYYY-MM',
  YY: 'YYYY',
};

export default function EntityStatistics() {
  const [modelId, setModelId] = useState('');

  const { gridOptions } = useAggridOptions();
  const { RangePicker } = DatePicker;
  const { data: modelList } = useGetModels();

  const [draftDateRange, setDraftDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [queryDateRange, setQueryDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [timeUnit, setTimeUnit] = useState<string>('DD');

  const [rowData, setRowData] = useState<EntityStatListItem[]>([]);

  const getTimeFormat = (unit?: string) => TIME_FORMAT[unit ?? ''] ?? 'YYYY-MM-DD';

  type ModelOption = { id: string; name: string };

  const models: ModelOption[] = useMemo(() => {
    if (modelList?.length) {
      return modelList.filter((m) => Boolean(m?.modelId && m?.modelName)).map((m) => ({ id: String(m.modelId), name: String(m.modelName) }));
    }
    return [];
  }, [modelList]);

  const modelSelectOptions = useMemo(
    () =>
      models.map((m) => ({
        label: m.name,
        value: m.id,
      })),
    [models],
  );

  const queryParams = useMemo(() => {
    return {
      timeUnit: timeUnit,
      fromTime: queryDateRange[0].format('YYYYMMDD'),
      toTime: queryDateRange[1].format('YYYYMMDD'),
    };
  }, [timeUnit, queryDateRange]);

  const { data: entityStatList, isLoading: isLoadingEntityStatList } = useGetEntityStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!entityStatList) return [];
    if (!modelId.trim()) return entityStatList;
    return entityStatList.filter((entityStat) => String(entityStat.modelId ?? '') === modelId);
  }, [entityStatList, modelId]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleTimeUnitChange = (value?: string) => {
    setTimeUnit(value ?? '');
  };

  const handleColumnChange = (value?: string) => {
    setModelId(value ?? '');
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates?.[1]) {
      setDraftDateRange([dates[0], dates[1]]);
    }
  };

  const columnDefs: ColDef<EntityStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '봇서비스ID', field: 'scnId', hide: true },
    { headerName: '봇서비스명', field: 'scnName', flex: 2 },
    { headerName: '모델ID', field: 'modelId', hide: true },
    { headerName: '모델명', field: 'modelName', flex: 1 },
    { headerName: '개체명', field: 'entityTag', flex: 1 },
    { headerName: '검출횟수', field: 'entityCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
  ];

  const handleSearch = () => {
    setQueryDateRange(draftDateRange);
  };

  const handleExport = () => {
    console.log('엑셀 다운로드');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="개체 통계" breadcrumb={breadcrumb} />
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
            <span className="text-sm font-medium text-[#495057] shrink-0">모델</span>
            <Select
              value={modelId || undefined}
              onChange={handleColumnChange}
              allowClear
              showSearch
              options={modelSelectOptions}
              placeholder="검색할 모델을 선택하세요."
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
          <AgGridReact<EntityStatListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingEntityStatList} />
        </div>
      </div>
    </div>
  );
}
