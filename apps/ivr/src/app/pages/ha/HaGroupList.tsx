/**
 * HA 다중화 구성 페이지 (AS-IS: IPR20S8080 — HA 그룹 마스터/멤버 CRUD).
 * 모니터링/수동전환(IPR30S6050)·HA 그룹 할당 관리 팝업은 스코프 제외.
 *
 * 상단: 노드 탭 박스(첫 노드 자동선택, ivr-dn-group IvrDnGroupList 패턴 그대로)
 * 중단: HA 그룹 카드 슬라이더 — 그리드가 아니라 카드 자체가 1차 CRUD 대상(hover 수정/삭제).
 * 하단: 멤버 그리드 박스 — 그룹 선택 시 활성화, 최대 4개(클라이언트 즉시 안내 + 서버 최종 강제).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown, Empty, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Pause, Play, Plus, Trash2, Users } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import HaGroupDrawer, { type HaGroupDrawerRef } from '../../features/ha-group/components/HaGroupDrawer';
import HaGroupMemberDrawer, { type HaGroupMemberDrawerRef } from '../../features/ha-group/components/HaGroupMemberDrawer';
import { haGroupQueryKeys, useDeleteHaGroup, useDeleteHaGroupMember, useGetHaGroupMembers, useGetHaGroups, useGetNodes } from '../../features/ha-group/hooks/useHaGroupQueries';
import {
  HA_GROUP_MODE_KIND_LABELS,
  HA_ROLE_STATUS_KIND,
  HA_ROLE_STATUS_KIND_LABELS,
  HA_ROLE_TYPE_KIND,
  HA_ROLE_TYPE_KIND_LABELS,
  type HaGroup,
  type HaGroupMember,
} from '../../features/ha-group/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** Role 타입 배지 색상 — 라벨은 FE 상수(HA_ROLE_TYPE_KIND_LABELS, BE enum 고정값 이식)에서, 색상은 값 기준 고정. */
const ROLE_TYPE_BADGE_CLASS: Record<number, string> = {
  [HA_ROLE_TYPE_KIND.BACKUP]: 'text-gray-500 bg-gray-100',
  [HA_ROLE_TYPE_KIND.SERVICE]: 'text-blue-600 bg-blue-50',
};
/** Role 상태 배지 색상 — 라벨은 FE 상수(HA_ROLE_STATUS_KIND_LABELS, BE enum 고정값 이식)에서, 색상은 값 기준 고정. */
const ROLE_STATUS_BADGE_CLASS: Record<number, string> = {
  [HA_ROLE_STATUS_KIND.WAITING]: 'text-gray-500 bg-gray-100',
  [HA_ROLE_STATUS_KIND.ACTIVE]: 'text-blue-600 bg-blue-50',
  [HA_ROLE_STATUS_KIND.NORMAL]: 'text-emerald-600 bg-emerald-50',
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '다중화 구성' }, { title: 'HA 다중화 구성', path: '/ivr/ha/group' }];

