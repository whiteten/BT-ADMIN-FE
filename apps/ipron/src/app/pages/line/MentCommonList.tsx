/**
 * 교환기 공용멘트 관리 (시스템 관리자 전용).
 *
 * 공용멘트는 항상 전역(NODE_ID=0, TENANT_ID=0) — 노드 개념이 없다.
 * 상단 요약 + 검색 + 동기화, 하단 그리드 + 등록/수정/삭제/미리듣기.
 *
 * 공용멘트(TENANT_ID=0)는 전 테넌트가 공유하는 멘트로, SHARED_POOL 규칙상
 * 시스템 관리자만 생성/수정 가능(BE TenantGuard). 메뉴도 시스템관리자 role 에만 노출.
 *
 * 재사용: ment-mgmt feature (MentTable / MentFormDrawer / useMentQueries / mentApi).
 */
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { mentApi } from '../../features/ment-mgmt/api/mentApi';
import MentFormDrawer, { type MentDrawerState } from '../../features/ment-mgmt/components/MentFormDrawer';
import MentTable from '../../features/ment-mgmt/components/MentTable';
import { useDeleteMents, useGetMents, useSyncMents } from '../../features/ment-mgmt/hooks/useMentQueries';
import type { MentResponse } from '../../features/ment-mgmt/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 공용멘트는 항상 전역 저장 — 테넌트 공통(0) + 전 노드 공용(NODE_ID=0). */
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

  // ─── Queries ────────────────────────────────────────────────────────────────
  // 공용멘트는 전역(NODE_ID=0, TENANT_ID=0) 고정 — 단일 조회.
  // BE search 범위가 (nodeId = :nodeId or nodeId = 0) 이라 nodeId=0 → NODE_ID=0 행만 반환.
  const { data: rows = [], isLoading } = useGetMents({ params: { nodeId: ALL_NODE_ID, tenantId: COMMON_TENANT_ID } });

  // ─── 그리드 표시용 행 (검색어 필터만) ─────────────────────────────────────────
  const kw = searchText.trim().toLowerCase();
  const rowsForGrid = kw.length > 0 ? rows.filter((r) => [r.mentName, r.fileName, r.mentDesc].some((f) => f != null && String(f).toLowerCase().includes(kw))) : rows;

  const gridHeaderText = `교환기 공용멘트 목록 (${rowsForGrid.length.toLocaleString()}건)`;

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
    // 공용멘트 = 전역(NODE_ID=0, TENANT_ID=0) 고정. 노드 선택 UI 없음.
    setDrawer({
      open: true,
      mode: 'create',
      nodeId: ALL_NODE_ID,
      nodeName: '전역',
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
      nodeName: '전역',
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
    // 전역 공용멘트 동기화 — 노드 개념 없음(NODE_ID=0).
    modal.confirm.execute({
      onOk: () => syncMents(ALL_NODE_ID),
      options: { title: '멘트파일 동기화', content: '전역 공용멘트 파일을 모든 MS그룹에 동기화하시겠습니까?' },
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
        {/* ===== 상단: 요약 + 검색 + 동기화 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 요약 — 전역 공용멘트 총계 */}
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-gray-800 font-semibold">전역 공용멘트</span>
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
              <Button icon={<RefreshCw className="size-3.5" />} onClick={handleSync} loading={isSyncing} title="전역 공용멘트 파일을 모든 MS그룹에 동기화">
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
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
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
