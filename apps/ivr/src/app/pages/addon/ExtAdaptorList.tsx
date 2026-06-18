/**
 * 확장 어댑터 관리 (AS-IS IPR20S6042) — 목업
 * 베이스: MsGroupList (노드 탭 + 카드 슬라이더 + 하단 그리드 패턴)
 *
 * Layout:
 * ┌───────────────────────────────────────────────────────────┐
 * │ [전체] [노드1] [노드2] ...           🔍[검색]  [+어댑터 추가] │  ← 노드 탭 바
 * │ [SYS Card] [SYS Card] ...                                  │  ← FOCUS 시스템 카드
 * ├───────────────────────────────────────────────────────────┤
 * │ [어댑터] [Watcher]                 (탭별 액션 버튼)          │  ← 2탭
 * │ ag-Grid (선택 탭)                                          │
 * └───────────────────────────────────────────────────────────┘
 *
 * ※ 목업: 데이터는 mock. 동작 구현 범위 = 어댑터 추가 + 환경파일 등록 (Drawer).
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Tag } from 'antd';
import { ChevronLeft, ChevronRight, Copy, Layers, Network, Plus, RotateCw, Search, Server, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AdaptorBatchCopyDialog, { type AdaptorBatchCopyDialogRef } from '../../features/ext-adaptor/components/AdaptorBatchCopyDialog';
import AdaptorDrawer, { type AdaptorDrawerRef } from '../../features/ext-adaptor/components/AdaptorDrawer';
import WatcherDrawer, { type WatcherDrawerRef } from '../../features/ext-adaptor/components/WatcherDrawer';
import {
  extAdaptorQueryKeys,
  useDeleteAdaptor,
  useDeleteWatcher,
  useGetAdaptors,
  useGetForcusSystems,
  useGetNodes,
  useGetWatchers,
  useRestartWatcher,
} from '../../features/ext-adaptor/hooks/useExtAdaptorQueries';
import { ADAPTOR_CONN_TYPE_LABELS, ADAPTOR_HA_ROLE_LABELS, ADAPTOR_TYPE_LABELS, type Adaptor, type Watcher } from '../../features/ext-adaptor/types/extAdaptor';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import { codeCol, codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

const breadcrumb = [
  { title: '부가기능 관리', path: '/ivr/addon/ext-adaptor' },
  { title: '확장 어댑터 관리', path: '/ivr/addon/ext-adaptor' },
];

type BottomTab = 'adaptor' | 'watcher';

export default function ExtAdaptorList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [bottomTab, setBottomTab] = useState<BottomTab>('adaptor');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const adaptorDrawerRef = useRef<AdaptorDrawerRef>(null);
  const batchCopyDialogRef = useRef<AdaptorBatchCopyDialogRef>(null);
  const watcherDrawerRef = useRef<WatcherDrawerRef>(null);
  const queryClient = useQueryClient();
  const deleteAdaptorMutation = useDeleteAdaptor();
  const deleteWatcherMutation = useDeleteWatcher();
  const restartWatcherMutation = useRestartWatcher();

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  const { data: systems = [] } = useGetForcusSystems({ params: {} }); // 전체 FOCUS 시스템 (노드 필터는 클라이언트)
  const { data: adaptors = [], isLoading: isAdaptorsLoading } = useGetAdaptors({
    params: selectedSystemId ? { systemId: selectedSystemId } : undefined,
    queryOptions: { enabled: !!selectedSystemId },
  });
  const { data: watchers = [], isLoading: isWatchersLoading } = useGetWatchers({
    params: selectedSystemId ? { systemId: selectedSystemId } : undefined,
    queryOptions: { enabled: !!selectedSystemId },
  });

  const invalidateAdaptors = useCallback(() => {
    if (selectedSystemId) {
      queryClient.invalidateQueries({ queryKey: extAdaptorQueryKeys.getAdaptors({ systemId: selectedSystemId }).queryKey });
    }
  }, [queryClient, selectedSystemId]);

  const invalidateWatchers = useCallback(() => {
    if (selectedSystemId) {
      queryClient.invalidateQueries({ queryKey: extAdaptorQueryKeys.getWatchers({ systemId: selectedSystemId }).queryKey });
    }
  }, [queryClient, selectedSystemId]);

  const isSearching = searchText.trim().length > 0;

  const filteredSystems = useMemo(() => {
    let list = systems;
    if (isSearching) {
      const kw = searchText.trim().toLowerCase();
      return list.filter((s) => s.systemName.toLowerCase().includes(kw));
    }
    if (selectedNodeId != null) list = list.filter((s) => s.nodeId === selectedNodeId);
    return list;
  }, [systems, isSearching, searchText, selectedNodeId]);

  // 진입/필터 변경 시 첫 시스템 자동 선택
  useEffect(() => {
    if (!selectedSystemId && filteredSystems.length > 0) {
      setSelectedSystemId(filteredSystems[0].systemId);
    }
  }, [filteredSystems, selectedSystemId]);

  const selectedSystem = useMemo(() => systems.find((s) => s.systemId === selectedSystemId) ?? null, [systems, selectedSystemId]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
    setSelectedSystemId(null);
    setSearchText('');
  };
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
      setSelectedSystemId(null);
    }
  };
  const handleAddAdaptor = () => {
    if (!selectedSystem) {
      toast.warning('시스템을 선택하세요');
      return;
    }
    if (adaptors.length >= 100) {
      toast.warning('한 시스템에 어댑터는 100개까지 추가할 수 있습니다');
      return;
    }
    adaptorDrawerRef.current?.open(null, selectedSystem.systemId, selectedSystem.systemName, selectedSystem.nodeId);
  };
  const handleEditAdaptor = (a: Adaptor) => {
    if (!selectedSystem) return;
    adaptorDrawerRef.current?.open(a, selectedSystem.systemId, selectedSystem.systemName, selectedSystem.nodeId);
  };
  const handleDeleteAdaptor = (a: Adaptor) => {
    modal.confirm.execute({
      onOk: () =>
        deleteAdaptorMutation.mutate(
          { adaptorId: a.adaptorId, systemId: a.systemId },
          {
            onSuccess: () => {
              toast.success('어댑터가 삭제되었습니다');
              invalidateAdaptors();
            },
          },
        ),
      options: { title: '어댑터 삭제', content: `"${a.adaptorName}" 어댑터를 삭제하시겠습니까?` },
    });
  };
  const handleBatchCopy = () => {
    if (!selectedSystem) {
      toast.warning('원본 시스템을 선택하세요');
      return;
    }
    if (adaptors.length === 0) {
      toast.warning('복사할 어댑터가 없습니다');
      return;
    }
    // 대상 후보 = 전체 FOCUS 시스템에서 원본 제외 (AS-IS selTargetSystem 과 동일 모집단)
    const candidates = systems.filter((s) => s.systemId !== selectedSystem.systemId);
    if (candidates.length === 0) {
      toast.warning('복사할 대상 시스템이 없습니다');
      return;
    }
    batchCopyDialogRef.current?.open(selectedSystem, candidates);
  };
  const invalidateAllAdaptors = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: extAdaptorQueryKeys.getAdaptors._def });
  }, [queryClient]);
  // ─── Watcher (시스템당 1건) ─────────────────────────────────────────────
  const handleAddWatcher = () => {
    if (!selectedSystem) {
      toast.warning('시스템을 선택하세요');
      return;
    }
    if (watchers.length >= 1) {
      toast.warning('Watcher는 시스템당 1개만 등록할 수 있습니다');
      return;
    }
    watcherDrawerRef.current?.open(null, selectedSystem.systemId, selectedSystem.systemName, selectedSystem.nodeId);
  };
  const handleEditWatcher = (w: Watcher) => {
    if (!selectedSystem) return;
    watcherDrawerRef.current?.open(w, selectedSystem.systemId, selectedSystem.systemName, selectedSystem.nodeId);
  };
  const handleDeleteWatcher = (w: Watcher) => {
    if (!selectedSystem) return;
    modal.confirm.execute({
      onOk: () =>
        deleteWatcherMutation.mutate(
          { watcherId: w.watcherId, systemId: selectedSystem.systemId },
          {
            onSuccess: () => {
              toast.success('Watcher가 삭제되었습니다');
              invalidateWatchers();
            },
          },
        ),
      options: { title: 'Watcher 삭제', content: `"${w.watcherName}" Watcher를 삭제하시겠습니까?` },
    });
  };
  const handleRestartWatcher = () => {
    if (!selectedSystem) {
      toast.warning('시스템을 선택하세요');
      return;
    }
    if (watchers.length === 0) {
      toast.warning('등록된 Watcher 환경파일이 없습니다');
      return;
    }
    modal.confirm.execute({
      onOk: () =>
        restartWatcherMutation.mutate(
          { systemId: selectedSystem.systemId },
          {
            onSuccess: () => toast.success('Watcher 재시작 요청이 전송되었습니다'),
            onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? 'Watcher 재시작에 실패했습니다'),
          },
        ),
      options: { title: 'Watcher 재시작', content: `"${selectedSystem.systemName}" 시스템의 Watcher를 재시작하시겠습니까?` },
    });
  };

  // ─── Grid columns ──────────────────────────────────────────────────────
  const adaptorColumnDefs: ColDef<Adaptor>[] = useMemo(
    () => [
      {
        headerName: '사용유무',
        field: 'useYn',
        width: 90,
        cellRenderer: (p: { value?: number }) => (p.value === 1 ? <Tag color="green">사용</Tag> : <Tag>미사용</Tag>),
        ...codeFilter<Adaptor>('useYn', { 1: '사용', 0: '미사용' }),
      },
      { headerName: 'Trans ID', field: 'transId', width: 100 },
      { headerName: '이름', field: 'adaptorName', flex: 1, minWidth: 140 },
      { headerName: '종류', field: 'adaptorType', width: 100, ...codeCol<Adaptor>('adaptorType', ADAPTOR_TYPE_LABELS) },
      { headerName: '동작방식', field: 'haRole', width: 110, ...codeCol<Adaptor>('haRole', ADAPTOR_HA_ROLE_LABELS) },
      { headerName: 'IP', field: 'connIp', width: 130 },
      { headerName: 'PORT', field: 'connPort', width: 90 },
      { headerName: '접속방식', field: 'connType', width: 110, ...codeCol<Adaptor>('connType', ADAPTOR_CONN_TYPE_LABELS) },
      { headerName: '응답대기(초)', field: 'respTimeout', width: 110 },
      { headerName: '감시주기(초)', field: 'aliveInterval', width: 110 },
      { headerName: '작업자', field: 'workUserName', width: 100 },
      {
        headerName: '',
        colId: 'actions',
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: Adaptor }) =>
          p.data ? (
            <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteAdaptor(p.data as Adaptor)}>
              <Trash2 className="size-4" />
            </button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adaptors],
  );

  const watcherColumnDefs: ColDef<Watcher>[] = useMemo(
    () => [
      { headerName: 'WATCHER ID', field: 'watcherId', width: 110 },
      { headerName: 'WATCHER 이름', field: 'watcherName', flex: 1, minWidth: 160 },
      { headerName: '설명', field: 'watcherDesc', flex: 1, minWidth: 160 },
      { headerName: '파일위치', field: 'filePath', flex: 2, minWidth: 200, tooltipField: 'filePath' },
      { headerName: '작업자', field: 'workUserName', width: 100 },
      {
        headerName: '',
        colId: 'actions',
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: Watcher }) =>
          p.data ? (
            <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteWatcher(p.data as Watcher)}>
              <Trash2 className="size-4" />
            </button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSystem],
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 좌측 탭 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>
            <div ref={tabScrollRef} className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200" style={{ scrollbarWidth: 'none' }}>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] flex-shrink-0 transition-colors ${
                  selectedNodeId === null && !isSearching
                    ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]'
                    : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => handleNodeSelect(null)}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({systems.length})</span>
              </button>
              {nodes.map((node) => {
                const cnt = systems.filter((s) => s.nodeId === node.nodeId).length;
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={() => handleNodeSelect(node.nodeId)}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({cnt})</span>
                  </button>
                );
              })}
            </div>
            {/* 우측 탭 스크롤 버튼 */}
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
                placeholder="시스템 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
            </div>
          </div>
        </div>

        {/* ===== FOCUS 시스템 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[150px]">
            {filteredSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 36 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '시스템이 없습니다'}</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                  {filteredSystems.map((sys) => {
                    const isSel = selectedSystemId === sys.systemId;
                    return (
                      <div
                        key={sys.systemId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[110px] flex-shrink-0 flex flex-col ${
                          isSel ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          setSelectedSystemId(sys.systemId);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5 min-w-0">
                          <Server className="size-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">{sys.systemName}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{sys.nodeName}</span>
                          </div>
                          <div>어댑터: {sys.adaptorCount ?? 0}개</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== 하단: 어댑터 / Watcher 2탭 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* 탭 바 + 액션 */}
          <div className="flex items-stretch border-b-2 border-gray-200 pr-3 h-[48px] flex-shrink-0">
            {(['adaptor', 'watcher'] as BottomTab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`w-[140px] flex items-center justify-center gap-2 px-3 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
                  bottomTab === t ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => setBottomTab(t)}
              >
                {t === 'adaptor' ? '어댑터' : 'Watcher'}
                <span className="text-[11px] text-gray-400">({t === 'adaptor' ? adaptors.length : watchers.length})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {bottomTab === 'adaptor' ? (
                <>
                  <Button
                    icon={<Copy className="size-3.5" />}
                    onClick={handleBatchCopy}
                    disabled={!selectedSystem || adaptors.length === 0}
                    title={adaptors.length === 0 ? '복사할 어댑터가 없습니다' : '다른 시스템으로 어댑터 일괄 복사'}
                  >
                    배치복사
                  </Button>
                  <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleAddAdaptor} disabled={!selectedSystem}>
                    어댑터 추가
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    icon={<RotateCw className="size-3.5" />}
                    onClick={handleRestartWatcher}
                    loading={restartWatcherMutation.isPending}
                    disabled={!selectedSystem || watchers.length === 0}
                    title={watchers.length === 0 ? '등록된 Watcher가 없습니다' : '선택 시스템의 Watcher 재시작'}
                  >
                    재시작
                  </Button>
                  <Button
                    type="primary"
                    icon={<Plus className="size-3.5" />}
                    onClick={handleAddWatcher}
                    disabled={!selectedSystem || watchers.length >= 1}
                    title={watchers.length >= 1 ? 'Watcher는 시스템당 1개만 등록할 수 있습니다' : undefined}
                  >
                    Watcher 추가
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 그리드 */}
          <div className="flex-1 min-h-0">
            {!selectedSystem ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">상단에서 시스템을 선택하세요</span>
              </div>
            ) : bottomTab === 'adaptor' ? (
              // key 로 인스턴스 분리 — 같은 위치의 <AgGridReact> 라 React 가 인스턴스를 재사용하면
              // 어댑터 탭의 onRowDoubleClicked(handleEditAdaptor) 가 watcher 그리드에 잔존해
              // watcher 행 더블클릭 시 어댑터 수정 Drawer 가 열리는 버그가 발생한다. (탭 전환 시 완전 remount)
              <AgGridReact<Adaptor>
                key="adaptor-grid"
                rowData={adaptors}
                columnDefs={adaptorColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                loading={isAdaptorsLoading}
                getRowId={(p) => String(p.data.adaptorId)}
                onRowDoubleClicked={(e) => e.data && handleEditAdaptor(e.data)}
              />
            ) : (
              <AgGridReact<Watcher>
                key="watcher-grid"
                rowData={watchers}
                columnDefs={watcherColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                loading={isWatchersLoading}
                getRowId={(p) => String(p.data.watcherId)}
                onRowDoubleClicked={(e) => e.data && handleEditWatcher(e.data)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Drawer */}
      <AdaptorDrawer ref={adaptorDrawerRef} onSuccess={invalidateAdaptors} />
      <AdaptorBatchCopyDialog ref={batchCopyDialogRef} onSuccess={invalidateAllAdaptors} />
      <WatcherDrawer ref={watcherDrawerRef} onSuccess={invalidateWatchers} />
    </div>
  );
}
