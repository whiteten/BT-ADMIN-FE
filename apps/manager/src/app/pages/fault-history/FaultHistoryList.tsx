import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { FaultStatusBadge, LevelBadge, formatOccurredAt } from '../../features/fault-history/components/FaultBadges';
import { FaultForceRecoverModal, type FaultForceRecoverModalRef } from '../../features/fault-history/components/FaultForceRecoverModal';
import { FaultHistoryDetailDrawer, type FaultHistoryDetailDrawerRef } from '../../features/fault-history/components/FaultHistoryDetailDrawer';
import { useGetFaultHistories, useGetFaultHistorySummary } from '../../features/fault-history/hooks/useFaultHistoryQueries';
import type { FaultHistoryItem, FaultHistoryListParams } from '../../features/fault-history/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import ServerPagination from '@/components/custom/ServerPagination';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { RangePicker } = DatePicker;

const PAGE_SIZE = 20;

const breadcrumb = [
  { title: '시스템', path: '/manager/fault/history' },
  { title: '장애관리', path: '/manager/fault/history' },
  { title: '장애 이력', path: '/manager/fault/history' },
];

/**
 * 요약 스탯 카드 — 강조 3단계.
 * 기본(장애 발생 건수) < warn(미복구, amber) < danger(미복구 Critical, 붉은 배경 + 굵은 숫자 강조)
 */
function StatCard({ label, value, accent }: { label: string; value: number | undefined; accent?: 'warn' | 'danger' }) {
  // 숫자 폰트 크기는 세 카드 동일(text-xl), 강조는 색상·배경으로만 구분
  const styles = {
    default: { card: 'border-gray-200 bg-white', label: 'text-gray-400', value: 'text-gray-800' },
    warn: { card: 'border-amber-300 bg-amber-50', label: 'text-amber-600', value: 'text-amber-600' },
    danger: { card: 'border-red-400 bg-red-50', label: 'text-red-600 font-bold', value: 'text-red-600' },
  }[accent ?? 'default'];
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles.card}`}>
      <div className={`text-[11px] font-medium ${styles.label}`}>{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${styles.value}`}>{value ?? '-'}</div>
    </div>
  );
}

/**
 * 장애 이력 (AS-IS: SWAT IPR60S5010 장애이력관리)
 * 메뉴: 시스템 > 장애관리 > 장애 이력 · 기본 뷰 = 미복구(AS-IS 상태 기본값 '장애발생' 대응)
 */
