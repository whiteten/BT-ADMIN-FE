/**
 * 트래킹 조회이력 페이지 — Manager 작업이력(WorkHistoryList) 패턴 준용.
 *
 * 단일 박스 안에 필터(좌) + 검색 버튼(우) header + 그리드.
 * 자동 조회 없음 — "검색" 버튼 클릭 시점에만 fetch.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import TrackingAuditDetailDrawer from './TrackingAuditDetailDrawer';
import { useGetTrackingAudits } from '../hooks/useTrackingAuditQueries';
import type { TrackingAudit, TrackingAuditAction, TrackingAuditSearchParams, TrackingMode } from '../types/trackingAudit.types';
import ServerPagination from '@/components/custom/ServerPagination';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const PAGE_SIZE = 50;

const breadcrumb = [
  { title: '콜 분석', path: '/ipron/tracking' },
  { title: '트래킹 조회이력', path: '/ipron/tracking-audit' },
];

const ACTION_BADGE_META: Record<TrackingAuditAction, { label: string; cls: string }> = {
  SEARCH: { label: '검색', cls: 'text-blue-600 bg-blue-50' },
  EXPORT: { label: '다운로드', cls: 'text-amber-600 bg-amber-50' },
  DETAIL_VIEW: { label: '상세조회', cls: 'text-purple-600 bg-purple-50' },
};

function actionLabel(action: TrackingAuditAction): string {
  return ACTION_BADGE_META[action]?.label ?? action;
}

function ActionBadge({ action }: { action: TrackingAuditAction }) {
  const m = ACTION_BADGE_META[action] ?? { label: action, cls: 'text-gray-500 bg-gray-100' };
  return (
    <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${m.cls}`}>
      {m.label}
    </Badge>
  );
}

export default function TrackingAuditPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();

  // 필터 입력값 — from/to 분리 (DatePicker + 시간 포함)
  const [fromDt, setFromDt] = useState<dayjs.Dayjs>(dayjs().subtract(7, 'day').startOf('day'));
  const [toDt, setToDt] = useState<dayjs.Dayjs>(dayjs().endOf('day'));
  const [actionType, setActionType] = useState<TrackingAuditAction | ''>('');
  const [trackingMode, setTrackingMode] = useState<TrackingMode | ''>('');
  const [keyword, setKeyword] = useState<string>('');

  // applied: 검색 버튼 클릭 시점에만 set (null = 자동 조회 안 함)
  const [applied, setApplied] = useState<TrackingAuditSearchParams | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSearch = useCallback(() => {
    setCurrentPage(0);
    setApplied({
      actionType: actionType || null,
      trackingMode: trackingMode || null,
      from: fromDt.toISOString(),
      to: toDt.toISOString(),
      keyword: keyword.trim() || null,
      page: 0,
      size: PAGE_SIZE,
    });
    // 같은 조건으로 다시 눌러도 강제 refetch (React Query cache hit 회피)
    queryClient.invalidateQueries({ queryKey: ['tracking-audit', 'list'] });
  }, [fromDt, toDt, actionType, trackingMode, keyword, queryClient]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    setApplied((prev) => (prev ? { ...prev, page: newPage } : prev));
  }, []);

  const handleFromChange = useCallback(
    (d: dayjs.Dayjs | null) => {
      if (!d) return;
      setFromDt(d);
      if (d.isAfter(toDt)) setToDt(d);
    },
    [toDt],
  );

  const handleToChange = useCallback(
    (d: dayjs.Dayjs | null) => {
      if (!d) return;
      setToDt(d);
      if (d.isBefore(fromDt)) setFromDt(d);
    },
    [fromDt],
  );

  const listQ = useGetTrackingAudits(applied);
  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;

  const columnDefs = useMemo<ColDef<TrackingAudit>[]>(
    () => [
      {
        headerName: '시각',
        field: 'workTime',
        width: 160,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
        sort: 'desc',
      },
      { headerName: '사용자', valueGetter: (p) => p.data?.userName ?? `#${p.data?.userId ?? ''}`, width: 90 },
      {
        headerName: '액션',
        field: 'actionType',
        width: 75,
        headerClass: 'ag-center-header',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: { value: TrackingAuditAction }) => (p.value ? <ActionBadge action={p.value} /> : '-'),
        filterValueGetter: ({ data }) => (data?.actionType ? actionLabel(data.actionType) : ''),
      },
      { headerName: '실제 액션', field: 'criteriaSummary', flex: 1, minWidth: 280, tooltipField: 'criteriaSummary' },
      {
        headerName: '결과',
        field: 'resultCount',
        width: 75,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : '-'),
      },
      { headerName: '사유', field: 'reason', flex: 2, minWidth: 320, tooltipField: 'reason' },
      {
        headerName: '승인',
        field: 'approvalStatus',
        width: 65,
        headerClass: 'ag-center-header',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        valueFormatter: (p) => (p.value && p.value !== 'NONE' ? p.value : '-'),
      },
    ],
    [],
  );

  const handleRowClicked = (e: RowClickedEvent<TrackingAudit>) => {
    if (e.data?.auditId == null) return;
    setSelected(e.data.auditId);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex gap-2 items-center flex-nowrap">
            <DatePicker
              value={fromDt}
              onChange={handleFromChange}
              format="YYYY-MM-DD HH:mm"
              showTime={{ format: 'HH:mm' }}
              style={{ width: 180 }}
              allowClear={false}
              disabledDate={(c) => c && c > dayjs().endOf('day')}
              placeholder="From"
            />
            <span className="text-gray-400">~</span>
            <DatePicker
              value={toDt}
              onChange={handleToChange}
              format="YYYY-MM-DD HH:mm"
              showTime={{ format: 'HH:mm' }}
              style={{ width: 180 }}
              allowClear={false}
              disabledDate={(c) => c && c > dayjs().endOf('day')}
              placeholder="To"
            />
            <Select
              value={actionType}
              onChange={(v) => setActionType(v as TrackingAuditAction | '')}
              options={[
                { label: '액션', value: '' },
                { label: '검색', value: 'SEARCH' },
                { label: '다운로드', value: 'EXPORT' },
                { label: '상세조회', value: 'DETAIL_VIEW' },
              ]}
              style={{ width: 110 }}
            />
            <Select
              value={trackingMode}
              onChange={(v) => setTrackingMode(v as TrackingMode | '')}
              options={[
                { label: '모드', value: '' },
                { label: 'PBX', value: 'PBX_FRONT' },
                { label: 'IVR', value: 'IVR_FRONT' },
                { label: 'CTI', value: 'CTI_FRONT' },
              ]}
              style={{ width: 100 }}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="요약/UCID/사유"
              prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
              style={{ width: 220 }}
              allowClear
              onPressEnter={handleSearch}
            />
            {applied && <span className="text-[12px] text-gray-500 ml-2">총 {total.toLocaleString()}건</span>}
          </div>
          <Button type="primary" onClick={handleSearch} loading={listQ.isFetching}>
            조회
          </Button>
        </header>

        <div className="flex flex-col w-full h-full">
          <div className="flex-1 w-full overflow-hidden">
            <AgGridReact<TrackingAudit>
              rowData={items}
              columnDefs={columnDefs}
              gridOptions={{ ...gridOptions, pagination: false, statusBar: undefined }}
              loading={listQ.isFetching}
              onRowClicked={handleRowClicked}
              tooltipShowDelay={300}
            />
          </div>
          {total > 0 && <ServerPagination currentPage={currentPage} totalItems={total} pageSize={PAGE_SIZE} onPageChange={handlePageChange} />}
        </div>
      </div>
      <TrackingAuditDetailDrawer open={drawerOpen} auditId={selected} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
