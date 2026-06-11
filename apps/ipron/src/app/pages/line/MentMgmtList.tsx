/**
 * 교환기 멘트 관리 목록 페이지 (SWAT IPR20S1070).
 *
 * Pattern (IPRON 표준): 상단 노드 탭바 + 테넌트 카드 슬라이더(공통 포함) + 단일 ag-Grid.
 *   - 박스A: 노드 탭바 (멘트는 노드 단위 구성) + 검색 + 멘트파일 동기화 + 엑셀.
 *   - 박스B: 테넌트 카드 슬라이더 (공통[TID 0] + 테넌트별 멘트 수, 노드 종속).
 *   - 박스C: 멘트 목록 ag-Grid (멘트ID/테넌트/멘트명/파일명/설명/업로드일자/재생).
 *
 * 멘트 = 교환기 음성안내(PCM) 파일. 스코프: NODE_ID + TENANT_ID (0=공통).
 * 행 더블클릭 → 수정 Drawer. "멘트 등록" → 단일/다량 Drawer.
 *
 * 데이터: 선택 노드 단위 조회 후 테넌트 카드/검색은 클라이언트 필터.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Network, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { mentApi } from '../../features/ment-mgmt/api/mentApi';
import MentFormDrawer, { type MentDrawerState } from '../../features/ment-mgmt/components/MentFormDrawer';
import MentTable from '../../features/ment-mgmt/components/MentTable';
import MentTenantCard from '../../features/ment-mgmt/components/MentTenantCard';
import { useDeleteMents, useGetMents, useSyncMents } from '../../features/ment-mgmt/hooks/useMentQueries';
import type { MentResponse } from '../../features/ment-mgmt/types';
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
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null); // null=전체, 0=공통
  const [cardExpanded, setCardExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<MentResponse[]>([]);
  const [drawer, setDrawer] = useState<MentDrawerState>({ open: false });
  const [playingMentId, setPlayingMentId] = useState<number | null>(null);

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: rows = [], isLoading } = useGetMents({
    params: selectedNodeId != null ? { nodeId: selectedNodeId } : undefined,
    queryOptions: { enabled: selectedNodeId != null },
  });

  // ─── Auto-select 첫 노드 탭 ───────────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
      hasInitializedNodeRef.current = true;
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // ─── 테넌트 카드 (공통 0 포함, 멘트 수 집계) ────────────────────────────────────
  const tenantCards = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number }>();
    for (const r of rows) {
      if (r.tenantId == null) continue;
      if (!map.has(r.tenantId)) {
        map.set(r.tenantId, { id: r.tenantId, name: r.tenantId === 0 ? '공통' : (r.tenantName ?? `테넌트 ${r.tenantId}`), count: 0 });
      }
      map.get(r.tenantId)!.count += 1;
    }
    // 공통(0) 우선, 그 외 이름순
    return Array.from(map.values()).sort((a, b) => (a.id === 0 ? -1 : b.id === 0 ? 1 : a.name.localeCompare(b.name)));
  }, [rows]);

  const totalCount = rows.length;

  // ─── 그리드 표시용 행 (카드 + 텍스트 검색) ───────────────────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rows;
    if (selectedTenantId != null) list = list.filter((r) => r.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) list = list.filter((r) => [r.mentName, r.fileName, r.mentDesc].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    return list;
  }, [rows, selectedTenantId, searchText]);

  // 등록 컨텍스트 (선택 카드 → 테넌트, 없으면 공통 카드 우선)
  const ctxTenantId = selectedTenantId ?? (tenantCards.find((c) => c.id === 0) ? 0 : (tenantCards[0]?.id ?? null));
  const ctxTenantName = ctxTenantId === 0 ? '공통' : (tenantCards.find((c) => c.id === ctxTenantId)?.name ?? null);
  const ctxNodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback((nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedTenantId(null);
    setSearchText('');
  }, []);

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
    if (selectedNodeId == null) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    setDrawer({ open: true, mode: 'create', nodeId: selectedNodeId, nodeName: ctxNodeName, tenantId: ctxTenantId, tenantName: ctxTenantName });
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

  const handleDelete = (row: MentResponse) => {
    modal.confirm.execute({
      onOk: () => deleteMents([row.ieMentId]),
      options: {
        title: '멘트 삭제',
        content: `"${row.mentName ?? row.ieMentId}" 멘트를 삭제하시겠습니까?`,
      },
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

  // 엑셀 내보내기 — SWAT IPR20S1070 미존재 기능(신규 계획). BE 엔드포인트 미구현으로 비활성화.
  // 구현 완료 후 disabled 제거 + handleExport 연결.
  // const handleExport = async () => { ... };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 박스A: 노드 탭바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] border-r border-gray-200" title="교환기 멘트: 노드 단위 구성">
              <Network size={14} className="text-blue-600" />
              <span className="text-[8px] font-bold mt-0.5 text-blue-600">노드</span>
            </div>

            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {nodes.map((node) => {
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] w-[140px] flex-shrink-0 transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleTabSelect(node.nodeId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
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
              {/* 엑셀 내보내기: SWAT 미존재 신규 기능 — BE 엔드포인트 구현 전까지 숨김(disabled 노출 시 혼선) */}
              {/* <Button icon={<Download className="size-3.5" />} disabled title="준비 중">엑셀</Button> */}
            </div>
          </div>
        </div>

        {/* ===== 박스B: 테넌트 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {cardExpanded ? (
            <div className="flex items-center h-[124px] px-4 py-3">
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-1 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <MentTenantCard cardId={null} cardName="전체" count={totalCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                  {tenantCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[90px]">
                      <Empty description={false} imageStyle={{ height: 36 }} />
                      <span className="text-sm">등록된 멘트가 없습니다</span>
                    </div>
                  ) : (
                    tenantCards.map((c) => (
                      <MentTenantCard
                        key={c.id}
                        cardId={c.id}
                        cardName={c.name}
                        count={c.count}
                        selected={selectedTenantId === c.id}
                        onClick={(e) => {
                          setSelectedTenantId(c.id);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      />
                    ))
                  )}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <Button
                  type="text"
                  icon={<ChevronsUp className="size-4" />}
                  onClick={() => setCardExpanded(false)}
                  title="카드 접기"
                  className="!h-8 !w-8 !flex-shrink-0 !p-0 !text-gray-400 hover:!text-[#405189]"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-[44px] items-center px-4">
              <div className="flex w-full items-center gap-2">
                <div className="flex flex-1 items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* 전체 칩 */}
                  <button
                    type="button"
                    onClick={() => setSelectedTenantId(null)}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      selectedTenantId === null
                        ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                    }`}
                  >
                    <span className="font-medium">전체</span>
                    <span className={`text-[11px] ${selectedTenantId === null ? 'text-white/80' : 'text-gray-400'}`}>{totalCount}</span>
                  </button>
                  {tenantCards.map((c) => {
                    const selected = selectedTenantId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedTenantId(c.id)}
                        className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                          selected
                            ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                        }`}
                      >
                        <span className="max-w-[120px] truncate font-medium">{c.name}</span>
                        <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{c.count}</span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronsDown className="size-4" />}
                  onClick={() => setCardExpanded(true)}
                  title="카드 펼치기"
                  className="!h-8 !w-8 !flex-shrink-0 !p-0 !text-gray-400 hover:!text-[#405189]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== 박스C: 멘트 목록 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
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
                disabled={selectedNodeId == null}
                title={selectedNodeId == null ? '노드를 선택하세요' : undefined}
              >
                멘트 등록
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
              onBulkDelete={handleDeleteSelected}
              selectedCount={selectedRows.length}
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
