/**
 * 교환기 멘트 관리 목록 페이지 (SWAT IPR20S1070).
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 노드 탭바 + 테넌트 카드 슬라이더 → 셀렉트박스 + 요약으로 단순화.
 *   - 스코프 필터: DN 관리와 동일 패턴 — 일반 모드=노드 Select("전체 노드" 포함),
 *     운영자 모드=테넌트 ScopeSelect + ↔(순서 전환) + 노드 Select. 기본값 전체 테넌트/전체 노드.
 *   - 옆에 요약(총 멘트).
 *   - 하단: 멘트 목록 ag-Grid.
 *
 * 멘트 = 교환기 음성안내(PCM) 파일. 스코프: NODE_ID + TENANT_ID (0=공통).
 * BE 목록 API 는 nodeId 필수 → 노드별 조회 후 병합(공용멘트 화면과 동일). "전체 노드"는 스코프 전 노드 병합.
 * 테넌트/검색은 클라이언트 필터.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button, Input, Select } from 'antd';
import { ArrowLeftRight, Network, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { mentApi } from '../../features/ment-mgmt/api/mentApi';
import MentFormDrawer, { type MentDrawerState } from '../../features/ment-mgmt/components/MentFormDrawer';
import MentTable from '../../features/ment-mgmt/components/MentTable';
import { mentQueryKeys, useDeleteMents, useSyncMents } from '../../features/ment-mgmt/hooks/useMentQueries';
import type { MentResponse } from '../../features/ment-mgmt/types';
import { useNodeTenantScope } from '../../features/node-scope/hooks/useNodeTenantScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '미디어 관리', path: '/ipron/ment-mgmt' },
  { title: '교환기 멘트 관리', path: '/ipron/ment-mgmt' },
];

export default function MentMgmtList() {
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

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();

  // 테넌트↔노드 스코프 — DN 관리와 동일 공통 규칙(기본 테넌트→노드, ↔로 뒤집기). useNodeTenantScope 참조.
  const {
    operatorMode,
    tenantFirst,
    toggleOrder,
    nodes,
    tenants: tenantOptions,
    selectedNodeId,
    setSelectedNodeId,
    tenantFilter,
    setTenantFilter,
    selectedTenantId,
  } = useNodeTenantScope(allNodes);

  // BE 목록 API 는 nodeId 필수 → 노드별 조회 후 병합(공용멘트 화면과 동일).
  // 특정 노드 선택 시 그 노드만, "전체 노드"(null) 선택 시 스코프 전 노드를 조회한다.
  const queryNodes = selectedNodeId != null ? nodes.filter((n) => n.nodeId === selectedNodeId) : nodes;
  const nodeMentQueries = useQueries({
    queries: queryNodes.map((node) => ({
      queryKey: mentQueryKeys.getList({ nodeId: node.nodeId }).queryKey,
      queryFn: () => mentApi.getList({ nodeId: node.nodeId }),
    })),
  });
  const isLoading = nodeMentQueries.some((q) => q.isLoading);

  // BE search 범위가 (nodeId = :nodeId or nodeId = 0) 이라 전 노드 공용 행이 노드별 응답마다
  // 중복 포함될 수 있음 → ieMentId 기준 dedupe.
  const rows = Array.from(new Map(nodeMentQueries.flatMap((q) => q.data ?? []).map((r) => [r.ieMentId, r] as const)).values());

  // ─── 테넌트별 멘트 건수 (ScopeSelect 뱃지) — 공통(0) 제외 ────────────────────────
  const mentCountByTenant = new Map<number, number>();
  for (const r of rows) {
    if (r.tenantId == null || r.tenantId === 0) continue;
    mentCountByTenant.set(r.tenantId, (mentCountByTenant.get(r.tenantId) ?? 0) + 1);
  }

  // ─── 헤더 요약 (총 멘트 — 공통 제외) ─────────────────────────────────────────────
  const summary = useMemo(() => ({ total: rows.filter((r) => r.tenantId !== 0).length }), [rows]);

  // ─── 그리드 표시용 행 (공통 제외 + 테넌트 + 텍스트 검색) ───────────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rows.filter((r) => r.tenantId !== 0); // 공통(0) 제외
    if (selectedTenantId != null) list = list.filter((r) => r.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) list = list.filter((r) => [r.mentName, r.fileName, r.mentDesc].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    return list;
  }, [rows, selectedTenantId, searchText]);

  // 등록 컨텍스트 (선택 테넌트 → 없으면 첫 테넌트)
  const ctxTenantId = selectedTenantId ?? tenantOptions[0]?.tenantId ?? null;
  const ctxTenantName = tenantOptions.find((c) => c.tenantId === ctxTenantId)?.tenantName ?? null;
  const ctxNodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const { mutate: deleteMents, isPending: isDeleting } = useDeleteMents({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멘트가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });

  const { mutate: syncMents, isPending: isSyncing } = useSyncMents({
    mutationOptions: {
      onSuccess: (res) => {
        // MS 송신부 미연동 시 configured:false — 안내 메시지 노출(메타/로컬파일은 정상).
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
    // 노드 미선택이면 드로어 안에서 노드를 선택 (스코프 노드 후보 전달)
    setDrawer({
      open: true,
      mode: 'create',
      nodeId: selectedNodeId,
      nodeName: ctxNodeName,
      tenantId: ctxTenantId,
      tenantName: ctxTenantName,
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
      options: { title: '멘트 일괄 삭제', content: `선택한 ${selectedRows.length}건의 멘트를 삭제하시겠습니까?` },
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

  // ─── 재생/정지 (미리듣기 — BE preview: PCM A-LAW→WAV) ─────────────────────────
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
      // 같은 행 토글 → 정지
      if (playingMentId === row.ieMentId) {
        stopPlayback();
        return;
      }
      stopPlayback();
      try {
        // 파일 없음은 에러가 아닌 소프트조건 → 재생 전 사전체크.
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

  // 언마운트 시 재생 정리
  useEffect(() => stopPlayback, [stopPlayback]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스A: 헤더 (노드/테넌트 스코프 + 요약) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 스코프 필터 — DN 관리와 동일. 기본 테넌트→노드, ↔ 버튼으로 순서 스위칭 */}
          {(() => {
            const nodeFilterEl = (
              <div key="node" className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
                <Network className="size-3.5 shrink-0 text-blue-600" />
                <Select
                  size="small"
                  variant="borderless"
                  value={selectedNodeId ?? '__all__'}
                  onChange={(v) => setSelectedNodeId(v === '__all__' ? null : Number(v))}
                  options={[{ value: '__all__', label: '전체 노드' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                  style={{ width: 150 }}
                  popupMatchSelectWidth={false}
                />
              </div>
            );
            const tenantFilterEl = (
              <ScopeSelect
                key="tenant"
                kind="tenant"
                options={tenantOptions.map((c) => ({ id: c.tenantId, name: c.tenantName, count: mentCountByTenant.get(c.tenantId) ?? 0 }))}
                value={tenantFilter == null ? null : String(tenantFilter)}
                onChange={(id) => {
                  setTenantFilter(id == null ? null : Number(id));
                  setSelectedRows([]);
                }}
              />
            );
            const swapBtnEl = (
              <button
                key="swap"
                type="button"
                onClick={toggleOrder}
                title="테넌트/노드 순서 전환"
                className="inline-flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-400 hover:text-[#405189] hover:border-[#c5cbe0] transition"
              >
                <ArrowLeftRight className="size-3.5" />
              </button>
            );
            // 일반 모드: 노드 Select만. 운영자 모드: 테넌트+노드(스위칭 가능).
            if (!operatorMode) return nodeFilterEl;
            return tenantFirst ? [tenantFilterEl, swapBtnEl, nodeFilterEl] : [nodeFilterEl, swapBtnEl, tenantFilterEl];
          })()}
          {/* 요약 — 총 멘트 (공통 제외) */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 멘트 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="멘트명 / 파일명 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              icon={<RefreshCw className="size-3.5" />}
              onClick={handleSync}
              loading={isSyncing}
              disabled={selectedNodeId == null}
              title="선택 노드의 모든 MS그룹에 멘트파일 동기화"
            >
              멘트파일 동기화
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스B: 멘트 목록 ag-Grid ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">교환기 멘트 목록</span>
          <span className="text-xs text-gray-500">
            총 {rowsForGrid.length.toLocaleString()}건{selectedRows.length > 0 ? ` · 선택 ${selectedRows.length}건` : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDeleteSelected}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 멘트를 선택하세요' : '선택한 멘트 삭제'}
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
              멘트 등록
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

      <MentFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
