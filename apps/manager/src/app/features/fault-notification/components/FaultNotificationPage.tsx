/**
 * 통보 관리 (장애통보 관리) — 리뉴얼 D안 v3: 대상-시스템 페어 모델 + 제외코드 (AS-IS: SWAT IPR60S2010).
 *
 * <p>레이아웃: 상단 통보 대상 마스터 그리드(인라인 필터 + 등록/수정 Drawer/삭제/일시정지 토글) +
 * 하단 선택 대상의 2그리드(통보 시스템 발송 토글 / 제외코드 추가·해제) — AcsServicePage 골격.</p>
 *
 * <p>모든 변경은 액션 단위 즉시 반영(저장 버튼·스테이징 없음) — 성공/실패 toast + TanStack Query invalidate.</p>
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Popconfirm, Select, Switch } from 'antd';
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import ExceptCodePickerModal, { type ExceptCodePickerModalRef } from './ExceptCodePickerModal';
import TargetEditDrawer, { type TargetEditDrawerRef } from './TargetEditDrawer';
import { BADGE_CLASS, CONTACT_EMPTY_BADGE_CLASS, DEFAULT_BADGE_CLASS, ERR_TYPE_BADGE_CLASS } from '../constants/faultNotificationConstants';
import {
  faultNotificationQueryKeys,
  useDeleteExceptCode,
  useDeleteNotiTarget,
  useGetExceptCodes,
  useGetNotiSystems,
  useGetNotiTargets,
  useSyncNotiSystems,
  useToggleNotiSystem,
  useUpdateNotiTarget,
} from '../hooks/useFaultNotificationQueries';
import type { ExceptCode, NotiSystem, NotiTarget } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '시스템', path: '/manager/fault/notification' },
  { title: '장애관리', path: '/manager/fault/notification' },
  { title: '통보 관리', path: '/manager/fault/notification' },
];

/** 통보 상태 필터 값 */
const STATUS_FILTER_OPTIONS = [
  { label: '통보 상태 전체', value: 'all' },
  { label: '통보 중', value: 'active' },
  { label: '일시정지', value: 'stopped' },
];

/** 연락 채널 셀 — 미등록이면 amber '없음' 뱃지 (가짜 기본값 저장 금지 규약의 표시면) */
function ContactCell({ value, mono }: { value?: string | null; mono?: boolean }) {
  if (!value) return <Badge className={cn(BADGE_CLASS, CONTACT_EMPTY_BADGE_CLASS)}>없음</Badge>;
  return <span className={mono ? 'font-mono text-xs' : undefined}>{value}</span>;
}

