/**
 * IVR DN 그룹 관리 페이지 (IPR20S6012) — IPRON DNIS관리(MCS) UI 패턴 적용.
 *
 * 상단: 노드 탭 박스(전체 포함) + 시스템 카드 슬라이더 박스(첫 시스템 자동선택)
 * 하단: DN 그룹 그리드 박스 — 행 더블클릭 = 수정(IvrDnGroupSheet). Direction 필터 + [Sub DN 관리] 버튼.
 * Sub DN: Drawer 안에서 그리드 + 인라인 추가/수정 (DnShortDialDrawer 패턴).
 *
 * ※ DN 그룹 추가/수정(IvrDnGroupSheet) 로직·백엔드 변경 없음.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Alert, type BreadcrumbProps, Button, Col, Drawer, Empty, Form, Input, InputNumber, Row, Select } from 'antd';
import { ChevronLeft, ChevronRight, Info, Network, Pencil, Phone, Plus, Server, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IvrDnGroupSheet, { type IvrDnGroupSheetRef } from '../../features/ivr-dn-group/components/IvrDnGroupSheet';
import {
  ivrDnGroupQueryKeys,
  useCreateSubDnGroup,
  useDeleteDnGroup,
  useDeleteSubDnGroup,
  useGetDnGroups,
  useGetNodes,
  useGetSubDnGroups,
  useGetSubDnQuota,
  useGetSystemUsage,
  useUpdateSubDnGroup,
} from '../../features/ivr-dn-group/hooks/useIvrDnGroupQueries';
import {
  DIRECTION_LABELS,
  type IrDnDirection,
  type IrDnGroup,
  type IrSubDnGroup,
  type IrSubDnGroupCreateRequest,
  REG_KIND_LABELS,
  SUB_DN_KIND_LABELS,
  SUB_DN_KIND_OPTIONS,
  isSubDnEligible,
} from '../../features/ivr-dn-group/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '회선관리' }, { title: 'IVR DN그룹관리', path: '/ivr/line/dn-group' }];

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조) — Record 색상 맵 + shadcn Badge. */
const DIRECTION_BADGE_CLASS: Record<IrDnDirection, string> = {
  '10': 'text-teal-600 bg-teal-50', // Outbound
  '20': 'text-blue-600 bg-blue-50', // Inbound
  '30': 'text-purple-600 bg-purple-50', // Both
};
const ACS_BADGE_CLASS = 'text-emerald-600 bg-emerald-50';
const SUB_DN_KIND_BADGE_CLASS: Record<string, string> = {
  '1': 'text-blue-600 bg-blue-50', // 일반
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

/** Direction 배지 — 라벨 고정 너비로 In/Out/Both 크기 통일. */
function DirectionBadge({ direction }: { direction: IrDnDirection }) {
  return <Badge className={cn(BADGE_CLASS, 'w-[76px] justify-center', DIRECTION_BADGE_CLASS[direction] ?? DEFAULT_BADGE_CLASS)}>{DIRECTION_LABELS[direction]}</Badge>;
}

export default function IvrDnGroupList() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initDnGroupId = searchParams.get('dnGroupId') ? Number(searchParams.get('dnGroupId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [selectedDnGroupId, setSelectedDnGroupId] = useState<number | null>(initDnGroupId);
  const [subDnDrawerOpen, setSubDnDrawerOpen] = useState(false);
  const [subEditing, setSubEditing] = useState<IrSubDnGroup | null>(null);
  const [subFormOpen, setSubFormOpen] = useState(false);
  const sysScrollRef = useRef<HTMLDivElement>(null);
  const [subForm] = Form.useForm();

  const dnGroupSheetRef = useRef<IvrDnGroupSheetRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: dnGroups = [] } = useGetDnGroups();
  const { data: nodes = [] } = useGetNodes();
  // 모든 시스템을 한 번에 가져옴(IvrMedia와 동일 패턴) — 노드 탭 카운트와 "전체" 카드 노출을 클라이언트에서 일괄 계산
  const { data: systemUsages = [] } = useGetSystemUsage({
    params: {},
    queryOptions: { enabled: true },
  });
  const { data: subDnGroups = [], isLoading: isSubLoading } = useGetSubDnGroups({
    params: selectedDnGroupId ? { id: selectedDnGroupId } : undefined,
    queryOptions: { enabled: !!selectedDnGroupId },
  });
  const { data: quota } = useGetSubDnQuota({
    params: selectedDnGroupId ? { id: selectedDnGroupId, ...(subEditing ? { excludeSubId: subEditing.subDnGroupId } : {}) } : undefined,
    // excludeSubId가 추가/제거되며 쿼리 키가 바뀌어도 이전 데이터를 유지 → 상단 채널현황 Alert 깜빡임 방지.
    queryOptions: { enabled: !!selectedDnGroupId, placeholderData: keepPreviousData },
  });

  // ─── Invalidation ───────────────────────────────────────────────────────
  const invalidateDnGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getDnGroups._def });
    queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getSystemUsage._def });
  }, [queryClient]);

  const invalidateSubDnGroups = useCallback(() => {
    if (selectedDnGroupId) {
      queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getSubDnGroups({ id: selectedDnGroupId }).queryKey });
      queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getSubDnQuota._def });
    }
  }, [queryClient, selectedDnGroupId]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteDnGroup } = useDeleteDnGroup({
    mutationOptions: {
      onSuccess: (_d, variables) => {
        toast.success('DN 그룹이 삭제되었습니다.');
        const deletedId = (variables as { id: number }).id;
        if (selectedDnGroupId === deletedId) setSelectedDnGroupId(null);
        queryClient.setQueriesData<IrDnGroup[]>({ queryKey: ivrDnGroupQueryKeys.getDnGroups._def }, (old) => (old ? old.filter((g) => g.dnGroupId !== deletedId) : old));
        invalidateDnGroups();
      },
    },
  });

  const { mutate: deleteSubDnGroup } = useDeleteSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 삭제되었습니다.');
        invalidateSubDnGroups();
        invalidateDnGroups();
      },
    },
  });

  const closeSubForm = useCallback(() => {
    setSubFormOpen(false);
    setSubEditing(null);
  }, []);

  const openSubAddForm = useCallback(() => {
    setSubEditing(null);
    setSubFormOpen(true);
  }, []);

  const openSubEditForm = useCallback((sub: IrSubDnGroup) => {
    setSubEditing(sub);
    setSubFormOpen(true);
  }, []);

  const { mutate: createSubDnGroup, isPending: isCreatingSub } = useCreateSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 등록되었습니다.');
        closeSubForm();
        invalidateSubDnGroups();
        invalidateDnGroups();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.'),
    },
  });

  const { mutate: updateSubDnGroup, isPending: isUpdatingSub } = useUpdateSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 수정되었습니다.');
        closeSubForm();
        invalidateSubDnGroups();
        invalidateDnGroups();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.'),
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredDnGroups = useMemo(() => {
    let list = dnGroups;
    if (selectedNodeId !== null) list = list.filter((g) => g.nodeId === selectedNodeId);
    if (selectedSystemId !== null) list = list.filter((g) => g.systemId === selectedSystemId);
    return list;
  }, [dnGroups, selectedNodeId, selectedSystemId]);

  const dnGroupCountBySystem = useMemo(() => {
    const m = new Map<number, number>();
    dnGroups.forEach((g) => m.set(g.systemId, (m.get(g.systemId) ?? 0) + 1));
    return m;
  }, [dnGroups]);

  // 노드 선택에 따른 시스템 카드 슬라이더 노출 목록 — "전체"면 전체 시스템 노출.
  const filteredSystemUsages = useMemo(() => {
    if (selectedNodeId === null) return systemUsages;
    return systemUsages.filter((s) => s.nodeId === selectedNodeId);
  }, [systemUsages, selectedNodeId]);

  useEffect(() => {
    if (selectedSystemId === null && filteredSystemUsages.length > 0) setSelectedSystemId(filteredSystemUsages[0].systemId);
  }, [selectedSystemId, filteredSystemUsages]);

  // DN 그룹은 자동 선택하지 않음 — Sub DN 관리는 사용자가 행을 직접 선택해야 활성화.
  // 단, 선택한 행이 필터로 사라지면 선택 해제.
  useEffect(() => {
    if (selectedDnGroupId && !filteredDnGroups.some((g) => g.dnGroupId === selectedDnGroupId)) setSelectedDnGroupId(null);
  }, [filteredDnGroups, selectedDnGroupId]);

  const selectedDnGroup = useMemo(() => dnGroups.find((g) => g.dnGroupId === selectedDnGroupId) ?? null, [dnGroups, selectedDnGroupId]);
  const subDnAllowed = isSubDnEligible(selectedDnGroup);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedSystemId(null);
    setSelectedDnGroupId(null);
  };

  const handleSystemSelect = (systemId: number) => {
    setSelectedSystemId(systemId);
    setSelectedDnGroupId(null);
  };

  const handleCreate = useCallback(() => dnGroupSheetRef.current?.open(undefined, selectedNodeId ?? nodes[0]?.nodeId), [nodes, selectedNodeId]);
  const handleEdit = useCallback((g: IrDnGroup) => dnGroupSheetRef.current?.open(g), []);

  const handleDelete = useCallback(
    (g: IrDnGroup) => {
      modal.confirm.execute({
        onOk: () => deleteDnGroup({ id: g.dnGroupId }),
        options: { title: 'DN 그룹 삭제', content: `"${g.dnGroupName}" DN 그룹을 삭제하시겠습니까?\n하위 Sub DN도 함께 삭제됩니다.` },
      });
    },
    [modal, deleteDnGroup],
  );

  const handleSubDelete = useCallback(
    (sub: IrSubDnGroup) => {
      modal.confirm.execute({
        onOk: () => {
          // 수정 중이던 행을 삭제하면 열려있던 수정 폼을 닫는다(스테일 폼 방지).
          if (subEditing?.subDnGroupId === sub.subDnGroupId) closeSubForm();
          deleteSubDnGroup({ subId: sub.subDnGroupId });
        },
        options: { title: 'Sub DN 삭제', content: `"${sub.subDnGroupName}" Sub DN을 삭제하시겠습니까?` },
      });
    },
    [modal, deleteSubDnGroup, subEditing, closeSubForm],
  );

  const handleDnGroupSheetSuccess = useCallback(
    (created?: IrDnGroup) => {
      invalidateDnGroups();
      if (created) {
        if (created.nodeId != null) setSelectedNodeId(created.nodeId);
        if (created.systemId != null) setSelectedSystemId(created.systemId);
        setSelectedDnGroupId(created.dnGroupId);
      }
    },
    [invalidateDnGroups],
  );

  const openSubDnDrawer = () => {
    if (!subDnAllowed) return;
    closeSubForm();
    setSubDnDrawerOpen(true);
  };

  // 폼이 열릴 때(또는 편집 대상이 바뀔 때) 값 채우기.
  // 폼은 열려 있을 때만 마운트되므로 effect(커밋 이후)에서 안전하게 setFieldsValue.
  useEffect(() => {
    if (!subFormOpen) return;
    if (subEditing) {
      subForm.setFieldsValue({
        subDnGroupName: subEditing.subDnGroupName,
        subDnGroupKind: subEditing.subDnGroupKind,
        chnlCnt: subEditing.chnlCnt,
        subDnGroupDesc: subEditing.subDnGroupDesc ?? '',
      });
    } else {
      subForm.resetFields();
      subForm.setFieldsValue({ chnlCnt: 1, subDnGroupKind: '1' });
    }
  }, [subFormOpen, subEditing, subForm]);

  const chnlCntWatch = Form.useWatch('chnlCnt', subForm);
  const exceedsAvailable = quota && typeof chnlCntWatch === 'number' && chnlCntWatch > quota.availableChannelCount;

  const handleSubSubmit = useCallback(async () => {
    if (!selectedDnGroupId) return;
    if (exceedsAvailable) {
      toast.error('DN 그룹의 잔여 채널을 초과합니다.');
      return;
    }
    try {
      const values = await subForm.validateFields();
      const payload: IrSubDnGroupCreateRequest = {
        subDnGroupName: values.subDnGroupName,
        chnlCnt: values.chnlCnt,
        subDnGroupKind: values.subDnGroupKind,
        subDnGroupDesc: values.subDnGroupDesc || undefined,
      };
      if (subEditing) updateSubDnGroup({ subId: subEditing.subDnGroupId, data: payload });
      else createSubDnGroup({ id: selectedDnGroupId, data: payload });
    } catch {
      /* validation */
    }
  }, [selectedDnGroupId, exceedsAvailable, subForm, subEditing, createSubDnGroup, updateSubDnGroup]);

  // ─── ag-Grid: DN 그룹 컬럼 ───────────────────────────────────────────────
  const dnGroupColumnDefs: ColDef<IrDnGroup>[] = useMemo(
    () => [
      { headerName: 'DN ID', field: 'dnGroupId', width: 100 },
      { headerName: '시스템', field: 'systemName', flex: 1, minWidth: 90 },
      { headerName: 'DN Name', field: 'dnGroupName', flex: 1.3, minWidth: 120, cellRenderer: (p: ICellRendererParams<IrDnGroup>) => <b className="text-gray-800">{p.value}</b> },
      { headerName: '연동 EP', field: 'endptName', flex: 1, minWidth: 95 },
      { headerName: '시작 DN', field: 'startDn', width: 95 },
      { headerName: 'DN Count', field: 'dnCount', width: 115 },
      {
        headerName: 'Direction',
        field: 'direction',
        width: 120,
        cellRenderer: (p: ICellRendererParams<IrDnGroup>) => (p.data ? <DirectionBadge direction={p.data.direction} /> : null),
        ...codeFilter('direction', DIRECTION_LABELS),
      },
      {
        headerName: 'REG',
        field: 'regKind',
        width: 120,
        cellRenderer: (p: ICellRendererParams<IrDnGroup>) => (p.data ? (REG_KIND_LABELS[p.data.regKind] ?? '-') : '-'),
        ...codeFilter('regKind', REG_KIND_LABELS),
      },
      {
        headerName: 'ACS',
        colId: 'acs',
        width: 70,
        sortable: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrDnGroup>) =>
          p.data?.outchUsetype === '5' ? <Badge className={cn(BADGE_CLASS, ACS_BADGE_CLASS)}>ACS</Badge> : <span className="text-gray-300">-</span>,
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 54,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrDnGroup>) =>
          p.data ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(p.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          ) : null,
      },
    ],
    [handleDelete],
  );

  // ─── ag-Grid: Sub DN 컬럼 ──────────────────────────────────────────────
  const subDnColumnDefs: ColDef<IrSubDnGroup>[] = useMemo(
    () => [
      { headerName: 'Sub DN 명', field: 'subDnGroupName', flex: 2, minWidth: 130 },
      {
        headerName: '타입',
        field: 'subDnGroupKind',
        width: 90,
        cellRenderer: (p: ICellRendererParams<IrSubDnGroup>) =>
          p.data ? (
            <Badge className={cn(BADGE_CLASS, SUB_DN_KIND_BADGE_CLASS[p.data.subDnGroupKind] ?? DEFAULT_BADGE_CLASS)}>{SUB_DN_KIND_LABELS[p.data.subDnGroupKind] ?? '-'}</Badge>
          ) : null,
        ...codeFilter<IrSubDnGroup>('subDnGroupKind', SUB_DN_KIND_LABELS),
      },
      { headerName: '채널', field: 'chnlCnt', width: 70 },
      { headerName: '설명', field: 'subDnGroupDesc', flex: 1.6, minWidth: 110, cellRenderer: (p: ICellRendererParams<IrSubDnGroup>) => p.data?.subDnGroupDesc ?? '-' },
      { headerName: '작업일시', field: 'workTime', flex: 1.4, minWidth: 130, cellRenderer: (p: ICellRendererParams<IrSubDnGroup>) => p.data?.workTime ?? '-' },
      {
        headerName: '',
        colId: 'actions',
        width: 92,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrSubDnGroup>) =>
          p.data ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                title="수정"
                onClick={(e) => {
                  e.stopPropagation();
                  openSubEditForm(p.data!);
                }}
              >
                <Pencil className="size-4 text-gray-500 hover:text-blue-600 hover:cursor-pointer" />
              </button>
              <button
                type="button"
                title="삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubDelete(p.data!);
                }}
              >
                <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
              </button>
            </div>
          ) : null,
      },
    ],
    [handleSubDelete, openSubEditForm],
  );

  const selectedSystemName = useMemo(
    () => (selectedSystemId ? (systemUsages.find((s) => s.systemId === selectedSystemId)?.systemName ?? '') : ''),
    [selectedSystemId, systemUsages],
  );

  // ─── Render (IPRON McsDnis UI 패턴) ────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 노드 선택 툴바 (별도 박스) ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 h-full">
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select<number | 'all'>
                size="small"
                variant="borderless"
                value={selectedNodeId ?? 'all'}
                onChange={(id) => {
                  if (id === 'all') {
                    setSelectedNodeId(null);
                    setSelectedSystemId(null);
                    setSelectedDnGroupId(null);
                  } else {
                    handleNodeSelect(id);
                  }
                }}
                options={[{ value: 'all' as const, label: '전체' }, ...nodes.map((node) => ({ value: node.nodeId, label: node.nodeName }))]}
                placeholder="노드 선택"
                style={{ width: 190 }}
                popupMatchSelectWidth={false}
              />
            </div>
          </header>
        </div>

        {/* ===== 카드 슬라이더 박스 (시스템) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100">
            <Server className="size-4 text-[#405189]" />
            <span className="text-sm font-semibold text-gray-800">시스템</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredSystemUsages.length}개</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 h-[150px]">
            {filteredSystemUsages.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                <Empty description={false} styles={{ image: { height: 40 } }} />
                <span className="text-sm">{selectedNodeId !== null ? '이 노드에 시스템이 없습니다' : '등록된 시스템이 없습니다'}</span>
              </div>
            ) : (
              <>
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => sysScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={sysScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                  {filteredSystemUsages.map((sys) => {
                    const sel = selectedSystemId === sys.systemId;
                    return (
                      <div
                        key={sys.systemId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[120px] flex-shrink-0 flex flex-col ${sel ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'}`}
                        onClick={(e) => {
                          handleSystemSelect(sys.systemId);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Server className="size-3.5 text-[#405189]" />
                          <span className="text-[14px] font-semibold text-gray-800 truncate" title={sys.systemName}>
                            {sys.systemName}
                          </span>
                        </div>
                        <div className="mt-2 text-[12px] text-gray-500 space-y-0.5">
                          <div>
                            DN 그룹 <b className="text-gray-700">{dnGroupCountBySystem.get(sys.systemId) ?? 0}개</b>
                          </div>
                          <div>
                            DN 사용{' '}
                            <b className="text-gray-700">
                              {sys.usedDnCount}/{sys.maxDnCount}
                            </b>{' '}
                            (잔여 {sys.availableDnCount})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => sysScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </>
            )}
          </div>
        </div>

        {/* ===== 하단: DN 그룹 그리드 박스 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">
                DN 그룹 — <span className="text-[#405189]">{selectedSystemName}</span>
              </h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredDnGroups.length}개</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                DN 그룹 추가
              </Button>
              <Button
                onClick={openSubDnDrawer}
                disabled={!subDnAllowed}
                style={subDnAllowed ? { color: '#0AB39C', borderColor: '#0AB39C', fontWeight: 600 } : undefined}
                title={!selectedDnGroup ? 'DN 그룹을 먼저 선택하세요' : subDnAllowed ? undefined : 'Outbound + ACS DN 그룹만 Sub DN 관리 가능'}
              >
                Sub DN 관리{subDnAllowed && subDnGroups.length > 0 ? ` (${subDnGroups.length})` : ''}
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-5">
            {filteredDnGroups.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Empty description="등록된 DN 그룹이 없습니다" />
              </div>
            ) : (
              <AgGridReact<IrDnGroup>
                rowData={filteredDnGroups}
                columnDefs={dnGroupColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                getRowId={(p) => String(p.data.dnGroupId)}
                rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                onRowClicked={(e) => {
                  if (e.data) setSelectedDnGroupId(e.data.dnGroupId);
                }}
                onRowDoubleClicked={(e) => {
                  if (e.data) handleEdit(e.data);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sub DN Drawer — 그리드 + 인라인 폼 */}
      <Drawer
        title={`Sub DN 관리 — ${selectedDnGroup?.dnGroupName ?? ''}`}
        placement="right"
        size={720}
        open={subDnDrawerOpen}
        onClose={() => {
          setSubDnDrawerOpen(false);
          closeSubForm();
        }}
        closable={{ placement: 'end' }}
        destroyOnHidden
        footer={
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSubDnDrawerOpen(false);
                closeSubForm();
              }}
            >
              닫기
            </Button>
          </div>
        }
      >
        <div className="flex flex-col h-full gap-3">
          {quota && (
            <Alert
              type="info"
              showIcon
              icon={<Info className="size-4" />}
              message={
                <span className="text-[12px]">
                  DN 그룹 채널 <b>{quota.dnGroupChannelCount}</b> / 사용 <b>{quota.usedChannelCount}</b> / 잔여 <b>{quota.availableChannelCount}</b>
                </span>
              }
            />
          )}
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="text-[12px] font-semibold text-slate-700">Sub DN 목록 ({subDnGroups.length})</span>
            <Button size="small" type="primary" icon={<Plus className="size-3.5" />} onClick={openSubAddForm}>
              추가
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <AgGridReact<IrSubDnGroup>
              rowData={subDnGroups}
              columnDefs={subDnColumnDefs}
              gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
              loading={isSubLoading}
              getRowId={(p) => String(p.data.subDnGroupId)}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            />
          </div>
          {subFormOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex-shrink-0">
              <div className="text-[12px] font-semibold text-slate-700 mb-2">{subEditing ? `Sub DN 수정 — ${subEditing.subDnGroupName}` : 'Sub DN 추가'}</div>
              <Form form={subForm} layout="vertical" initialValues={{ chnlCnt: 1, subDnGroupKind: '1' }}>
                <Form.Item
                  name="subDnGroupName"
                  label="Sub DN 명"
                  required
                  rules={[
                    { required: true, message: 'Sub DN 명은 필수입니다' },
                    { max: 64, message: '64자 이내' },
                  ]}
                  className="!mb-2"
                >
                  <Input placeholder="예: SUB_DG_ACS_01" maxLength={64} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="subDnGroupKind" label="타입" required className="!mb-2">
                      <Select options={SUB_DN_KIND_OPTIONS as unknown as { label: string; value: string }[]} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="chnlCnt"
                      label="채널 수"
                      required
                      rules={[{ required: true, type: 'number', min: 1, max: 100000, message: '1 이상' }]}
                      validateStatus={exceedsAvailable ? 'error' : undefined}
                      help={exceedsAvailable ? `잔여 ${quota?.availableChannelCount} 초과` : undefined}
                      className="!mb-2"
                    >
                      <InputNumber min={1} max={100000} className="!w-full" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="subDnGroupDesc" label="설명" rules={[{ max: 200, message: '200자 이내' }]} className="!mb-1">
                  <Input.TextArea placeholder="(선택)" maxLength={200} rows={2} showCount />
                </Form.Item>
              </Form>
              <div className="flex justify-end gap-2 mt-5">
                <Button size="small" onClick={closeSubForm}>
                  취소
                </Button>
                <Button size="small" type="primary" onClick={handleSubSubmit} loading={isCreatingSub || isUpdatingSub} disabled={!!exceedsAvailable}>
                  {subEditing ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* DN 그룹 추가/수정 (로직 변경 없음) */}
      <IvrDnGroupSheet ref={dnGroupSheetRef} selectedNodeId={selectedNodeId} nodes={nodes} onSuccess={handleDnGroupSheetSuccess} />
    </div>
  );
}