export default function HaGroupList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedHaGroupId, setSelectedHaGroupId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(5);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const groupDrawerRef = useRef<HaGroupDrawerRef>(null);
  const memberDrawerRef = useRef<HaGroupMemberDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  const { data: haGroups = [] } = useGetHaGroups({
    params: selectedNodeId ? { nodeId: selectedNodeId } : undefined,
    queryOptions: { enabled: !!selectedNodeId },
  });
  const { data: members = [], isLoading: isMembersLoading } = useGetHaGroupMembers({
    params: selectedHaGroupId ? { id: selectedHaGroupId } : undefined,
    queryOptions: { enabled: !!selectedHaGroupId, refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  useEffect(() => {
    if (selectedNodeId === null && nodes.length > 0) setSelectedNodeId(nodes[0].nodeId);
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    setAutoRefresh(true);
  }, [selectedHaGroupId]);

  useEffect(() => {
    if (selectedHaGroupId && !haGroups.some((g) => g.haGroupId === selectedHaGroupId)) setSelectedHaGroupId(null);
  }, [haGroups, selectedHaGroupId]);

  useEffect(() => {
    if (selectedHaGroupId === null && haGroups.length > 0) setSelectedHaGroupId(haGroups[0].haGroupId);
  }, [haGroups, selectedHaGroupId]);

  const selectedHaGroup = useMemo(() => haGroups.find((g) => g.haGroupId === selectedHaGroupId) ?? null, [haGroups, selectedHaGroupId]);

  // ─── Invalidation ───────────────────────────────────────────────────────
  const invalidateHaGroups = () => queryClient.invalidateQueries({ queryKey: haGroupQueryKeys.getHaGroups._def });
  const invalidateMembers = () => {
    if (selectedHaGroupId) queryClient.invalidateQueries({ queryKey: haGroupQueryKeys.getHaGroupMembers({ id: selectedHaGroupId }).queryKey });
    invalidateHaGroups(); // 멤버 수(memberCount) 카드 반영
  };

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteHaGroup } = useDeleteHaGroup({
    mutationOptions: {
      onSuccess: (_d, variables) => {
        toast.success('HA 그룹이 삭제되었습니다.');
        const deletedId = (variables as { id: number }).id;
        if (selectedHaGroupId === deletedId) setSelectedHaGroupId(null);
        // invalidateHaGroups()의 refetch(비동기)를 기다리지 않고 목록 캐시를 즉시 로컬에서 필터링해,
        // "선택 없음 → 목록 첫 항목 자동 선택" 이펙트가 갱신 전(삭제된 그룹이 남아있는) 캐시를 보는
        // 순간을 아예 없앤다 (IvrEndpointList.tsx deleteEndpoint와 동일 패턴).
        queryClient.setQueriesData<HaGroup[]>({ queryKey: haGroupQueryKeys.getHaGroups._def }, (old) => (old ? old.filter((g) => g.haGroupId !== deletedId) : old));
        queryClient.removeQueries({ queryKey: haGroupQueryKeys.getHaGroupMembers({ id: deletedId }).queryKey });
        invalidateHaGroups();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.'),
    },
  });

  const { mutate: deleteHaGroupMember } = useDeleteHaGroupMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('HA 그룹 멤버가 삭제되었습니다.');
        invalidateMembers();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.'),
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedHaGroupId(null);
  };

  const handleCreateGroup = () => groupDrawerRef.current?.open();
  const handleEditGroup = (g: HaGroup) => groupDrawerRef.current?.open(g);
  const handleDeleteGroup = (g: HaGroup) => {
    modal.confirm.execute({
      onOk: () => deleteHaGroup({ id: g.haGroupId }),
      options: { title: 'HA 그룹 삭제', content: `"${g.haGroupName}" HA 그룹을 삭제하시겠습니까?\n하위 멤버도 함께 삭제됩니다.` },
    });
  };

  const getGroupMenuItems = (g: HaGroup) => [
    { key: 'edit', label: '수정', onClick: () => handleEditGroup(g) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleDeleteGroup(g) },
  ];

  const handleCreateMember = () => {
    if (!selectedHaGroupId) return;
    if (members.length >= 4) {
      toast.warning('HA 그룹 멤버는 4개를 초과할 수 없습니다.');
      return;
    }
    memberDrawerRef.current?.open();
  };
  const handleEditMember = (m: HaGroupMember) => memberDrawerRef.current?.open(m);
  const handleDeleteMember = (m: HaGroupMember) => {
    modal.confirm.execute({
      onOk: () => deleteHaGroupMember({ id: m.haGroupId, systemId: m.systemId }),
      options: { title: 'HA 그룹 멤버 삭제', content: `"${m.roleAlias}" 멤버를 삭제하시겠습니까?\n삭제 후 서비스를 재시작해야 합니다.` },
    });
  };

  // ─── ag-Grid: 멤버 컬럼 ───────────────────────────────────────────────────
  const memberColumnDefs: ColDef<HaGroupMember>[] = useMemo(
    () => [
      { headerName: '시스템 ID', field: 'systemId', width: 100 },
      { headerName: '시스템명', field: 'systemName', flex: 1, minWidth: 100 },
      { headerName: 'ROLE INDEX', field: 'roleIndex', width: 100 },
      {
        headerName: 'ROLE TYPE',
        field: 'roleType',
        width: 110,
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) =>
          p.data ? (
            <Badge className={cn(BADGE_CLASS, ROLE_TYPE_BADGE_CLASS[p.data.roleType] ?? DEFAULT_BADGE_CLASS)}>{HA_ROLE_TYPE_KIND_LABELS[p.data.roleType] ?? '-'}</Badge>
          ) : null,
      },
      { headerName: 'ROLE 별칭', field: 'roleAlias', flex: 1, minWidth: 100 },
      { headerName: 'HA IP', field: 'haIpaddr', flex: 1, minWidth: 120 },
      { headerName: 'SVC NIC', field: 'svcNic', width: 100, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.svcNic ?? '-' },
      { headerName: 'SVC IP', field: 'svcIpaddr', flex: 1, minWidth: 120, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.svcIpaddr ?? '-' },
      { headerName: 'SVC Netmask', field: 'svcNetmask', width: 100, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.svcNetmask ?? '-' },
      {
        headerName: '상태',
        field: 'roleStatus',
        width: 120,
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) =>
          p.data?.roleStatus != null ? (
            <Badge className={cn(BADGE_CLASS, ROLE_STATUS_BADGE_CLASS[p.data.roleStatus] ?? DEFAULT_BADGE_CLASS)}>{HA_ROLE_STATUS_KIND_LABELS[p.data.roleStatus] ?? '-'}</Badge>
          ) : (
            '-'
          ),
      },
      {
        headerName: '변경시간',
        field: 'roleChgTime',
        flex: 1,
        minWidth: 130,
        tooltipField: 'roleChgTime',
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) => (p.data?.roleChgTime ? dayjs(p.data.roleChgTime).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '사유',
        field: 'roleChgReason',
        flex: 1,
        minWidth: 120,
        tooltipField: 'roleChgReason',
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.roleChgReason ?? '-',
      },
      { headerName: 'Total', field: 'totCnt', width: 80, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.totCnt ?? '-' },
      { headerName: 'Busy', field: 'busyCnt', width: 80, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.busyCnt ?? '-' },
      { headerName: 'Idle', field: 'idleCnt', width: 80, cellRenderer: (p: ICellRendererParams<HaGroupMember>) => p.data?.idleCnt ?? '-' },
      {
        headerName: '작업일시',
        field: 'workTime',
        flex: 1,
        minWidth: 130,
        tooltipField: 'workTime',
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) => (p.data?.workTime ? dayjs(p.data.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<HaGroupMember>) =>
          p.data ? (
            <button type="button" title="삭제" onClick={() => handleDeleteMember(p.data!)}>
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          ) : null,
      },
    ],
    [handleDeleteMember],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 노드 선택 툴바 (별도 박스) ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 h-full">
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select<number>
                size="small"
                variant="borderless"
                value={selectedNodeId ?? undefined}
                onChange={handleNodeSelect}
                options={nodes.map((node) => ({ value: node.nodeId, label: node.nodeName }))}
                placeholder="노드 선택"
                style={{ width: 190 }}
                popupMatchSelectWidth={false}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateGroup}>
                그룹 추가
              </Button>
            </div>
          </header>
        </div>

        {/* ===== HA 그룹 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
            <Layers className="size-4 text-[#405189]" />
            <h3 className="text-sm font-semibold text-gray-800">HA 그룹</h3>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{haGroups.length}개</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 h-[150px]">
            <Button
              type="text"
              icon={<ChevronLeft className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
              className="!flex-shrink-0 !w-8 !h-8 !p-0"
            />
            <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
              {haGroups.map((g) => {
                const sel = selectedHaGroupId === g.haGroupId;
                return (
                  <div
                    key={g.haGroupId}
                    className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[220px] flex-shrink-0 flex flex-col ${sel ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'}`}
                    onClick={(e) => {
                      setSelectedHaGroupId(g.haGroupId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                    onDoubleClick={() => handleEditGroup(g)}
                  >
                    {/* Card header: 그룹명 + 더보기 */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Layers className="size-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-800 truncate">{g.haGroupName}</span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                        <Dropdown menu={{ items: getGroupMenuItems(g) }} trigger={['click']} placement="bottomRight">
                          <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                            <MoreVertical className="size-3.5 text-gray-400" />
                          </button>
                        </Dropdown>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div className="truncate">ID: {g.haGroupId}</div>
                      <div className="truncate">멤버: {g.memberCount}개</div>
                    </div>

                    {/* 하단 상태 태그 */}
                    <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                        style={{ color: '#722ed1', backgroundColor: '#f9f0ff', borderColor: '#d3adf7' }}
                      >
                        {HA_GROUP_MODE_KIND_LABELS[g.haGroupMode] ?? g.haGroupMode}
                      </span>
                      {g.activateYn === '0' && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                          style={{ color: '#595959', backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' }}
                        >
                          비활성화
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {selectedNodeId !== null && haGroups.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                  <Empty description={false} styles={{ image: { height: 40 } }} />
                  <span className="text-sm">이 노드에 등록된 HA 그룹이 없습니다</span>
                </div>
              )}
            </div>
            <Button
              type="text"
              icon={<ChevronRight className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
              className="!flex-shrink-0 !w-8 !h-8 !p-0"
            />
          </div>
        </div>

        {/* ===== 하단: 멤버 그리드 박스 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">
                HA 그룹 멤버 — <span className="text-[#405189]">{selectedHaGroup?.haGroupName ?? ''}</span>
              </h3>
              <span
                className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded', members.length >= 4 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-100')}
                title="HA 그룹 멤버는 최대 4개까지 등록할 수 있습니다"
              >
                {members.length}/4개
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#495057] shrink-0">모니터링</span>
              <Select
                value={refreshSeconds}
                onChange={setRefreshSeconds}
                options={[
                  { label: '3초', value: 3 },
                  { label: '5초', value: 5 },
                  { label: '10초', value: 10 },
                  { label: '30초', value: 30 },
                ]}
                style={{ width: 72 }}
              />
              <Tooltip title={autoRefresh ? '모니터링 중지' : '모니터링 시작'}>
                <button
                  type="button"
                  onClick={() => setAutoRefresh((v) => !v)}
                  className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${
                    autoRefresh
                      ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
                      : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'
                  }`}
                >
                  {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
              </Tooltip>
              <Button
                onClick={handleCreateMember}
                disabled={!selectedHaGroupId}
                type="primary"
                icon={<Plus className="size-3.5" />}
                title={!selectedHaGroupId ? 'HA 그룹을 먼저 선택하세요' : undefined}
              >
                멤버 추가
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-5">
            {!selectedHaGroup ? (
              <div className="flex items-center justify-center h-full">
                <Empty description="HA 그룹을 선택하세요" />
              </div>
            ) : members.length === 0 && !isMembersLoading ? (
              <div className="flex items-center justify-center h-full">
                <Empty description="등록된 멤버가 없습니다" />
              </div>
            ) : (
              <AgGridReact<HaGroupMember>
                rowData={members}
                columnDefs={memberColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isMembersLoading}
                getRowId={(p) => `${p.data.haGroupId}_${p.data.systemId}`}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                onRowDoubleClicked={(e) => {
                  if (e.data) handleEditMember(e.data);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <HaGroupDrawer
        ref={groupDrawerRef}
        selectedNodeId={selectedNodeId}
        nodes={nodes}
        onSuccess={(created) => {
          invalidateHaGroups();
          if (created) setSelectedHaGroupId(created.haGroupId);
        }}
      />
      <HaGroupMemberDrawer
        ref={memberDrawerRef}
        haGroupId={selectedHaGroupId}
        haGroupName={selectedHaGroup?.haGroupName ?? null}
        nodeId={selectedNodeId}
        onSuccess={invalidateMembers}
      />
    </div>
  );
}
