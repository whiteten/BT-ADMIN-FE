import { useCallback, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { Database, Search } from 'lucide-react';
import { WorkHistoryDetailModal, type WorkHistoryDetailModalRef } from './WorkHistoryDetailModal';
import { useWorkHistoryList } from '../../features/workHistory/hooks/useWorkHistoryQueries';
import type { WorkHistoryListItem, WorkHistoryListParams } from '../../features/workHistory/types/workHistory.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '자원 관리', path: '/manager' },
  { title: '작업이력', path: '/manager/audit/work-history' },
];

/** 상태 배지 컴포넌트 */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-800',
    FAIL: 'bg-red-100 text-red-800',
    PARTIAL_FAIL: 'bg-yellow-100 text-yellow-800',
  };
  const labels: Record<string, string> = {
    SUCCESS: '성공',
    FAIL: '실패',
    PARTIAL_FAIL: '부분실패',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{labels[status] || status}</span>;
}

/** HTTP 메서드 배지 */
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-green-100 text-green-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
    PATCH: 'bg-purple-100 text-purple-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${colors[method] || 'bg-gray-100 text-gray-800'}`}>{method}</span>;
}

/** IDS 배지 컴포넌트 */
function IdsBadge() {
  return (
    <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
      <Database className="w-3 h-3" />
      IDS
    </span>
  );
}

export default function WorkHistoryList() {
  const { gridOptions } = useAggridOptions();
  const modalRef = useRef<WorkHistoryDetailModalRef>(null);

  // 기간 파라미터 (서버 필터링) - 당일 기본
  const [params, setParams] = useState<WorkHistoryListParams>(() => ({
    fromDate: dayjs().format('YYYY-MM-DD'),
    fromTime: '00:00',
    toDate: dayjs().format('YYYY-MM-DD'),
    toTime: '23:59',
  }));

  // 클라이언트 사이드 필터
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');

  // 날짜 (단일 일자) + 시간 범위
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')]);

  const { data: listData, isLoading, isFetching } = useWorkHistoryList(params);

  const columnDefs: ColDef<WorkHistoryListItem>[] = useMemo(
    () => [
      {
        headerName: '시각',
        field: 'startedAt',
        width: 150,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
        sort: 'desc',
      },
      { headerName: '사용자', field: 'userName', width: 80 },
      {
        headerName: '메서드',
        field: 'httpMethod',
        width: 75,
        cellRenderer: (p: ICellRendererParams<WorkHistoryListItem>) => (p.value ? <MethodBadge method={p.value} /> : '-'),
      },
      { headerName: 'URI', field: 'requestUri', flex: 1, minWidth: 300 },
      {
        headerName: '상태',
        field: 'status',
        width: 75,
        cellRenderer: (p: ICellRendererParams<WorkHistoryListItem>) => (p.value ? <StatusBadge status={p.value} /> : '-'),
      },
      {
        headerName: 'ms',
        field: 'durationMs',
        width: 65,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value != null ? p.value.toLocaleString() : '-'),
      },
      {
        headerName: 'IDS',
        field: 'hasIdsLog',
        width: 60,
        headerClass: 'ag-center-header',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<WorkHistoryListItem>) => (p.value ? <IdsBadge /> : null),
      },
    ],
    [],
  );

  // 날짜 또는 시간 변경 시 서버에 새로 요청
  const updateParams = useCallback((date: dayjs.Dayjs, times: [dayjs.Dayjs, dayjs.Dayjs]) => {
    setParams({
      fromDate: date.format('YYYY-MM-DD'),
      fromTime: times[0].format('HH:mm'),
      toDate: date.format('YYYY-MM-DD'),
      toTime: times[1].format('HH:mm'),
    });
  }, []);

  const handleDateChange = useCallback(
    (date: dayjs.Dayjs | null) => {
      if (date) {
        setSelectedDate(date);
        updateParams(date, timeRange);
      }
    },
    [timeRange, updateParams],
  );

  const handleTimeChange = useCallback((times: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (times && times[0] && times[1]) {
      setTimeRange([times[0], times[1]]);
    }
  }, []);

  // TimePicker 패널이 닫힐 때 쿼리 실행
  const handleTimeOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // 패널이 닫힐 때 현재 timeRange로 쿼리 실행
        updateParams(selectedDate, timeRange);
      }
    },
    [selectedDate, timeRange, updateParams],
  );

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<WorkHistoryListItem>) => {
    if (event.data) {
      modalRef.current?.open(event.data.workId);
    }
  };

  // 클라이언트 사이드 필터링
  const filteredItems = useMemo(() => {
    const items = listData?.items || [];
    return items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (methodFilter && item.httpMethod !== methodFilter) return false;
      if (
        userSearch &&
        !item.userName?.toLowerCase().includes(userSearch.toLowerCase()) &&
        !String(item.userId ?? '')
          .toLowerCase()
          .includes(userSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [listData, statusFilter, methodFilter, userSearch]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="작업이력" breadcrumb={breadcrumb} />

      {/* 검색 필터 영역 */}
      <div className="flex items-center justify-between gap-2 w-full bg-white bt-shadow px-5 py-3">
        <div className="flex gap-2 items-center flex-nowrap">
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            style={{ width: 130 }}
            allowClear={false}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
          <TimePicker.RangePicker value={timeRange} onChange={handleTimeChange} onOpenChange={handleTimeOpenChange} format="HH:mm" style={{ width: 175 }} allowClear={false} />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: '상태', value: '' },
              { label: '성공', value: 'SUCCESS' },
              { label: '실패', value: 'FAIL' },
              { label: '부분실패', value: 'PARTIAL_FAIL' },
            ]}
            style={{ width: 90 }}
          />
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            options={[
              { label: '메서드', value: '' },
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
            ]}
            style={{ width: 90 }}
          />
          <Input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="사용자"
            prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
            style={{ width: 200 }}
            allowClear
          />
        </div>
        <span className="text-sm text-gray-500 flex-shrink-0">{isFetching ? '조회 중...' : `${filteredItems.length}건`}</span>
      </div>

      {/* 그리드 */}
      <div className="flex-1 w-full bg-white bt-shadow overflow-hidden">
        {isLoading ? (
          <FallbackSpinner />
        ) : filteredItems.length === 0 ? (
          <NoData message="작업이력이 없습니다." iconSize={50} />
        ) : (
          <AgGridReact<WorkHistoryListItem>
            rowData={filteredItems}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            loading={isFetching}
            onRowDoubleClicked={handleRowDoubleClick}
            getRowId={(params) => params.data.workId}
          />
        )}
      </div>

      {/* 상세 모달 */}
      <WorkHistoryDetailModal ref={modalRef} />
    </div>
  );
}
