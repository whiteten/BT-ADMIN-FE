/**
 * 확장 어댑터 관리 (AS-IS IPR20S6042) — 목업
 * 베이스: 노드 선택 툴바 + 카드 슬라이더(헤더 포함) + 하단 2탭 그리드 패턴 (IvrMedia.tsx 하단 탭 규칙 동일)
 *
 * Layout:
 * ┌───────────────────────────────────────────────────────────┐
 * │ [노드▼]                              🔍[검색]              │  ← 노드 선택 툴바
 * │ 시스템 N개                                                 │  ← 카드 슬라이더 헤더
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
import { Button, Empty, Input, Select, Tag } from 'antd';
import { ChevronLeft, ChevronRight, Copy, Eye, Network, Plus, Puzzle, RotateCw, Search, Server, Trash2 } from 'lucide-react';
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

  const adaptorDrawerRef = useRef<AdaptorDrawerRef>(null);
  const batchCopyDialogRef = useRef<AdaptorBatchCopyDialogRef>(null);
  const watcherDrawerRef = useRef<WatcherDrawerRef>(null);
  // 그리드 ref (탭 전환 시 key 로 remount 되므로 한 시점에 하나만 마운트 → 단일 ref 공유)
  const gridRef = useRef<AgGridReact>(null);
  // 신규 추가 직후 그 행으로 스크롤/강조하기 위한 대기 정보 (탭 + getRowId 키)
  const pendingFocusRef = useRef<{ tab: BottomTab; id: string } | null>(null);
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

  // 신규 추가 성공: 목록 갱신 + 새 행을 해당 탭에서 스크롤/강조 대기 (수정/환경파일 저장 시 created 없음 → 기존 동작)
  const handleAdaptorDrawerSuccess = useCallback(
    (created?: Adaptor) => {
      invalidateAdaptors();
      if (created) {
        setBottomTab('adaptor');
        pendingFocusRef.current = { tab: 'adaptor', id: String(created.adaptorId) };
      }
    },
    [invalidateAdaptors],
  );

  const handleWatcherDrawerSuccess = useCallback(
    (created?: Watcher) => {
      invalidateWatchers();
      if (created) {
        setBottomTab('watcher');
        pendingFocusRef.current = { tab: 'watcher', id: String(created.watcherId) };
      }
    },
    [invalidateWatchers],
  );

  // 목록이 갱신되어 새 행이 그리드에 반영되면 그 행으로 스크롤/강조(1회). 선택 상태는 변경하지 않음.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending?.tab !== bottomTab) return;
    const list = pending.tab === 'adaptor' ? adaptors : watchers;
    const has = pending.tab === 'adaptor' ? list.some((a) => String((a as Adaptor).adaptorId) === pending.id) : list.some((w) => String((w as Watcher).watcherId) === pending.id);
    if (!has) return;
    pendingFocusRef.current = null;
    setTimeout(() => {
      const api = gridRef.current?.api;
      const node = api?.getRowNode(pending.id);
      if (api && node) {
        api.ensureNodeVisible(node, 'middle');
        api.flashCells({ rowNodes: [node] });
      }
    }, 100);
  }, [adaptors, watchers, bottomTab]);

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
        {/* ===== 상단: 노드 선택 툴바 (별도 박스) ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 flex-wrap h-full">
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select<number | 'all'>
                size="small"
                variant="borderless"
                value={isSearching ? undefined : (selectedNodeId ?? 'all')}
                onChange={(id) => handleNodeSelect(id === 'all' ? null : id)}
                options={[{ value: 'all' as const, label: '전체' }, ...nodes.map((node) => ({ value: node.nodeId, label: node.nodeName }))]}
                placeholder="노드 선택"
                style={{ width: 190 }}
                popupMatchSelectWidth={false}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="시스템 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
            </div>
          </header>
        </div>

        {/* ===== FOCUS 시스템 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100">
            <Server className="size-4 text-[#405189]" />
            <h3 className="text-sm font-semibold text-gray-800">시스템</h3>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredSystems.length}개</span>
          </div>
          <div className="flex items-center px-4 py-3 h-[150px]">
            {filteredSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} styles={{ image: { height: 36 } }} />
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
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[120px] flex-shrink-0 flex flex-col ${
                          isSel ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          setSelectedSystemId(sys.systemId);
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
          <div className="flex items-stretch border-b-2 border-gray-200 bg-white pr-5 h-[56px] flex-shrink-0">
            <TabButton
              active={bottomTab === 'adaptor'}
              onClick={() => setBottomTab('adaptor')}
              icon={<Puzzle className="size-3.5" />}
              label="Adaptor"
              count={String(adaptors.length)}
            />
            <TabButton
              active={bottomTab === 'watcher'}
              onClick={() => setBottomTab('watcher')}
              icon={<Eye className="size-3.5" />}
              label="Watcher"
              count={String(watchers.length)}
            />
            <div className="ml-auto flex items-center gap-2 self-center">
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
                    Adaptor 추가
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
          <div className="flex-1 min-h-0 p-5">
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
                ref={gridRef}
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
                ref={gridRef}
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
      <AdaptorDrawer ref={adaptorDrawerRef} onSuccess={handleAdaptorDrawerSuccess} />
      <AdaptorBatchCopyDialog ref={batchCopyDialogRef} onSuccess={invalidateAllAdaptors} />
      <WatcherDrawer ref={watcherDrawerRef} onSuccess={handleWatcherDrawerSuccess} />
    </div>
  );
}

// ─── 내부 컴포넌트: 탭 버튼 ────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: string;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors flex-shrink-0 ${
        active ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-400 border-b-transparent hover:text-gray-600'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[11px] text-gray-400 flex-shrink-0">({count})</span>
    </button>
  );
}
