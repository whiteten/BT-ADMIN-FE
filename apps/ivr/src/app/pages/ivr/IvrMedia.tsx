/**
 * IVR 미디어 관리 페이지 (IPR20S6041).
 *
 * 구성 (옵션 A — 한 페이지 + 탭 3개):
 *  - 상단 박스: 노드 탭 (h-[56px], 시스템 검색) + 시스템 카드 슬라이더 (M 220×130, h-[170])
 *  - 하단 박스: 탭 3개 (Media Server / TTS Master / STT Master) + 컨텐츠 영역
 *
 * 시스템 카드:
 *  - 좌상단 시스템명 칩, 우상단 "⚡ MS" 녹색 칩 (Media Server 보유 시만)
 *  - 클릭 시 자동 중앙 스크롤
 *
 * 탭 우상단 [+ 추가] 버튼은 활성 탭에 따라 동작 분기:
 *  - Media Server 탭: 선택 시스템에 Media Server 등록 Drawer
 *  - TTS Master 탭: TTS Master 등록 Drawer (글로벌)
 *  - STT Master 탭: STT Master 등록 Drawer (글로벌)
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, Network, Plus, Radio, Search, Server, Volume2, Zap } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MediaServerPanel from '../../features/ivr-media/components/MediaServerPanel';
import MediaServerSheet, { type MediaServerSheetRef } from '../../features/ivr-media/components/MediaServerSheet';
import SttMasterSheet, { type SttMasterSheetRef } from '../../features/ivr-media/components/SttMasterSheet';
import TtsMasterSheet, { type TtsMasterSheetRef } from '../../features/ivr-media/components/TtsMasterSheet';
import { ivrMediaQueryKeys, useDeleteMediaServer, useGetForcusSystems, useGetNodes, useGetSttMasters, useGetTtsMasters } from '../../features/ivr-media/hooks/useIvrMediaQueries';
import SttMasterTab from '../../features/ivr-media/tabs/SttMasterTab';
import TtsMasterTab from '../../features/ivr-media/tabs/TtsMasterTab';
import type { IrMediaServer, IrSttMaster, IrSystemUsage, IrTtsMaster } from '../../features/ivr-media/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type TabKey = 'media' | 'tts' | 'stt';

const breadcrumb: BreadcrumbProps['items'] = [{ title: 'ForCus', path: '/ivr' }, { title: '회선관리' }, { title: '미디어 관리' }];

export default function IvrMedia() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initSystemId = searchParams.get('systemId') ? Number(searchParams.get('systemId')) : null;
  const initTab = (searchParams.get('tab') as TabKey | null) ?? 'media';

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(initSystemId);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>(initTab);
  const [ttsCount, setTtsCount] = useState(0);
  const [sttCount, setSttCount] = useState(0);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs (Drawers) ─────────────────────────────────────────────────────
  const mediaSheetRef = useRef<MediaServerSheetRef>(null);
  const ttsSheetRef = useRef<TtsMasterSheetRef>(null);
  const sttSheetRef = useRef<SttMasterSheetRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  // 모든 ForCus 시스템을 한 번에 가져옴 — 노드 카운트와 카드 MS 칩을 클라이언트에서 일괄 계산
  const { data: systems = [] } = useGetForcusSystems({
    params: {},
    queryOptions: { enabled: true },
  });

  // Media Server 탭 본문은 MediaServerPanel 컴포넌트가 자체적으로 useGetMediaServer 호출.

  // TTS/STT는 글로벌 — 탭에서 직접 사용 + 카운트 표시
  const { data: ttsMasters = [] } = useGetTtsMasters();
  const { data: sttMasters = [] } = useGetSttMasters();

  useEffect(() => {
    setTtsCount(ttsMasters.length);
  }, [ttsMasters.length]);

  useEffect(() => {
    setSttCount(sttMasters.length);
  }, [sttMasters.length]);

  // ─── Derived data ───────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredSystems = useMemo(() => {
    if (!isSearching) return systems;
    const kw = searchText.trim().toLowerCase();
    return systems.filter((s) => s.systemName?.toLowerCase().includes(kw));
  }, [systems, isSearching, searchText]);

  const filteredSystems = useMemo(() => {
    if (isSearching || selectedNodeId === null) return searchFilteredSystems;
    return searchFilteredSystems.filter((s) => s.nodeId === selectedNodeId);
  }, [searchFilteredSystems, selectedNodeId, isSearching]);

  // Auto-select 첫 시스템
  useEffect(() => {
    if (!selectedSystemId && filteredSystems.length > 0) {
      setSelectedSystemId(filteredSystems[0].systemId);
    }
  }, [filteredSystems, selectedSystemId]);

  const selectedSystem: IrSystemUsage | null = useMemo(() => {
    if (!selectedSystemId) return null;
    return systems.find((s) => s.systemId === selectedSystemId) ?? null;
  }, [systems, selectedSystemId]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteMediaServer } = useDeleteMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Media Server가 삭제되었습니다.');
        invalidateMediaServer();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.');
      },
    },
  });

  // ─── Invalidation ──────────────────────────────────────────────────────
  function invalidateMediaServer() {
    queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getMediaServer._def });
    // systems 응답의 hasMediaServer 플래그도 갱신 필요 — 미보유 시스템에 [+ Media Server] 버튼 재활성/카드 ⚡MS 칩 동기화
    queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getForcusSystems._def });
  }
  function invalidateTts() {
    queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getTtsMasters.queryKey });
  }
  function invalidateStt() {
    queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getSttMasters.queryKey });
  }

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    setSelectedSystemId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
    }
  };

  const handleCardSelect = (s: IrSystemUsage) => {
    setSelectedSystemId(s.systemId);
  };

  // 추가 버튼 — 활성 탭에 따라 분기
  const handleAdd = () => {
    if (activeTab === 'media') {
      if (!selectedSystem) {
        toast.error('Media Server를 등록할 시스템을 먼저 선택하세요.');
        return;
      }
      mediaSheetRef.current?.open(selectedSystem.systemId, selectedSystem.systemName);
    } else if (activeTab === 'tts') {
      ttsSheetRef.current?.open();
    } else {
      sttSheetRef.current?.open();
    }
  };

  // Media Server 편집/삭제 (Panel에서 호출)
  const handleMediaEdit = (sid: number, sname: string, data: IrMediaServer) => {
    mediaSheetRef.current?.open(sid, sname, data);
  };

  const handleMediaDelete = (sid: number) => {
    modal.confirm.execute({
      onOk: () => deleteMediaServer({ id: sid }),
      options: {
        title: 'Media Server 삭제',
        content: `시스템 "${selectedSystem?.systemName}"의 Media Server를 삭제하시겠습니까?`,
      },
    });
  };

  // TTS/STT 편집 (탭에서 호출)
  const handleTtsEdit = (row: IrTtsMaster) => ttsSheetRef.current?.open(row);
  const handleSttEdit = (row: IrSttMaster) => sttSheetRef.current?.open(row);

  // 추가 버튼 라벨/활성 여부
  // Media Server 탭: 시스템 미선택이거나 이미 보유 시 비활성 (시스템:Media Server = 1:1 제약)
  const addLabel = activeTab === 'media' ? 'Media Server' : activeTab === 'tts' ? 'TTS' : 'STT';
  const addDisabled = activeTab === 'media' && (!selectedSystem || selectedSystem.hasMediaServer);
  const addTitle =
    activeTab === 'media' && !selectedSystem
      ? '시스템을 먼저 선택하세요'
      : activeTab === 'media' && selectedSystem?.hasMediaServer
        ? '이미 Media Server가 등록된 시스템입니다'
        : undefined;

  // 시스템 카드 ⚡ MS 칩 — 백엔드 응답의 hasMediaServer 플래그 (모든 카드에 표시)
  const isMsSelected = (sid: number) => systems.find((s) => s.systemId === sid)?.hasMediaServer ?? false;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 헤더 박스: 노드 탭 바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 노드 탭 헤더 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
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
              <button
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                  selectedNodeId === null && !isSearching
                    ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]'
                    : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => {
                  setSelectedNodeId(null);
                  setSearchText('');
                  setSelectedSystemId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredSystems.length})</span>
              </button>

              {nodes.map((node) => {
                const nodeSystems = searchFilteredSystems.filter((s) => s.nodeId === node.nodeId);
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleNodeSelect(node.nodeId);
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest',
                      });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeSystems.length})</span>
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

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3 self-center">
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

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 시스템 카드 슬라이더 (M 사이즈 220×130, h-[170]) */}
          <div className="flex items-center px-4 py-3 h-[170px]">
            {filteredSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 시스템이 없습니다'}</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {filteredSystems.map((s) => {
                    const isSelected = selectedSystemId === s.systemId;
                    const hasMs = isMsSelected(s.systemId);
                    return (
                      <div
                        key={s.systemId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(s);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                      >
                        {/* Card header: 시스템명 + 우상단 MS 칩 */}
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-blue-50 text-[#405189] border border-blue-200 max-w-[120px] truncate"
                            title={s.systemName}
                          >
                            {s.systemName}
                          </span>
                          {hasMs && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0"
                              title="Media Server 보유"
                            >
                              <Zap className="size-3" />
                              MS
                            </span>
                          )}
                        </div>

                        {/* Card body: 시스템 메타 */}
                        <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{nodes.find((n) => n.nodeId === s.nodeId)?.nodeName ?? `Node ${s.nodeId}`}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Server className="size-3 text-gray-400" />
                            <span className="truncate">System ID: {s.systemId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== 하단 박스: 탭 3개 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex items-stretch border-b-2 border-gray-200 bg-white pr-3 h-[56px] flex-shrink-0">
            <TabButton
              active={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              icon={<Server className="size-3.5" />}
              label="Media Server"
              count={selectedSystem ? '시스템별' : '-'}
            />
            <TabButton active={activeTab === 'tts'} onClick={() => setActiveTab('tts')} icon={<Volume2 className="size-3.5" />} label="TTS Master" count={String(ttsCount)} />
            <TabButton active={activeTab === 'stt'} onClick={() => setActiveTab('stt')} icon={<Radio className="size-3.5" />} label="STT Master" count={String(sttCount)} />

            <div className="ml-auto flex items-center gap-2 self-center" title={addTitle}>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleAdd} disabled={addDisabled}>
                {addLabel} 추가
              </Button>
            </div>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'media' && (
              <MediaServerPanel systemId={selectedSystemId} systemName={selectedSystem?.systemName ?? ''} onEdit={handleMediaEdit} onDelete={handleMediaDelete} />
            )}
            {activeTab === 'tts' && <TtsMasterTab onEdit={handleTtsEdit} onCountChange={setTtsCount} />}
            {activeTab === 'stt' && <SttMasterTab onEdit={handleSttEdit} onCountChange={setSttCount} />}
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <MediaServerSheet ref={mediaSheetRef} onSuccess={invalidateMediaServer} />
      <TtsMasterSheet ref={ttsSheetRef} onSuccess={invalidateTts} />
      <SttMasterSheet ref={sttSheetRef} onSuccess={invalidateStt} />
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