export default function FaultNotificationPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  const [selectedTarget, setSelectedTarget] = useState<NotiTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped'>('all');
  const [sysClassFilter, setSysClassFilter] = useState('');

  const drawerRef = useRef<TargetEditDrawerRef>(null);
  const pickerRef = useRef<ExceptCodePickerModalRef>(null);

  const { data: targets = [], isFetching } = useGetNotiTargets();

  const { data: systems = [], isFetching: isSystemFetching } = useGetNotiSystems({
    params: selectedTarget ? { targetId: selectedTarget.notiTargetId } : undefined,
    queryOptions: { enabled: !!selectedTarget },
  });

  const { data: exceptCodes = [], isFetching: isExceptFetching } = useGetExceptCodes({
    params: selectedTarget ? { targetId: selectedTarget.notiTargetId } : undefined,
    queryOptions: { enabled: !!selectedTarget },
  });

  const targetsQueryKey = faultNotificationQueryKeys.getNotiTargets().queryKey;
  const invalidateTargets = () => queryClient.invalidateQueries({ queryKey: targetsQueryKey });

  // 일시정지 토글 — 낙관적 업데이트로 Switch 즉시 반영 (AcsServicePage useUpdateAcsServiceUse 패턴)
  const { mutate: updateTargetMutate } = useUpdateNotiTarget({
    mutationOptions: {
      onMutate: async ({ targetId, data }) => {
        await queryClient.cancelQueries({ queryKey: targetsQueryKey });
        const previous = queryClient.getQueryData<NotiTarget[]>(targetsQueryKey);
        queryClient.setQueryData<NotiTarget[]>(targetsQueryKey, (old) => old?.map((t) => (t.notiTargetId === targetId ? { ...t, ...data } : t)));
        return { previous };
      },
      // 토글 결과는 Switch 상태로 충분해 성공 토스트는 띄우지 않는다
      onError: (err, _vars, context) => {
        const ctx = context as { previous?: NotiTarget[] } | undefined;
        if (ctx?.previous) queryClient.setQueryData(targetsQueryKey, ctx.previous);
        toast.error(`변경 실패: ${(err as Error).message ?? '오류'}`);
      },
      onSettled: () => invalidateTargets(),
    },
  });

  const { mutate: deleteTargetMutate } = useDeleteNotiTarget({
    mutationOptions: {
      onSuccess: (_data, targetId) => {
        toast.success('통보 대상을 삭제했습니다.');
        if (selectedTarget?.notiTargetId === targetId) setSelectedTarget(null);
        invalidateTargets();
      },
      onError: (err) => toast.error(`삭제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  // 발송 토글 — 페어 행 stopped UPDATE, 낙관적 업데이트로 즉시 반영
  const { mutate: toggleSystemMutate } = useToggleNotiSystem({
    mutationOptions: {
      onMutate: async (vars) => {
        const key = faultNotificationQueryKeys.getNotiSystems({ targetId: vars.targetId }).queryKey;
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<NotiSystem[]>(key);
        queryClient.setQueryData<NotiSystem[]>(key, (old) =>
          old?.map((s) => (s.sysClassCd === vars.sysClassCd && s.systemId === vars.systemId ? { ...s, stopped: vars.stopped } : s)),
        );
        return { previous, key };
      },
      onError: (err, _vars, context) => {
        const ctx = context as { previous?: NotiSystem[]; key?: typeof targetsQueryKey } | undefined;
        if (ctx?.previous && ctx.key) queryClient.setQueryData(ctx.key, ctx.previous);
        toast.error(`변경 실패: ${(err as Error).message ?? '오류'}`);
      },
      onSettled: (_data, _err, vars) => {
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNotiSystems({ targetId: vars.targetId }).queryKey });
        invalidateTargets(); // 통보 현황(활성/전체 카운트) 갱신
      },
    },
  });

  // 새 시스템 반영 — 등록 이후 추가된 시스템·모듈을 페어로 보충 (멱등, BE 신규 엔드포인트)
  const syncSystemsMutation = useSyncNotiSystems({
    mutationOptions: {
      onSuccess: (addedCount, targetId) => {
        if (addedCount > 0) {
          toast.success(`새 시스템 페어 ${addedCount}건을 추가했습니다`);
          queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNotiSystems({ targetId }).queryKey });
          invalidateTargets(); // 통보 현황(활성/전체 카운트) 갱신
        } else {
          toast.info('추가할 새 시스템이 없습니다');
        }
      },
      onError: (err) => toast.error(`새 시스템 반영 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: deleteExceptMutate } = useDeleteExceptCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('제외를 해제했습니다 — 이 코드 장애가 다시 발송됩니다.');
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getExceptCodes._def });
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNoticeCodes._def });
        invalidateTargets(); // 통보 현황(제외코드 카운트) 갱신
      },
      onError: (err) => toast.error(`해제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  // ─── 필터링 (client-side fuzzy — add-search 규약) ───
  const statusFiltered = targets.filter((t) => {
    if (statusFilter === 'all') return true;
    return statusFilter === 'stopped' ? t.stopped : !t.stopped;
  });
  const filteredTargets = fuzzyFilter(searchQuery, statusFiltered, (t) => `${t.notiTargetId} ${t.notiTargetName} ${t.phoneNo ?? ''} ${t.email ?? ''} ${t.smsId ?? ''}`);
  const stoppedCount = targets.filter((t) => t.stopped).length;

  const filteredSystems = sysClassFilter ? systems.filter((s) => s.sysClassCd === sysClassFilter) : systems;
  const sysClassOptions = [
    { label: '분류 전체', value: '' },
    ...[...new Map(systems.map((s) => [s.sysClassCd, s.sysClassName])).entries()].map(([value, label]) => ({ label: label ?? value, value })),
  ];

  const handleSelectTarget = (target: NotiTarget) => {
    setSelectedTarget(target);
    setSysClassFilter('');
  };

  // ─── 컬럼 정의 ───
  const targetColumnDefs: ColDef<NotiTarget>[] = [
    { headerName: '통보 대상 ID', field: 'notiTargetId', width: 150, minWidth: 130, cellClass: 'font-medium' },
    { headerName: '이름', field: 'notiTargetName', width: 160, minWidth: 130 },
    {
      headerName: '전화번호',
      field: 'phoneNo',
      width: 150,
      minWidth: 130,
      cellRenderer: (p: ICellRendererParams<NotiTarget>) => (p.data ? <ContactCell value={p.data.phoneNo} /> : null),
    },
    {
      headerName: '이메일',
      field: 'email',
      flex: 1,
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<NotiTarget>) => (p.data ? <ContactCell value={p.data.email} /> : null),
    },
    {
      headerName: 'SMS_ID',
      field: 'smsId',
      width: 130,
      minWidth: 110,
      cellRenderer: (p: ICellRendererParams<NotiTarget>) => (p.data ? <ContactCell value={p.data.smsId} mono /> : null),
    },
    {
      headerName: '통보 현황',
      colId: 'summary',
      width: 190,
      minWidth: 170,
      sortable: false,
      valueGetter: (p) => (p.data ? `시스템 ${p.data.activeSystemCount}/${p.data.totalSystemCount} · 제외코드 ${p.data.excludedCodeCount}` : ''),
    },
    {
      // 하단 통보 시스템 그리드의 발송 Switch 와 동일 UX — 켜짐 = 발송 중(!stopped), 꺼짐 = 일시정지
      headerName: '발송',
      field: 'stopped',
      width: 80,
      minWidth: 75,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<NotiTarget>) =>
        p.data ? (
          <Switch
            size="small"
            checked={!p.data.stopped}
            onChange={(checked, e) => {
              e?.stopPropagation();
              updateTargetMutate({
                targetId: p.data!.notiTargetId,
                // notiTargetName 은 NOT NULL 필수 필드 — 누락 시 400
                data: { notiTargetName: p.data!.notiTargetName, phoneNo: p.data!.phoneNo, email: p.data!.email, smsId: p.data!.smsId, stopped: !checked },
              });
            }}
          />
        ) : null,
    },
    {
      headerName: '관리',
      colId: 'actions',
      width: 70,
      minWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: ICellRendererParams<NotiTarget>) =>
        p.data ? (
          <Popconfirm
            title={`'${p.data.notiTargetId}' 대상을 삭제할까요? 통보 시스템 페어·제외코드도 함께 삭제됩니다.`}
            okText="삭제"
            cancelText="취소"
            onConfirm={() => deleteTargetMutate(p.data!.notiTargetId)}
          >
            <button type="button" title="삭제" onClick={(e) => e.stopPropagation()}>
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          </Popconfirm>
        ) : null,
    },
  ];

  const systemColumnDefs: ColDef<NotiSystem>[] = [
    {
      headerName: '분류',
      field: 'sysClassCd',
      width: 220,
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<NotiSystem>) =>
        p.data ? (
          <div className="flex items-center gap-1.5">
            <span>{p.data.sysClassName ?? '-'}</span>
            <Badge className={cn(BADGE_CLASS, DEFAULT_BADGE_CLASS)}>{p.data.sysClassCd}</Badge>
          </div>
        ) : null,
    },
    { headerName: '시스템 ID', field: 'systemId', width: 100, minWidth: 90, cellClass: 'font-mono' },
    {
      headerName: '시스템명',
      field: 'systemName',
      flex: 1,
      minWidth: 160,
      cellRenderer: (p: ICellRendererParams<NotiSystem>) => {
        if (!p.data) return null;
        const sub = [p.data.systemAlias, p.data.nodeName].filter(Boolean).join(' · ');
        return (
          <span>
            <span className="font-medium">{p.data.systemName ?? '-'}</span>
            {sub && <span className="text-xs text-gray-400 ml-1.5">{sub}</span>}
          </span>
        );
      },
    },
    {
      headerName: '발송',
      field: 'stopped',
      width: 80,
      minWidth: 75,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<NotiSystem>) =>
        p.data && selectedTarget ? (
          <Switch
            size="small"
            checked={!p.data.stopped}
            onChange={(checked) => toggleSystemMutate({ targetId: selectedTarget.notiTargetId, sysClassCd: p.data!.sysClassCd, systemId: p.data!.systemId, stopped: !checked })}
          />
        ) : null,
    },
  ];

  const exceptColumnDefs: ColDef<ExceptCode>[] = [
    {
      headerName: '분류',
      field: 'categoryCd',
      width: 150,
      minWidth: 120,
      valueGetter: (p) => (p.data ? `${p.data.categoryName ?? '-'}(${p.data.categoryCd})` : ''),
    },
    { headerName: '발신코드', field: 'errCode', width: 95, minWidth: 90, cellClass: 'font-mono' },
    { headerName: '발신코드명', field: 'errName', flex: 1, minWidth: 130, valueFormatter: (p) => p.value ?? '-' },
    {
      headerName: '타입',
      field: 'errType',
      width: 85,
      minWidth: 80,
      cellRenderer: (p: ICellRendererParams<ExceptCode>) =>
        p.data?.errType ? <Badge className={cn(BADGE_CLASS, ERR_TYPE_BADGE_CLASS[p.data.errType] ?? DEFAULT_BADGE_CLASS)}>{p.data.errType}</Badge> : '-',
    },
    { headerName: '등록', field: 'workTime', width: 150, minWidth: 130, valueFormatter: (p) => p.value ?? '-' },
    {
      headerName: '',
      colId: 'actions',
      width: 56,
      minWidth: 56,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: ICellRendererParams<ExceptCode>) =>
        p.data && selectedTarget ? (
          <Popconfirm
            title={`'${p.data.errCode}' 제외를 해제할까요? 이 코드 장애가 다시 발송됩니다.`}
            okText="해제"
            cancelText="취소"
            onConfirm={() => deleteExceptMutate({ targetId: selectedTarget.notiTargetId, categoryCd: p.data!.categoryCd, errCode: p.data!.errCode })}
          >
            <button type="button" title="제외 해제 — 다시 발송">
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== ① 통보 대상 마스터 그리드 (인라인 필터 헤더 + 그리드 — 단일 흰색 래퍼) ===== */}
      <div className="flex flex-col gap-5 w-full flex-1 min-h-0 bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">통보 대상</h3>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{targets.length}건</span>
            {stoppedCount > 0 && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-amber-600 bg-amber-50">일시정지 {stoppedCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대상 ID·연락처 검색"
              prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
              style={{ width: 220 }}
              allowClear
            />
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} style={{ width: 130 }} />
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => drawerRef.current?.open()}>
              대상 등록
            </Button>
          </div>
        </header>
        <div className="flex-1 min-h-0 w-full">
          <AgGridReact<NotiTarget>
            rowData={filteredTargets}
            columnDefs={targetColumnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isFetching}
            getRowId={(p) => p.data.notiTargetId}
            defaultColDef={{ sortable: true, suppressHeaderMenuButton: true, resizable: true }}
            onRowClicked={(e) => e.data && handleSelectTarget(e.data)}
          />
        </div>
      </div>

      {/* ===== ② 선택 대상의 통보 시스템 / 제외코드 2그리드 ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-shrink-0">
        {/* 하단 좌: 통보 시스템 — 페어 전체 + 발송 토글 */}
        <div className="bg-white bt-shadow flex flex-col h-80 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">
                통보 시스템 {selectedTarget && <span className="text-[#405189]">— {`${selectedTarget.notiTargetName} (${selectedTarget.notiTargetId})`}</span>}
              </h3>
              {selectedTarget && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{systems.length}개</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<RefreshCw className="size-3.5" />}
                disabled={!selectedTarget}
                loading={syncSystemsMutation.isPending}
                onClick={() => selectedTarget && syncSystemsMutation.mutate(selectedTarget.notiTargetId)}
              >
                새 시스템 반영
              </Button>
              <Select value={sysClassFilter} onChange={setSysClassFilter} options={sysClassOptions} style={{ width: 130 }} size="small" disabled={!selectedTarget} />
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-3">
            {selectedTarget ? (
              <AgGridReact<NotiSystem>
                rowData={filteredSystems}
                columnDefs={systemColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isSystemFetching}
                getRowId={(p) => `${p.data.sysClassCd}_${p.data.systemId}`}
                defaultColDef={{ sortable: true, suppressHeaderMenuButton: true, resizable: true }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 통보 대상을 선택하세요" />
              </div>
            )}
          </div>
        </div>

        {/* 하단 우: 제외코드 — 제외된 것만 목록 + 추가 피커 */}
        <div className="bg-white bt-shadow flex flex-col h-80 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">
                제외코드 {selectedTarget && <span className="text-[#405189]">— {`${selectedTarget.notiTargetName} (${selectedTarget.notiTargetId})`}</span>}
              </h3>
              {selectedTarget && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{exceptCodes.length}건</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<Plus className="size-3.5" />}
                disabled={!selectedTarget}
                onClick={() => selectedTarget && pickerRef.current?.open({ targetId: selectedTarget.notiTargetId })}
              >
                제외코드 추가
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-3">
            {selectedTarget ? (
              <AgGridReact<ExceptCode>
                rowData={exceptCodes}
                columnDefs={exceptColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isExceptFetching}
                getRowId={(p) => `${p.data.categoryCd}_${p.data.errCode}`}
                defaultColDef={{ sortable: true, suppressHeaderMenuButton: true, resizable: true }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 통보 대상을 선택하세요" />
              </div>
            )}
          </div>
        </div>
      </div>

      <TargetEditDrawer ref={drawerRef} />
      <ExceptCodePickerModal ref={pickerRef} />
    </div>
  );
}
