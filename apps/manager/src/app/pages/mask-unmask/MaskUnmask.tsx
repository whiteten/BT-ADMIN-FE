/**
 * 마스킹 해지 요청 페이지 (사용자/관리자 통합)
 *
 * - 탭 1: 검토 필요 (관리자만 — 본인 권한 카테고리에 해당하는 PENDING)
 * - 탭 2: 내 요청 (요청자 본인 이력)
 * - 탭 3: 감사 로그 (권한 보유 시)
 *
 * 상단 KPI 5개 + 본문은 단일 흰색 박스 안에 탭 헤더 + 그리드 구조.
 */
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Empty, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { ClipboardList, ScrollText, Search, ShieldCheck, User } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetCategories } from '../../features/mask-policy/hooks/useMaskPolicyQueries';
import MaskUnmaskReviewDrawer, { type MaskUnmaskReviewDrawerRef } from '../../features/mask-unmask/components/MaskUnmaskReviewDrawer';
import { useGetAudit, useGetMyRequests, useGetPendingRequests, useRevokeUnmask } from '../../features/mask-unmask/hooks/useMaskUnmaskQueries';
import { AUDIT_ACTION_BADGE_CLASS, type MaskAudit, type MaskUnmaskRequest, STATUS_BADGE_CLASS, STATUS_LABELS, TARGET_TYPE_LABELS } from '../../features/mask-unmask/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '설정', path: '/manager/resource/mask-unmask' },
  { title: '보안', path: '/manager/resource/mask-unmask' },
  { title: '마스킹 해지 요청', path: '/manager/resource/mask-unmask' },
];

type TabKey = 'pending' | 'my' | 'audit';

/** 상대 시각 표시 — '5분 전' / '14:23' / '어제 16:42' */
function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - t) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return dayjs(iso).format('HH:mm');
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return `어제 ${dayjs(iso).format('HH:mm')}`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return dayjs(iso).format('MM-DD HH:mm');
}

