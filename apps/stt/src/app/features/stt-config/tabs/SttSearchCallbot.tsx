import { useRef, useState } from 'react';
import type { ColDef, RowClickedEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SttSearchDetailDrawer, { type SttSearchDetailDrawerRef } from '../components/SttSearchDetailDrawer';
import { useGetSttSearchCallbot, useGetSttSearchCallbotDetail } from '../hooks/useSearchQueries';
import type { SttSearchCallbotDetailItem, SttSearchCallbotDetailParams, SttSearchCallbotItem, SttSearchCallbotParams, SttSearchItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export default function SttSearchCallbot() {
  const { gridOptions } = useAggridOptions();
  const drawerRef = useRef<SttSearchDetailDrawerRef>(null);

  // 운영자 모드에서 "전체" 스코프(대행 테넌트 미지정)일 때만 테넌트 컬럼 노출 — CtiQueueTable 패턴 참고.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const showTenantColumn = operatorMode && actAsTenantId === null;

  const [searchDate, setSearchDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [selectedOrgUcid, setSelectedOrgUcid] = useState<string | undefined>();
  const [listSearchParams, setListSearchParams] = useState<SttSearchCallbotParams>({
    fromDateTime: dayjs().format('YYYYMMDD') + '000000',
    toDateTime: dayjs().format('YYYYMMDD') + '235959',
  });
  const [detailParams, setDetailParams] = useState<SttSearchCallbotDetailParams | undefined>();

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useGetSttSearchCallbot({
    params: listSearchParams as Record<string, unknown>,
  });

  const { data: detailData, isLoading: isDetailLoading } = useGetSttSearchCallbotDetail({
    params: detailParams as Record<string, unknown>,
    queryOptions: { enabled: !!detailParams?.orgUcid },
  });

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<SttSearchCallbotDetailItem>) => {
    if (!event.data) return;
    drawerRef.current?.open(event.data as unknown as SttSearchItem, event.data.engineCode);
  };

  const handleSearch = () => {
    if (!searchDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    const startDateTime = searchDate
      .hour(startTime?.hour() ?? 0)
      .minute(startTime?.minute() ?? 0)
      .second(startTime?.second() ?? 0);
    const endDateTime = searchDate
      .hour(endTime?.hour() ?? 23)
      .minute(endTime?.minute() ?? 59)
      .second(endTime?.second() ?? 59);
    if (startDateTime.isAfter(endDateTime)) {
      toast.warning('시작일시가 종료일시보다 늦을 수 없습니다.');
      return;
    }
    const newParams: SttSearchCallbotParams = {
      fromDateTime: searchDate.format('YYYYMMDD') + (startTime?.format('HHmmss') ?? '000000'),
      toDateTime: searchDate.format('YYYYMMDD') + (endTime?.format('HHmmss') ?? '235959'),
    };
    const paramsChanged = JSON.stringify(newParams) !== JSON.stringify(listSearchParams);
    setSelectedOrgUcid(undefined);
    setDetailParams(undefined);
    setListSearchParams(newParams);
    if (!paramsChanged) void refetchList();
  };

  const handleRowClick = (event: RowClickedEvent<SttSearchCallbotItem>) => {
    const orgUcid = event.data?.orgUcid;
    if (!orgUcid) return;
    setSelectedOrgUcid(orgUcid);
    setDetailParams({ orgUcid, analKind: 'C' });
  };

  const listColumnDefs: ColDef<SttSearchCallbotItem>[] = [
    {
      headerName: '테넌트',
      field: 'tenantName',
      flex: 2,
      filter: true,
      hide: !showTenantColumn,
    },
    {
      headerName: '고유번호(UCID)',
      field: 'orgUcid',
      flex: 3,
      tooltipField: 'orgUcid',
      filter: true,
    },
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
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
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
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
        <div className="flex items-center gap-2 ml-auto">
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
            <AgGridReact<SttSearchCallbotDetailItem>
              rowData={detailData ?? []}
              columnDefs={detailColumnDefs}
              gridOptions={gridOptions}
              onRowDoubleClicked={handleRowDoubleClicked}
              loading={isDetailLoading}
              sideBar={false}
            />
          )}
        </div>
      </div>

      <SttSearchDetailDrawer ref={drawerRef} />
    </div>
  );
}
