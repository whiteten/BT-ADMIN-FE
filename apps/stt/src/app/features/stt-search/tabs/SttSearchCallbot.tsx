import { useEffect, useState } from 'react';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { useGetSttSearchCallbot, useGetSttSearchCallbotDetail, useGetTenants } from '../hooks/useSttQueries';
import type { SttSearchCallbotDetailItem, SttSearchCallbotDetailParams, SttSearchCallbotItem, SttSearchCallbotParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export default function SttSearchCallbot() {
  const { gridOptions } = useAggridOptions();

  const [searchDate, setSearchDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [ucidGkey, setUcidGkey] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [selectedOrgUcid, setSelectedOrgUcid] = useState<string | undefined>();
  const [listSearchParams, setListSearchParams] = useState<SttSearchCallbotParams | null>(null);
  const [detailParams, setDetailParams] = useState<SttSearchCallbotDetailParams | undefined>();

  const { data: tenants } = useGetTenants({});
  const tenantOptions = tenants?.map((t) => ({ label: t.tenantName, value: String(t.tenantId) })) ?? [];

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      const firstTenantId = String(tenants[0].tenantId);
      setTenantId((prev) => {
        const resolved = prev ?? firstTenantId;
        setListSearchParams({
          fromDateTime: dayjs().format('YYYYMMDD') + '000000',
          toDateTime: dayjs().format('YYYYMMDD') + '235959',
          tenantId: Number(resolved),
          analKind: 'C',
        });
        return resolved;
      });
    }
  }, [tenants]);

  const buildListParams = (): SttSearchCallbotParams => ({
    fromDateTime: searchDate && startTime ? searchDate.format('YYYYMMDD') + startTime.format('HHmmss') : undefined,
    toDateTime: searchDate && endTime ? searchDate.format('YYYYMMDD') + endTime.format('HHmmss') : undefined,
    ucidGkey: ucidGkey || undefined,
    tenantId: tenantId ? Number(tenantId) : undefined,
    analKind: 'C',
  });

  const { data: listData, isLoading: isListLoading } = useGetSttSearchCallbot({
    params: listSearchParams as Record<string, unknown>,
    queryOptions: { enabled: !!listSearchParams },
  });

  const { data: detailData, isLoading: isDetailLoading } = useGetSttSearchCallbotDetail({
    params: detailParams as Record<string, unknown>,
    queryOptions: { enabled: !!detailParams?.orgUcid },
  });

  const handleSearch = () => {
    if (!searchDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    setSelectedOrgUcid(undefined);
    setDetailParams(undefined);
    setListSearchParams(buildListParams());
  };

  const handleRowClick = (event: RowClickedEvent<SttSearchCallbotItem>) => {
    const orgUcid = event.data?.orgUcid;
    if (!orgUcid) return;
    setSelectedOrgUcid(orgUcid);
    setDetailParams({
      orgUcid,
      tenantId: tenantId ? Number(tenantId) : undefined,
      analKind: 'C',
    });
  };

  const listColumnDefs: ColDef<SttSearchCallbotItem>[] = [
    {
      headerName: '고유번호(UCID)',
      field: 'orgUcid',
      flex: 3,
      tooltipField: 'orgUcid',
    },
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
    },
    {
      headerName: '통화시간',
      field: 'talkTime',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: '대화건수',
      field: 'detailCnt',
      maxWidth: 100,
      flex: 1,
    },
  ];

  const detailColumnDefs: ColDef<SttSearchCallbotDetailItem>[] = [
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
    },
    {
      headerName: '통화시간',
      field: 'talkTime',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: '대표문장',
      field: 'startSentence',
      flex: 4,
      tooltipField: 'startSentence',
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 검색 필터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={searchDate} onChange={setSearchDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={startTime} onChange={setStartTime} format="HH:mm:ss" allowClear={false} inputReadOnly style={{ width: 110 }} />
          <span className="text-[#495057]">-</span>
          <TimePicker value={endTime} onChange={setEndTime} format="HH:mm:ss" allowClear={false} inputReadOnly style={{ width: 110 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">고유번호</span>
          <Input value={ucidGkey} onChange={(e) => setUcidGkey(e.target.value)} onPressEnter={handleSearch} placeholder="고유번호를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={tenantId} onChange={setTenantId} options={tenantOptions} placeholder="기본테넌트" allowClear popupMatchSelectWidth={false} style={{ width: 160 }} />
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
        </div>
      </div>

      {/* 그리드 분할 레이아웃 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 왼쪽: 목록 */}
        <div className="flex-1 min-w-0">
          <AgGridReact<SttSearchCallbotItem>
            rowData={listData ?? []}
            columnDefs={listColumnDefs}
            gridOptions={{
              ...gridOptions,
              rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
            }}
            loading={isListLoading}
            sideBar={false}
            onRowClicked={handleRowClick}
            getRowId={(params) => params.data.orgUcid}
          />
        </div>

        {/* 오른쪽: 상세 */}
        <div className="flex-1 min-w-0">
          {!selectedOrgUcid ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400 border border-dashed border-gray-300 rounded">
              목록에서 항목을 선택하면 대화 내용이 표시됩니다.
            </div>
          ) : (
            <AgGridReact<SttSearchCallbotDetailItem> rowData={detailData ?? []} columnDefs={detailColumnDefs} gridOptions={gridOptions} loading={isDetailLoading} sideBar={false} />
          )}
        </div>
      </div>
    </div>
  );
}