/** 만료까지 남은 시간 — '42분 후 만료' / '3일 전 만료' */
function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '-';
  const t = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMin = Math.round((t - now) / 60000);
  if (diffMin <= 0) return `${Math.round(-diffMin / 60 / 24) || 1}일 전 만료`;
  if (diffMin < 60) return `${diffMin}분 후 만료`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 후 만료`;
  return dayjs(expiresAt).format('MM-DD HH:mm');
}

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  variant?: 'default' | 'amber' | 'emerald' | 'red';
}

function KpiCard({ label, value, unit = '건', hint, variant = 'default' }: KpiCardProps) {
  const valueColor = {
    default: 'text-gray-900',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
  }[variant];
  return (
    <div className="bg-white bt-shadow rounded-md border border-gray-200 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`text-[20px] font-semibold ${valueColor}`}>{value}</span>
        <span className="text-[12px] text-gray-400">{unit}</span>
      </div>
      {hint && <div className="text-[10px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function MaskUnmask() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const reviewDrawerRef = useRef<MaskUnmaskReviewDrawerRef>(null);

  // ─── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: categories = [] } = useGetCategories();
  const { data: pendingRequests = [], isLoading: isPendingLoading } = useGetPendingRequests({
    status: 'PENDING',
    category: filterCategory,
  });
  const { data: myRequests = [], isLoading: isMyLoading } = useGetMyRequests();
  const { data: audits = [], isLoading: isAuditLoading } = useGetAudit({}, activeTab === 'audit');

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: revokeUnmask } = useRevokeUnmask({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해지 요청이 회수되었습니다.');
      },
    },
  });

  // ─── Derived: 검색 필터 ────────────────────────────────────────────────────
  const filterByText = useCallback(
    <T extends { reason?: string; requesterName?: string | null; targetId?: string }>(list: T[]): T[] => {
      if (!searchText.trim()) return list;
      const kw = searchText.trim().toLowerCase();
      return list.filter((item) => {
        return item.reason?.toLowerCase().includes(kw) || item.requesterName?.toLowerCase().includes(kw) || item.targetId?.toLowerCase().includes(kw);
      });
    },
    [searchText],
  );

  const filteredPending = useMemo(() => filterByText(pendingRequests), [pendingRequests, filterByText]);
  const filteredMy = useMemo(() => filterByText(myRequests), [myRequests, filterByText]);

  // ─── KPI 계산 ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayApproved = audits.filter((a) => a.action === 'APPROVE' && dayjs(a.occurredAt).format('YYYY-MM-DD') === today).length;
    const todayRejected = audits.filter((a) => a.action === 'REJECT' && dayjs(a.occurredAt).format('YYYY-MM-DD') === today).length;
    const activeTokens = myRequests.filter((r) => {
      if (r.status !== 'APPROVED' || !r.expiresAt) return false;
      return new Date(r.expiresAt).getTime() > Date.now();
    }).length;
    const urgentCount = pendingRequests.filter((r) => r.urgent === 1).length;
    return {
      pendingCount: pendingRequests.length,
      todayApproved,
      todayRejected,
      activeTokens,
      myCount: myRequests.length,
      urgentCount,
    };
  }, [pendingRequests, myRequests, audits]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleReview = useCallback(
    (req: MaskUnmaskRequest) => {
      const cat = categories.find((c) => c.category === req.category);
      reviewDrawerRef.current?.open(req, cat?.maxHours);
    },
    [categories],
  );

  const handleRevoke = useCallback(
    (req: MaskUnmaskRequest) => {
      modal.confirm.execute({
        onOk: () => revokeUnmask(req.requestId),
        options: {
          title: '해지 요청 회수',
          content: '해지 요청을 회수하시겠습니까?\n승인된 토큰은 즉시 무효화됩니다.',
        },
      });
    },
    [modal, revokeUnmask],
  );

  // 진입 시 한 번만: pending 0건이면 my 탭으로 전환 (사용자 시나리오 우선)
  const didAutoSwitchRef = useRef(false);
  useEffect(() => {
    if (didAutoSwitchRef.current) return;
    if (isPendingLoading) return;
    didAutoSwitchRef.current = true;
    if (pendingRequests.length === 0) {
      setActiveTab('my');
    }
  }, [isPendingLoading, pendingRequests.length]);

  // ─── ag-Grid columns: 검토 필요 ───────────────────────────────────────────
  const pendingColumns: ColDef<MaskUnmaskRequest>[] = useMemo(
    () => [
      {
        headerName: '요청 시각',
        field: 'requestedAt',
        width: 140,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => (p.data ? formatRelative(p.data.requestedAt) : null),
      },
      {
        headerName: '요청자',
        field: 'requesterName',
        flex: 1,
        minWidth: 120,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data ? (
            <span>
              {p.data.requesterName ?? `User#${p.data.requesterUserId}`}
              {p.data.requesterDept && <span className="text-[10px] text-gray-400 ml-1">{p.data.requesterDept}</span>}
            </span>
          ) : null,
      },
      {
        headerName: '카테고리',
        field: 'category',
        width: 120,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data ? <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p.data.category}</span> : null,
      },
      {
        headerName: '대상',
        flex: 1,
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data ? (
            <span className="text-[11px] text-gray-700">
              <span className="text-gray-500">{TARGET_TYPE_LABELS[p.data.targetType]} · </span>
              <span className="font-mono">{p.data.targetId}</span>
            </span>
          ) : null,
      },
      {
        headerName: '사유',
        field: 'reason',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => (p.data ? <span className="text-[11px] text-gray-700">{p.data.reason}</span> : null),
      },
      {
        headerName: '요청 시간',
        field: 'requestedHours',
        width: 90,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => (p.data ? `${p.data.requestedHours}h` : null),
      },
      {
        headerName: '긴급',
        field: 'urgent',
        width: 80,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data?.urgent === 1 ? <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">긴급</span> : <span className="text-gray-300">-</span>,
      },
      {
        headerName: '',
        colId: 'actions',
        width: 130,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellClass: 'flex items-center justify-end gap-1',
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => {
          if (!p.data) return null;
          return (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleReview(p.data!);
              }}
            >
              검토
            </Button>
          );
        },
      },
    ],
    [handleReview],
  );

  // ─── ag-Grid columns: 내 요청 ─────────────────────────────────────────────
  const myColumns: ColDef<MaskUnmaskRequest>[] = useMemo(
    () => [
      {
        headerName: '요청 시각',
        field: 'requestedAt',
        width: 140,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => (p.data ? formatRelative(p.data.requestedAt) : null),
      },
      {
        headerName: '카테고리',
        field: 'category',
        width: 120,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data ? <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p.data.category}</span> : null,
      },
      {
        headerName: '대상',
        flex: 1,
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) =>
          p.data ? (
            <span className="text-[11px] text-gray-700">
              <span className="text-gray-500">{TARGET_TYPE_LABELS[p.data.targetType]} · </span>
              <span className="font-mono">{p.data.targetId}</span>
            </span>
          ) : null,
      },
      {
        headerName: '사유',
        field: 'reason',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => (p.data ? <span className="text-[11px] text-gray-700">{p.data.reason}</span> : null),
      },
      {
        headerName: '상태',
        field: 'status',
        width: 110,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => {
          if (!p.data) return null;
          const cls = STATUS_BADGE_CLASS[p.data.status];
          return <span className={`text-[11px] px-1.5 py-0.5 rounded ${cls}`}>{STATUS_LABELS[p.data.status]}</span>;
        },
      },
      {
        headerName: '승인자',
        field: 'approverName',
        width: 120,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => p.data?.approverName ?? <span className="text-gray-300">-</span>,
      },
      {
        headerName: '만료/처리',
        flex: 1,
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => {
          if (!p.data) return null;
          if (p.data.status === 'APPROVED' && p.data.expiresAt) {
            return <span className="text-[11px] text-emerald-700 font-medium">{formatExpiry(p.data.expiresAt)}</span>;
          }
          if (p.data.status === 'REJECTED') {
            return <span className="text-[11px] text-gray-500">{p.data.approverComment ?? '반려됨'}</span>;
          }
          if (p.data.status === 'EXPIRED' && p.data.expiresAt) {
            return <span className="text-[11px] text-gray-400">{dayjs(p.data.expiresAt).format('YYYY-MM-DD HH:mm')} 만료</span>;
          }
          if (p.data.status === 'PENDING') {
            return <span className="text-[11px] text-gray-500">검토 중</span>;
          }
          return <span className="text-gray-300">-</span>;
        },
      },
      {
        headerName: '',
        colId: 'actions',
        width: 100,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellClass: 'flex items-center justify-end gap-1',
        cellRenderer: (p: ICellRendererParams<MaskUnmaskRequest>) => {
          if (!p.data) return null;
          // PENDING — 취소(회수) 가능
          if (p.data.status === 'PENDING' || p.data.status === 'APPROVED') {
            return (
              <Button
                size="small"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevoke(p.data!);
                }}
              >
                회수
              </Button>
            );
          }
          return <span className="text-gray-300 text-[11px]">-</span>;
        },
      },
    ],
    [handleRevoke],
  );

  // ─── ag-Grid columns: 감사 로그 ───────────────────────────────────────────
  const auditColumns: ColDef<MaskAudit>[] = useMemo(
    () => [
      {
        headerName: '발생 시각',
        field: 'occurredAt',
        width: 160,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) =>
          p.data ? <span className="font-mono text-[11px]">{dayjs(p.data.occurredAt).format('YYYY-MM-DD HH:mm:ss')}</span> : null,
      },
      {
        headerName: '사용자',
        field: 'userName',
        width: 120,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) => p.data?.userName ?? `User#${p.data?.userId ?? '-'}`,
      },
      {
        headerName: '액션',
        field: 'action',
        width: 130,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) => {
          if (!p.data) return null;
          const cls = AUDIT_ACTION_BADGE_CLASS[p.data.action];
          return <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{p.data.action}</span>;
        },
      },
      {
        headerName: '카테고리',
        field: 'category',
        width: 120,
      },
      {
        headerName: '대상',
        flex: 1,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) => {
          if (!p.data) return null;
          if (!p.data.targetType || !p.data.targetId) return <span className="text-gray-300">-</span>;
          return (
            <span className="text-[11px] text-gray-700">
              <span className="text-gray-500">{TARGET_TYPE_LABELS[p.data.targetType]} · </span>
              <span className="font-mono">{p.data.targetId}</span>
            </span>
          );
        },
      },
      {
        headerName: '필드',
        field: 'fieldName',
        width: 140,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) => p.data?.fieldName ?? <span className="text-gray-300">-</span>,
      },
      {
        headerName: 'IP',
        field: 'ipAddress',
        width: 130,
        cellRenderer: (p: ICellRendererParams<MaskAudit>) =>
          p.data?.ipAddress ? <span className="font-mono text-[11px]">{p.data.ipAddress}</span> : <span className="text-gray-300">-</span>,
      },
    ],
    [],
  );

  // ─── 카테고리 옵션 ────────────────────────────────────────────────────────
  const categoryFilterOptions = useMemo(() => categories.map((c) => ({ value: c.category, label: `${c.category} — ${c.label}` })), [categories]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* KPI 5개 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-shrink-0">
        <KpiCard label="검토 필요" value={kpi.pendingCount} variant="amber" hint={kpi.urgentCount > 0 ? `긴급 처리 ${kpi.urgentCount}건` : undefined} />
        <KpiCard label="오늘 승인" value={kpi.todayApproved} variant="emerald" />
        <KpiCard label="오늘 반려" value={kpi.todayRejected} variant="red" />
        <KpiCard label="활성 해지 토큰" value={kpi.activeTokens} />
        <KpiCard label="내 요청" value={kpi.myCount} />
      </div>

      {/* 본문: 탭 헤더 + 그리드 */}
      <div className="flex-1 flex flex-col bg-white bt-shadow rounded-md border border-gray-200 overflow-hidden">
        {/* 탭 헤더 */}
        <div className="h-[56px] bg-[#f8f9fb] border-b-2 border-gray-200 flex items-center pr-3 flex-shrink-0">
          <div className="flex items-stretch divide-x divide-gray-200">
            <TabButton
              active={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              icon={<ClipboardList className="size-3.5" />}
              label="검토 필요"
              count={kpi.pendingCount}
              countColor="text-amber-600"
            />
            <TabButton active={activeTab === 'my'} onClick={() => setActiveTab('my')} icon={<User className="size-3.5" />} label="내 요청" count={kpi.myCount} />
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ScrollText className="size-3.5" />} label="감사 로그" count={audits.length} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select
              size="middle"
              value={filterCategory ?? undefined}
              placeholder="모든 카테고리"
              allowClear
              onChange={(v) => setFilterCategory(v ?? undefined)}
              options={categoryFilterOptions}
              style={{ width: 200 }}
            />
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="요청자/사유/대상 검색"
              value={searchText}
              onChange={handleSearchChange}
              style={{ width: 220 }}
            />
          </div>
        </div>

        {/* 탭 1: 검토 필요 */}
        {activeTab === 'pending' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1">
              {filteredPending.length === 0 && !isPendingLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <ShieldCheck className="size-10 text-gray-300" />
                  <span className="text-sm">검토 대기 중인 요청이 없습니다</span>
                </div>
              ) : (
                <AgGridReact<MaskUnmaskRequest>
                  rowData={filteredPending}
                  columnDefs={pendingColumns}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                  }}
                  loading={isPendingLoading}
                  getRowId={(p) => String(p.data.requestId)}
                  defaultColDef={{
                    filter: true,
                    sortable: true,
                    suppressHeaderMenuButton: true,
                    resizable: true,
                  }}
                  onRowDoubleClicked={(e) => {
                    if (e.data) handleReview(e.data);
                  }}
                />
              )}
            </div>
            <div className="px-4 py-2 bg-amber-50/60 border-t border-amber-100 text-[11px] text-amber-800 flex-shrink-0">
              <strong>자기 승인 금지</strong> — 본인이 요청한 건은 다른 승인자가 처리해야 합니다 (감사 무결성).
            </div>
          </div>
        )}

        {/* 탭 2: 내 요청 */}
        {activeTab === 'my' && (
          <div className="flex-1">
            {filteredMy.length === 0 && !isMyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">요청 이력이 없습니다</span>
              </div>
            ) : (
              <AgGridReact<MaskUnmaskRequest>
                rowData={filteredMy}
                columnDefs={myColumns}
                gridOptions={{
                  ...gridOptions,
                  statusBar: undefined,
                  pagination: false,
                  sideBar: false,
                }}
                loading={isMyLoading}
                getRowId={(p) => String(p.data.requestId)}
                defaultColDef={{
                  filter: true,
                  sortable: true,
                  suppressHeaderMenuButton: true,
                  resizable: true,
                }}
              />
            )}
          </div>
        )}

        {/* 탭 3: 감사 로그 */}
        {activeTab === 'audit' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-[11px] text-blue-900 flex items-center gap-2 flex-shrink-0">
              <ShieldCheck className="size-3.5" />
              감사 로그 보존 정책: <strong>3년</strong>. 권한 보유자만 조회 가능하며 모든 조회 행위가 기록됩니다.
            </div>
            <div className="flex-1">
              {audits.length === 0 && !isAuditLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} />
                  <span className="text-sm">감사 로그가 없습니다</span>
                </div>
              ) : (
                <AgGridReact<MaskAudit>
                  rowData={audits}
                  columnDefs={auditColumns}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                  }}
                  loading={isAuditLoading}
                  getRowId={(p) => String(p.data.auditId)}
                  defaultColDef={{
                    filter: true,
                    sortable: true,
                    suppressHeaderMenuButton: true,
                    resizable: true,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 검토 Drawer */}
      <MaskUnmaskReviewDrawer
        ref={reviewDrawerRef}
        onSuccess={() => {
          /* invalidation은 hook에서 자동 처리 */
        }}
      />
    </div>
  );
}

/** 탭 버튼 — 회선관리 카드 슬라이더 표준의 탭 패턴 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count: number;
  countColor?: string;
}

function TabButton({ active, onClick, icon, label, count, countColor }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-[160px] flex-shrink-0 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-[1px] flex items-center justify-center gap-2 transition-colors ${
        active ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      <span className={`text-[11px] flex-shrink-0 ${countColor ?? 'text-gray-400'}`}>{count}</span>
    </button>
  );
}
