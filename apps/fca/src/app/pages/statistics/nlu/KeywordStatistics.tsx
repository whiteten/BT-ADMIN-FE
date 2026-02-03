import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ExcelExportParams, ProcessCellForExportParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Divider, Input, Select, message } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Download } from 'lucide-react';
import { useGetBots } from '../../../features/bot-config/hooks/useBotQueries';
import { useGetModels } from '../../../features/bot-config/hooks/useModelQueries';
import { useDateRangeLimit } from '../../../features/statistics/hooks/useDateRangeLimit';
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
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [draftModelIds, setDraftModelIds] = useState<string[]>([]);
  const [scnIds, setScnIds] = useState<string[]>([]);
  const [draftScnIds, setDraftScnIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState('entityTag');
  const [searchValue, setSearchValue] = useState('');

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<KeywordStatListItem>>(null);
  const { RangePicker } = DatePicker;
  const { data: scnList } = useGetBots();
  const { data: modelList } = useGetModels();

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

  const [rowData, setRowData] = useState<KeywordStatListItem[]>([]);

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

  const queryParams = useMemo(() => {
    return {
      timeUnit: timeUnit,
      fromTime: queryDateRange[0].format('YYYYMMDD'),
      toTime: queryDateRange[1].format('YYYYMMDD'),
      scnIds: scnIds.length > 0 ? scnIds : undefined,
      modelIds: modelIds.length > 0 ? modelIds : undefined,
    };
  }, [timeUnit, queryDateRange, scnIds, modelIds]);

  const { data: keywordStatList, isLoading: isLoadingKeywordStatList } = useGetKeywordStatList({
    params: queryParams,
  });

  const filteredList = useMemo(() => {
    if (!keywordStatList) return [];
    const trimmedSearchValue = searchValue?.trim().toLowerCase();
    if (scnIds.length === 0 && modelIds.length === 0 && !trimmedSearchValue) return keywordStatList;
    return keywordStatList.filter((keywordStat) => {
      const matchesScn = scnIds.length === 0 || scnIds.includes(String(keywordStat.scnId ?? ''));
      const matchesModel = modelIds.length === 0 || modelIds.includes(String(keywordStat.modelId ?? ''));
      const matchesSearchValue =
        !trimmedSearchValue ||
        String(keywordStat[filterColumn as keyof KeywordStatListItem] ?? '')
          .toLowerCase()
          .includes(trimmedSearchValue);
      return matchesScn && matchesModel && matchesSearchValue;
    });
  }, [keywordStatList, scnIds, modelIds, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
    handleDateSearch();
    setScnIds(draftScnIds);
    setModelIds(draftModelIds);
  }, [filteredList, draftDateRange, handleDateSearch, draftScnIds, draftModelIds]);

  const handleScnIdsChange = (value: string[]) => {
    setDraftScnIds(value ?? []);
  };

  const handleModelIdsChange = (value: string[]) => {
    setDraftModelIds(value ?? []);
  };

  const columnDefs: ColDef<KeywordStatListItem>[] = [
    {
      headerName: '날짜',
      field: 'psrTimeKey',
      flex: 1,
      valueFormatter: ({ value }: { value?: string }) => (value ? dayjs(value).format(getTimeFormat(timeUnit)) : '-'),
      cellStyle: { alignItems: 'center' },
    },
    { headerName: '봇서비스ID', field: 'scnId', hide: true },
    { headerName: '봇서비스', field: 'scnName', flex: 2 },
    { headerName: '모델ID', field: 'modelId', hide: true },
    { headerName: '모델명', field: 'modelName', flex: 1 },
    { headerName: '개체 태그', field: 'entityTag', flex: 1 },
    { headerName: '키워드', field: 'keyword', flex: 1 },
    { headerName: '검출횟수', field: 'keywordCnt', maxWidth: 100, cellStyle: { alignItems: 'center' } },
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
    const fileName = `KEYWORD_STATISTICS_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    const exportParams: ExcelExportParams = {
      fileName,
      sheetName: '키워드 통계',
      processCellCallback: (p: ProcessCellForExportParams) => {
        const colId = p.column.getColId();
        const v = p.value;

        if (colId === 'psrTimeKey') {
          return v ? dayjs(String(v)).format(getTimeFormat(timeUnit)) : '-';
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
                </div>
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
                  <Select
                    mode="multiple"
                    value={draftScnIds}
                    onChange={handleScnIdsChange}
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
                <Divider orientation="vertical" className="!h-5 !m-0" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#495057] shrink-0">모델</span>
                  <Select
                    mode="multiple"
                    value={draftModelIds}
                    onChange={handleModelIdsChange}
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
                <Select
                  value={filterColumn}
                  onChange={setFilterColumn}
                  options={[
                    { label: '개체 태그', value: 'entityTag' },
                    { label: '키워드', value: 'keyword' },
                  ]}
                  className="!max-w-[150px] !min-w-[100px]"
                  popupMatchSelectWidth={false}
                />
                <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="!min-w-[200px] !max-w-[250px]" placeholder="검색어를 입력하세요." />
              </div>
            </CollapsibleContent>
          </header>
        </Collapsible>
        <div className="w-full flex-1">
          <AgGridReact<KeywordStatListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoadingKeywordStatList} />
        </div>
      </div>
    </div>
  );
}