export default function FaultHistoryList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const drawerRef = useRef<FaultHistoryDetailDrawerRef>(null);
  const recoverModalRef = useRef<FaultForceRecoverModalRef>(null);
  const gridRef = useRef<AgGridReact<FaultHistoryItem>>(null);
  const [selectedItems, setSelectedItems] = useState<FaultHistoryItem[]>([]);

  // 조회 파라미터 — 기간 기본 오늘~오늘, 미복구만 (AS-IS 기본값)
  const [params, setParams] = useState<FaultHistoryListParams>(() => ({
    from: dayjs().format('YYYYMMDD'),
    to: dayjs().format('YYYYMMDD'),
    unresolvedOnly: true,
    page: 0,
    size: PAGE_SIZE,
  }));

  // 필터 입력값 (조회 버튼 클릭 전)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs()]);
  const [statusFilter, setStatusFilter] = useState<'unresolved' | 'all'>('unresolved');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [codeSearch, setCodeSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);

  const { data: listData, isLoading, isFetching } = useGetFaultHistories({ params });
  // 요약 스탯의 발생 건수는 목록 조회 기간(from~to)과 연동 — 조회 버튼으로 함께 갱신
  const { data: summary } = useGetFaultHistorySummary({ params: { from: params.from, to: params.to } });

  const handleSearch = useCallback(() => {
    setCurrentPage(0);
    setParams({
      from: dateRange[0].format('YYYYMMDD'),
      to: dateRange[1].format('YYYYMMDD'),
      unresolvedOnly: statusFilter === 'unresolved',
      errLevel: levelFilter || undefined,
      code: codeSearch.trim() || undefined,
      page: 0,
      size: PAGE_SIZE,
    });
  }, [dateRange, statusFilter, levelFilter, codeSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    setParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const columnDefs: ColDef<FaultHistoryItem>[] = useMemo(
    () => [
      // 공통 defaultColDef 가 flex:1 이라 고정폭 컬럼은 flex:0 을 명시해야 width 가 적용된다.
      // 메시지만 flex 로 남는 폭을 차지하고, 발생시각은 잘리지 않게 고정폭 유지.
      {
        headerName: '발생시각',
        colId: 'occurredAt',
        width: 160,
        minWidth: 160,
        flex: 0,
        valueGetter: (p) => formatOccurredAt(p.data?.errDate, p.data?.errTime),
      },
      {
        headerName: '시스템',
        field: 'systemName',
        width: 150,
        flex: 0,
        valueFormatter: (p) => p.value ?? (p.data?.systemId != null ? `#${p.data.systemId}` : '-'),
      },
      { headerName: '노드', field: 'nodeName', width: 150, flex: 0, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '프로세스', field: 'processName', width: 100, minWidth: 90, flex: 0, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '오류코드', field: 'errCode', width: 95, minWidth: 90, flex: 0, cellClass: 'font-mono' },
      { headerName: '메시지', field: 'errMessage', flex: 1, minWidth: 320, tooltipField: 'errMessage' },
      {
        // 'Critical' 배지가 말줄임되지 않는 최소 폭
        headerName: '등급',
        field: 'errLevel',
        width: 110,
        minWidth: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<FaultHistoryItem>) => <LevelBadge level={p.value} />,
      },
      {
        headerName: '상태',
        field: 'errRepairTime',
        width: 100,
        minWidth: 95,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<FaultHistoryItem>) => <FaultStatusBadge repairTime={p.value} />,
      },
    ],
    [],
  );

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<FaultHistoryItem>) => {
    if (event.data) {
      drawerRef.current?.open(event.data);
    }
  };

  const handleSelectionChanged = (event: SelectionChangedEvent<FaultHistoryItem>) => {
    setSelectedItems(event.api.getSelectedRows().filter((row) => !row.errRepairTime));
  };

  const handleRecoverDone = useCallback(() => {
    gridRef.current?.api?.deselectAll();
    setSelectedItems([]);
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* 요약 스탯 — 발생 건수는 조회 기간 기준, Critical 이 가장 강조 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="장애 발생 건수" value={summary?.totalInPeriod} />
          <StatCard label="미복구" value={summary?.unresolved} accent="warn" />
          <StatCard label="미복구 Critical" value={summary?.unresolvedCritical} accent="danger" />
        </div>

        {/* 필터 */}
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex gap-2 items-center flex-nowrap">
            <RangePicker
              value={dateRange}
              onChange={(range) => {
                if (range?.[0] && range?.[1]) setDateRange([range[0], range[1]]);
              }}
              format="YYYY-MM-DD"
              allowClear={false}
              style={{ width: 250 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '미복구', value: 'unresolved' },
                { label: '전체', value: 'all' },
              ]}
              style={{ width: 90 }}
            />
            <Select
              value={levelFilter}
              onChange={setLevelFilter}
              options={[
                { label: '등급 전체', value: '' },
                { label: 'Minor', value: '1' },
                { label: 'Major', value: '2' },
                { label: 'Critical', value: '3' },
              ]}
              style={{ width: 110 }}
            />
            <Input
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              placeholder="오류코드 검색"
              prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
              style={{ width: 180 }}
              allowClear
              onPressEnter={handleSearch}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button danger disabled={selectedItems.length === 0} onClick={() => recoverModalRef.current?.open(selectedItems)}>
              강제복구{selectedItems.length > 0 ? ` ${selectedItems.length}건` : ''}
            </Button>
            <Button type="primary" onClick={handleSearch} loading={isFetching}>
              조회
            </Button>
          </div>
        </header>

        {/* 목록 */}
        <div className="flex flex-col w-full h-full">
          <div className="flex-1 w-full overflow-hidden">
            {isLoading ? (
              <FallbackSpinner />
            ) : (listData?.items?.length ?? 0) === 0 ? (
              <NoData message="장애 이력이 없습니다." iconSize={50} />
            ) : (
              <AgGridReact<FaultHistoryItem>
                ref={gridRef}
                rowData={listData?.items ?? []}
                columnDefs={columnDefs}
                gridOptions={{
                  ...gridOptions,
                  pagination: false,
                  statusBar: undefined,
                  // 강제복구 대상 선택 — 미복구(복구시각 없음) 행만 체크 가능 (AS-IS: 상태 '장애발생'만 허용)
                  rowSelection: { mode: 'multiRow', enableClickSelection: false, checkboxes: (p) => !p.data?.errRepairTime, headerCheckbox: false },
                }}
                loading={isFetching}
                onRowDoubleClicked={handleRowDoubleClick}
                onSelectionChanged={handleSelectionChanged}
                getRowId={(p) => String(p.data.errHistoryId)}
              />
            )}
          </div>
          {(listData?.total ?? 0) > 0 && <ServerPagination currentPage={currentPage} totalItems={listData?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={handlePageChange} />}
        </div>
      </div>
      <FaultHistoryDetailDrawer ref={drawerRef} />
      <FaultForceRecoverModal ref={recoverModalRef} onDone={handleRecoverDone} />
    </div>
  );
}
