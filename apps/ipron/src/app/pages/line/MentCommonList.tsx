/**
 * 교환기 공용멘트 관리 (시스템 관리자 전용).
 *
 * 멘트 관리(MentMgmtList)와 동일한 노드 탭 + 그리드 + 등록/수정/삭제/미리듣기/동기화지만,
 * 스코프를 공통(TENANT_ID=0) 으로 고정한다. 테넌트 카드 슬라이더 없음.
 *
 * 공용멘트(TENANT_ID=0)는 전 테넌트가 공유하는 멘트로, SHARED_POOL 규칙상
 * 시스템 관리자만 생성/수정 가능(BE TenantGuard). 메뉴도 시스템관리자 role 에만 노출.
 *
 * 재사용: ment-mgmt feature (MentTable / MentFormDrawer / useMentQueries / mentApi).
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { ChevronLeft, ChevronRight, Network, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { mentApi } from '../../features/ment-mgmt/api/mentApi';
import MentFormDrawer, { type MentDrawerState } from '../../features/ment-mgmt/components/MentFormDrawer';
import MentTable from '../../features/ment-mgmt/components/MentTable';
import { useDeleteMents, useGetMents, useSyncMents } from '../../features/ment-mgmt/hooks/useMentQueries';
import type { MentResponse } from '../../features/ment-mgmt/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const COMMON_TENANT_ID = 0;

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

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  // 선택 노드의 공통(TENANT_ID=0) 멘트만 조회.
  const { data: rows = [], isLoading } = useGetMents({
    params: selectedNodeId != null ? { nodeId: selectedNodeId, tenantId: COMMON_TENANT_ID } : undefined,
    queryOptions: { enabled: selectedNodeId != null },
  });

  // ─── Auto-select 첫 노드 탭 ───────────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
      hasInitializedNodeRef.current = true;
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // ─── 그리드 표시용 행 (공통만 + 텍스트 검색) ─────────────────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rows.filter((r) => r.tenantId === COMMON_TENANT_ID);
    const kw = searchText.trim().toLowerCase();
    if (kw) list = list.filter((r) => [r.mentName, r.fileName, r.mentDesc].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    return list;
  }, [rows, searchText]);

  const ctxNodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback((nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSearchText('');
  }, []);

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
    if (selectedNodeId == null) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    // 공용멘트 = 공통(0) 고정.
    setDrawer({ open: true, mode: 'create', nodeId: selectedNodeId, nodeName: ctxNodeName, tenantId: COMMON_TENANT_ID, tenantName: '공통' });
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
        {/* ===== 박스A: 노드 탭바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] border-r border-gray-200" title="공용멘트: 노드 단위 구성">
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
            </div>
          </div>
        </div>

        {/* ===== 박스B: 공용멘트 목록 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">교환기 공용멘트 목록</span>
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
                title={selectedRows.length === 0 ? '삭제할 공용멘트를 선택하세요' : '선택한 공용멘트 삭제'}
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
