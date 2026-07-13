/**
 * 교환기 공용멘트 관리 (시스템 관리자 전용).
 *
 * 상단 노드 Select(전체 포함) + 그리드 + 등록/수정/삭제/미리듣기/동기화.
 * 스코프는 공통(TENANT_ID=0) 으로 고정한다. 테넌트 카드 슬라이더 없음.
 *
 * 공용멘트(TENANT_ID=0)는 전 테넌트가 공유하는 멘트로, SHARED_POOL 규칙상
 * 시스템 관리자만 생성/수정 가능(BE TenantGuard). 메뉴도 시스템관리자 role 에만 노출.
 *
 * 재사용: ment-mgmt feature (MentTable / MentFormDrawer / useMentQueries / mentApi).
 */
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button, Input, Select } from 'antd';
import { Network, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { mentApi } from '../../features/ment-mgmt/api/mentApi';
import MentFormDrawer, { type MentDrawerState } from '../../features/ment-mgmt/components/MentFormDrawer';
import MentTable from '../../features/ment-mgmt/components/MentTable';
import { mentQueryKeys, useDeleteMents, useSyncMents } from '../../features/ment-mgmt/hooks/useMentQueries';
import type { MentResponse } from '../../features/ment-mgmt/types';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const COMMON_TENANT_ID = 0;
/** 전 노드 공용 멘트(NODE_ID=0) — BE search 가 (nodeId = :nodeId or nodeId = 0) 범위로 조회. */
const ALL_NODE_ID = 0;

const breadcrumb = [
  { title: '미디어 관리', path: '/ipron/ment-common' },
  { title: '교환기 공용멘트 관리', path: '/ipron/ment-common' },
];

export default function MentCommonList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<MentResponse[]>([]);
  const [drawer, setDrawer] = useState<MentDrawerState>({ open: false });
  const [playingMentId, setPlayingMentId] = useState<number | null>(null);

  const hasInitializedNodeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [], isLoading: isNodesLoading } = useGetDnProfileNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  // (스코프 밖 노드는 아래 useQueries 에서 아예 조회하지 않음)
  const nodes = useScopedNodes(allNodes);

  // BE 목록 API 는 nodeId 필수(@RequestParam Long nodeId) → 노드별로 조회 후 병합.
  // 노드 Select 의 '전체' 선택 시 전 노드의 공용멘트를 한 그리드에 표시하기 위함.
  const nodeMentQueries = useQueries({
    queries: nodes.map((node) => ({
      queryKey: mentQueryKeys.getList({ nodeId: node.nodeId, tenantId: COMMON_TENANT_ID }).queryKey,
      queryFn: () => mentApi.getList({ nodeId: node.nodeId, tenantId: COMMON_TENANT_ID }),
    })),
  });

  const isLoading = isNodesLoading || nodeMentQueries.some((q) => q.isLoading);

  // BE search 범위가 (nodeId = :nodeId or nodeId = 0) 이라 전 노드 공용(NODE_ID=0) 행이
  // 노드별 응답마다 중복 포함됨 → ieMentId 기준 dedupe.
  const allRows = Array.from(
    new Map(
      nodeMentQueries
        .flatMap((q) => q.data ?? [])
        .filter((r) => r.tenantId === COMMON_TENANT_ID)
        .map((r) => [r.ieMentId, r] as const),
    ).values(),
  );

  // ─── Auto-select 첫 노드 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
      hasInitializedNodeRef.current = true;
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // ─── 그리드 표시용 행 (텍스트 검색 → 노드 필터) ────────────────────────────────
  const isSearching = searchText.trim().length > 0;
  const kw = searchText.trim().toLowerCase();
  const searchFilteredRows = isSearching
    ? allRows.filter((r) => [r.mentName, r.fileName, r.mentDesc, r.nodeName].some((f) => f != null && String(f).toLowerCase().includes(kw)))
    : allRows;

  // 검색 중이거나 '전체' 선택이면 노드 필터 미적용. 노드 선택 시 해당 노드 + 전 노드 공용(NODE_ID=0).
  const rowsForGrid = isSearching || selectedNodeId == null ? searchFilteredRows : searchFilteredRows.filter((r) => r.nodeId === selectedNodeId || r.nodeId === ALL_NODE_ID);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const selectedNodeName = selectedNodeId == null ? null : (nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null);
  const gridHeaderText = `${selectedNodeName ?? '전체'} 교환기 공용멘트 목록 (${rowsForGrid.length.toLocaleString()}건)`;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleNodeChange = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 검색 시작 시 노드 필터 자동 해제 → 전체 결과 표시
      setSelectedNodeId(null);
    }
  };

  const { mutate: deleteMents, isPending: isDeleting } = useDeleteMents({
    mutationOptions: {
      onSuccess: () => {
        toast.success('공용멘트가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });

  const { mutate: syncMents, isPending: isSyncing } = useSyncMents({
    mutationOptions: {
      onSuccess: (res) => {
        if (res && res.configured === false) {
          toast.info(res.message ?? '멘트파일 동기화(MS 송신)는 아직 연동되지 않았습니다');
        } else {
          toast.success(res?.message ?? '멘트파일 동기화가 완료되었습니다');
        }
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '동기화 실패')),
    },
  });

  const handleCreate = () => {
    // 공용멘트 = 공통(0) 고정. 전체(노드 미선택)면 드로어 안에서 노드를 선택.
    setDrawer({
      open: true,
      mode: 'create',
      nodeId: selectedNodeId,
      nodeName: selectedNodeName,
      tenantId: COMMON_TENANT_ID,
      tenantName: '공통',
      nodeOptions: selectedNodeId == null ? nodes.map((n) => ({ nodeId: n.nodeId, nodeName: n.nodeName })) : undefined,
    });
  };

  const handleEdit = (row: MentResponse) => {
    setDrawer({
      open: true,
      mode: 'edit',
      row,
      nodeId: row.nodeId,
      nodeName: nodes.find((n) => n.nodeId === row.nodeId)?.nodeName ?? null,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteMents(selectedRows.map((r) => r.ieMentId)),
      options: { title: '공용멘트 일괄 삭제', content: `선택한 ${selectedRows.length}건의 공용멘트를 삭제하시겠습니까?` },
    });
  };

  const handleSync = () => {
    if (selectedNodeId == null) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    modal.confirm.execute({
      onOk: () => syncMents(selectedNodeId),
      options: { title: '멘트파일 동기화', content: '선택한 노드의 모든 MS그룹에 멘트파일을 동기화하시겠습니까?' },
    });
  };

  // ─── 재생/정지 (미리듣기) ─────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setPlayingMentId(null);
  }, []);

  const handleTogglePlay = useCallback(
    async (row: MentResponse) => {
      if (playingMentId === row.ieMentId) {
        stopPlayback();
        return;
      }
      stopPlayback();
      try {
        const check = await mentApi.previewCheck(row.ieMentId);
        if (!check.fileExists) {
          toast.warning(check.message ?? '멘트 파일이 없습니다 (미업로드)');
          return;
        }
        const blob = await mentApi.preview(row.ieMentId);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => stopPlayback();
        audio.onerror = () => {
          toast.error('재생에 실패했습니다');
          stopPlayback();
        };
        setPlayingMentId(row.ieMentId);
        await audio.play();
      } catch (err: unknown) {
        toast.error(extractMsg(err, '미리듣기 실패'));
        stopPlayback();
      }
    },
    [playingMentId, stopPlayback],
  );

  useEffect(() => stopPlayback, [stopPlayback]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 Select + 요약 + 검색 + 동기화 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 선택 (공용멘트는 노드 단위 구성) */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => handleNodeChange(v === '__all__' ? null : Number(v))}
                options={[{ value: '__all__', label: '전체' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 총 공용멘트 (노드 필터 적용 기준) */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 공용멘트 <b className="text-gray-800 font-semibold">{rowsForGrid.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="멘트명 / 파일명 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button
                icon={<RefreshCw className="size-3.5" />}
                onClick={handleSync}
                loading={isSyncing}
                disabled={selectedNodeId == null}
                title={selectedNodeId == null ? '노드를 선택하세요' : '선택 노드의 모든 MS그룹에 멘트파일 동기화'}
              >
                멘트파일 동기화
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 하단: 공용멘트 목록 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            {selectedRows.length > 0 && <span className="text-xs text-gray-500">선택 {selectedRows.length}건</span>}
            <div className="ml-auto flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleDeleteSelected}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 공용멘트를 선택하세요' : '선택한 공용멘트 삭제'}
              >
                삭제
              </Button>
              <Button
                type="primary"
                icon={<Plus className="size-3.5" />}
                onClick={handleCreate}
                disabled={nodes.length === 0}
                title={nodes.length === 0 ? '등록 가능한 노드가 없습니다' : undefined}
              >
                공용멘트 등록
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <MentTable
              rowData={rowsForGrid}
              isLoading={isLoading}
              playingMentId={playingMentId}
              onRowDoubleClicked={handleEdit}
              onTogglePlay={handleTogglePlay}
              onSelectionChanged={setSelectedRows}
            />
          </div>
        </div>
      </div>

      <MentFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
