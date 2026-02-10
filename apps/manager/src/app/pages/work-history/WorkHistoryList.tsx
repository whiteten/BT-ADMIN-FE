import { useCallback, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { Database, Search } from 'lucide-react';
import { WorkHistoryDetailDrawer, type WorkHistoryDetailDrawerRef } from './WorkHistoryDetailDrawer';
import { useWorkHistoryList } from '../../features/workHistory/hooks/useWorkHistoryQueries';
import type { WorkHistoryListItem, WorkHistoryListParams } from '../../features/workHistory/types/workHistory.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import ServerPagination from '@/components/custom/ServerPagination';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const PAGE_SIZE = 20;

const breadcrumb = [
  { title: '자원 관리', path: '/manager' },
  { title: '작업이력', path: '/manager/resource/work-history' },
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
  const drawerRef = useRef<WorkHistoryDetailDrawerRef>(null);

  // 기간 파라미터 (서버 필터링) - 당일 기본
  const [params, setParams] = useState<WorkHistoryListParams>(() => ({
    fromDate: dayjs().format('YYYY-MM-DD'),
    fromTime: '00:00',
    toDate: dayjs().format('YYYY-MM-DD'),
    toTime: '23:59',
    page: 0,
    size: PAGE_SIZE,
  }));

  // 필터 입력값 (검색 버튼 클릭 전)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');

  // 페이지 상태
  const [currentPage, setCurrentPage] = useState(0);

  // 날짜 (단일 일자) + 시간 (from/to 분리)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [fromTime, setFromTime] = useState<dayjs.Dayjs>(dayjs().startOf('day'));
  const [toTime, setToTime] = useState<dayjs.Dayjs>(dayjs().hour(23).minute(59));

  const { data: listData, isLoading, isFetching } = useWorkHistoryList(params);

  // 검색 버튼 핸들러
  const handleSearch = useCallback(() => {
    setCurrentPage(0);
    setParams({
      fromDate: selectedDate.format('YYYY-MM-DD'),
      fromTime: fromTime.format('HH:mm'),
      toDate: selectedDate.format('YYYY-MM-DD'),
      toTime: toTime.format('HH:mm'),
      status: statusFilter || undefined,
      httpMethod: methodFilter || undefined,
      userName: userSearch || undefined,
      page: 0,
      size: PAGE_SIZE,
    });
  }, [selectedDate, fromTime, toTime, statusFilter, methodFilter, userSearch]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    setParams((prev) => ({ ...prev, page: newPage }));
  }, []);

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
      { headerName: '작업내용', field: 'description', flex: 1, minWidth: 200 },
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

  const handleDateChange = useCallback((date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
    }
  }, []);

  const handleFromTimeChange = useCallback(
    (time: dayjs.Dayjs | null) => {
      if (time) {
        setFromTime(time);
        // from > to면 to를 from으로 맞춤
        if (time.isAfter(toTime)) {
          setToTime(time);
        }
      }
    },
    [toTime],
  );

  const handleToTimeChange = useCallback(
    (time: dayjs.Dayjs | null) => {
      if (time) {
        setToTime(time);
        // to < from면 from을 to로 맞춤
        if (time.isBefore(fromTime)) {
          setFromTime(time);
        }
      }
    },
    [fromTime],
  );

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<WorkHistoryListItem>) => {
    if (event.data) {
      drawerRef.current?.open(event.data.workId);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

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
          <TimePicker value={fromTime} onChange={handleFromTimeChange} format="HH:mm" style={{ width: 85 }} allowClear={false} showNow={false} minuteStep={10} />
          <span className="text-gray-400">~</span>
          <TimePicker value={toTime} onChange={handleToTimeChange} format="HH:mm" style={{ width: 85 }} allowClear={false} showNow={false} minuteStep={10} />
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
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<Search className="w-3.5 h-3.5" />} onClick={handleSearch} loading={isFetching}>
            검색
          </Button>
        </div>
        <span className="text-sm text-gray-500 flex-shrink-0">{isFetching ? '조회 중...' : `${listData?.total?.toLocaleString() ?? 0}건`}</span>
      </div>

      {/* 그리드 */}
      <div className="flex-1 w-full bg-white bt-shadow overflow-hidden">
        {isLoading ? (
          <FallbackSpinner />
        ) : (listData?.items?.length ?? 0) === 0 ? (
          <NoData message="작업이력이 없습니다." iconSize={50} />
        ) : (
          <AgGridReact<WorkHistoryListItem>
            rowData={listData?.items ?? []}
            columnDefs={columnDefs}
            gridOptions={{
              ...gridOptions,
              pagination: false,
              statusBar: undefined,
            }}
            loading={isFetching}
            onRowDoubleClicked={handleRowDoubleClick}
            getRowId={(params) => params.data.workId}
          />
        )}
      </div>

      {/* 서버 사이드 페이지네이션 */}
      {(listData?.total ?? 0) > 0 && <ServerPagination currentPage={currentPage} totalItems={listData?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={handlePageChange} />}

      {/* 상세 드로어 */}
      <WorkHistoryDetailDrawer ref={drawerRef} />
    </div>
  );
}
