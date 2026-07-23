/**
 * 교환기 공용멘트 관리 (시스템 관리자 전용).
 *
 * 공용멘트는 항상 테넌트 공통(TENANT_ID=0) — 테넌트 개념이 없다. 단, **노드는 선택 가능**하다:
 *   설치 기본은 노드0(전역=전체 노드 공용)이며, 특정 노드에만 유효한 공용멘트도 등록할 수 있다.
 *   → 상단에 노드 드롭다운("전체 노드" 포함)만 두고, 테넌트 드롭다운/ScopeSelect 는 두지 않는다.
 *
 * 공용멘트(TENANT_ID=0)는 전 테넌트가 공유하는 멘트로, SHARED_POOL 규칙상
 * 시스템 관리자만 생성/수정 가능(BE TenantGuard). 메뉴도 시스템관리자 role 에만 노출.
 *
 * BE 목록 API 는 nodeId 필수 → 노드별 조회 후 병합(멘트 관리 화면과 동일). "전체 노드"는 스코프 전 노드 병합.
 * BE search 범위가 (nodeId = :nodeId or nodeId = 0) 이라 NODE_ID=0 전역 공용행이 노드별 응답마다
 * 중복 포함될 수 있으므로 ieMentId 기준 dedupe 필수.
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
import { useNodeTenantScope } from '../../features/node-scope/hooks/useNodeTenantScope';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 공용멘트는 항상 테넌트 공통(0). 노드 미지정(전역) 저장 시 NODE_ID=0. */
const COMMON_TENANT_ID = 0;
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
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<MentResponse[]>([]);
  const [drawer, setDrawer] = useState<MentDrawerState>({ open: false });
  const [playingMentId, setPlayingMentId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // ─── 노드 스코프 (테넌트 무관 — 노드 선택만 사용) ──────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();
  // useNodeTenantScope 의 노드 부분만 사용. 테넌트(tenants/tenantFilter/operatorMode/swap)는 공용멘트에 불필요.
  const { nodes, selectedNodeId, setSelectedNodeId } = useNodeTenantScope(allNodes);

  // ─── Queries (노드별 조회 후 병합 — 각 tenantId=0 공통) ──────────────────────────
  // 특정 노드 선택 시 그 노드만, "전체 노드"(null) 선택 시 스코프 전 노드를 조회한다.
  const queryNodes = selectedNodeId != null ? nodes.filter((n) => n.nodeId === selectedNodeId) : nodes;
  const nodeMentQueries = useQueries({
    queries: queryNodes.map((node) => ({
      queryKey: mentQueryKeys.getList({ nodeId: node.nodeId, tenantId: COMMON_TENANT_ID }).queryKey,
      queryFn: () => mentApi.getList({ nodeId: node.nodeId, tenantId: COMMON_TENANT_ID }),
    })),
  });
  const isLoading = nodeMentQueries.some((q) => q.isLoading);

  // BE search 범위가 (nodeId = :nodeId or nodeId = 0) 이라 전역 공용 행이 노드별 응답마다
  // 중복 포함될 수 있음 → ieMentId 기준 dedupe.
  const rows = Array.from(new Map(nodeMentQueries.flatMap((q) => q.data ?? []).map((r) => [r.ieMentId, r] as const)).values());

  // ─── 그리드 표시용 행 (노드 필터 + 검색어) ─────────────────────────────────────────
  // 특정 노드 선택 시: 그 노드 + NODE_ID=0(전역) 표시. "전체 노드"면 전부.
  const kw = searchText.trim().toLowerCase();
  let rowsForGrid = selectedNodeId != null ? rows.filter((r) => r.nodeId === selectedNodeId || r.nodeId === ALL_NODE_ID) : rows;
  if (kw.length > 0) {
    rowsForGrid = rowsForGrid.filter((r) => [r.mentName, r.fileName, r.mentDesc].some((f) => f != null && String(f).toLowerCase().includes(kw)));
  }

  const gridHeaderText = `교환기 공용멘트 목록 (${rowsForGrid.length.toLocaleString()}건)`;

  // 등록/동기화 컨텍스트 노드
  const ctxNodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

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
        if (res?.configured === false) {
          toast.info(res.message ?? '멘트파일 동기화(MS 송신)는 아직 연동되지 않았습니다');
        } else {
          toast.success(res?.message ?? '멘트파일 동기화가 완료되었습니다');
        }
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '동기화 실패')),
    },
  });

  const handleCreate = () => {
    // 특정 노드 선택 시 그 노드로, "전체 노드"면 전역(NODE_ID=0)으로 저장. 테넌트는 항상 공통(0).
    setDrawer({
      open: true,
      mode: 'create',
      nodeId: selectedNodeId ?? ALL_NODE_ID,
      nodeName: ctxNodeName ?? '전역',
      tenantId: COMMON_TENANT_ID,
      tenantName: '공통',
    });
  };

  const handleEdit = (row: MentResponse) => {
    setDrawer({
      open: true,
      mode: 'edit',
      row,
      nodeId: row.nodeId,
      nodeName: nodes.find((n) => n.nodeId === row.nodeId)?.nodeName ?? (row.nodeId === ALL_NODE_ID ? '전역' : null),
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
    // 선택 노드 기준 동기화("전체 노드"면 전역 0).
    const syncNodeId = selectedNodeId ?? ALL_NODE_ID;
    const content =
      selectedNodeId != null
        ? `선택한 노드(${ctxNodeName ?? syncNodeId})의 모든 MS그룹에 공용멘트 파일을 동기화하시겠습니까?`
        : '전역 공용멘트 파일을 모든 MS그룹에 동기화하시겠습니까?';
    modal.confirm.execute({
      onOk: () => syncMents(syncNodeId),
      options: { title: '멘트파일 동기화', content },
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
        {/* ===== 상단: 노드 필터 + 요약 + 검색 + 동기화 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 필터 — "전체 노드" 포함. 테넌트 드롭다운은 없음(공용멘트는 테넌트 무관). */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => {
                  setSelectedNodeId(v === '__all__' ? null : Number(v));
                  setSelectedRows([]);
                }}
                options={[{ value: '__all__', label: '전체 노드' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 공용멘트 총계 */}
            <div className="flex items-center gap-2 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-800 font-semibold">공용멘트</span>
              <span className="text-gray-500">
                총 <b className="text-gray-800 font-semibold">{rowsForGrid.length.toLocaleString()}</b>건
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
                title={selectedNodeId != null ? '선택 노드의 모든 MS그룹에 공용멘트 파일을 동기화' : '전역 공용멘트 파일을 모든 MS그룹에 동기화'}
              >
                멘트파일 동기화
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 하단: 공용멘트 목록 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0">
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
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                공용멘트 등록
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div className="flex-1 min-h-0 p-5">
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
