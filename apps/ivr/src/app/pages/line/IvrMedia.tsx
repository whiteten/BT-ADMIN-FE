/**
 * IVR 미디어 관리 페이지 (IPR20S6041).
 *
 * 구성:
 *  - 상단 박스: 노드 선택 툴바(h-[56px]) + 시스템 검색 + TTS/STT 관리 버튼(전역 마스터 — 시스템 무관)
 *  - 카드 슬라이더 박스: FOCUS 시스템 카드
 *  - 하단 박스: 선택 시스템의 Media Server 정보(단일 헤더 — 탭 없음)
 *
 * 시스템 카드:
 *  - 좌상단 시스템명 칩, 우상단 "⚡ MS" 녹색 칩 (Media Server 보유 시만)
 *  - 클릭 시 자동 중앙 스크롤
 *
 * TTS/STT Master 는 시스템·노드 FK가 없는 전역 마스터라 시스템 카드 슬라이더와 무관 —
 * 상단 [TTS 관리]/[STT 관리] 버튼으로 별도 관리 Drawer(TtsManageDrawer/SttManageDrawer)를 열어 관리한다.
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Empty, Input, Select } from 'antd';
import { ChevronLeft, ChevronRight, Network, Pencil, Plus, Radio, Search, Server, Trash2, Volume2, Zap } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MediaServerPanel from '../../features/ivr-media/components/MediaServerPanel';
import MediaServerSheet, { type MediaServerSheetRef } from '../../features/ivr-media/components/MediaServerSheet';
import SttManageDrawer, { type SttManageDrawerRef } from '../../features/ivr-media/components/SttManageDrawer';
import TtsManageDrawer, { type TtsManageDrawerRef } from '../../features/ivr-media/components/TtsManageDrawer';
import { ivrMediaQueryKeys, useDeleteMediaServer, useGetForcusSystems, useGetMediaServer, useGetNodes } from '../../features/ivr-media/hooks/useIvrMediaQueries';
import type { IrMediaServer, IrSystemUsage } from '../../features/ivr-media/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '회선관리' }, { title: '미디어 관리', path: '/ivr/line/media' }];

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

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(initSystemId);
  const [searchText, setSearchText] = useState('');

  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs (Drawers) ─────────────────────────────────────────────────────
  const mediaSheetRef = useRef<MediaServerSheetRef>(null);
  const ttsManageDrawerRef = useRef<TtsManageDrawerRef>(null);
  const sttManageDrawerRef = useRef<SttManageDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  // 모든 ForCus 시스템을 한 번에 가져옴 — 노드 카운트와 카드 MS 칩을 클라이언트에서 일괄 계산
  const { data: systems = [] } = useGetForcusSystems({
    params: {},
    queryOptions: { enabled: true },
  });

  // Media Server 패널은 MediaServerPanel 컴포넌트가 자체적으로 useGetMediaServer 호출.
  // TTS/STT Master 는 시스템·노드 FK 없는 전역 마스터 — TtsManageDrawer/SttManageDrawer 가 각자 조회를 책임진다.

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

  // 헤더의 편집/삭제 버튼 노출 판정 + 편집 시 초기값 전달용 — MediaServerPanel과 동일 파라미터라 쿼리 캐시 공유(중복 요청 없음).
  const { data: mediaServerData } = useGetMediaServer({
    params: selectedSystemId ? { id: selectedSystemId } : undefined,
    queryOptions: { enabled: !!selectedSystemId },
  });

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

  // Media Server 추가 — 시스템 미선택이거나 이미 보유 시 비활성 (시스템:Media Server = 1:1 제약)
  const handleAddMedia = () => {
    if (!selectedSystem) {
      toast.error('Media Server를 등록할 시스템을 먼저 선택하세요.');
      return;
    }
    mediaSheetRef.current?.open(selectedSystem.systemId, selectedSystem.systemName);
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

  const addDisabled = !selectedSystem || selectedSystem.hasMediaServer;
  const addTitle = !selectedSystem ? '시스템을 먼저 선택하세요' : selectedSystem.hasMediaServer ? '이미 Media Server가 등록된 시스템입니다' : undefined;

  // 시스템 카드 ⚡ MS 칩 — 백엔드 응답의 hasMediaServer 플래그 (모든 카드에 표시)
  const isMsSelected = (sid: number) => systems.find((s) => s.systemId === sid)?.hasMediaServer ?? false;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 헤더 박스: 노드 선택 툴바 ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 flex-wrap h-full">
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select<number | 'all'>
                size="small"
                variant="borderless"
                value={isSearching ? undefined : (selectedNodeId ?? 'all')}
                onChange={(id) => {
                  if (id === 'all') {
                    setSelectedNodeId(null);
                    setSearchText('');
                    setSelectedSystemId(null);
                  } else {
                    handleNodeSelect(id);
                  }
                }}
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
              <Button type="primary" icon={<Volume2 className="size-3.5" />} onClick={() => ttsManageDrawerRef.current?.open()}>
                TTS 관리
              </Button>
              <Button type="primary" icon={<Radio className="size-3.5" />} onClick={() => sttManageDrawerRef.current?.open()}>
                STT 관리
              </Button>
            </div>
          </header>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100">
            <Server className="size-4 text-[#405189]" />
            <span className="text-sm font-semibold text-gray-800">시스템</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredSystems.length}개</span>
          </div>
          {/* 시스템 카드 슬라이더 (IVR DN그룹 카드와 동일 형태, 220×120, h-[150]) */}
          <div className="flex items-center px-4 py-3 h-[150px]">
            {filteredSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                <Empty description={false} styles={{ image: { height: 40 } }} />
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
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[120px] flex-shrink-0 flex flex-col ${
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
                        {/* Card header: Server 아이콘 + 시스템명 + MS 보유 칩(아이콘) */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Server className="size-3.5 text-[#405189] flex-shrink-0" />
                            <span className="text-[14px] font-semibold text-gray-800 truncate" title={s.systemName}>
                              {s.systemName}
                            </span>
                          </div>
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

                        {/* Card body: 시스템 메타 (System ID 미표시) */}
                        <div className="mt-2 text-[12px] text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{nodes.find((n) => n.nodeId === s.nodeId)?.nodeName ?? `Node ${s.nodeId}`}</span>
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

        {/* ===== 하단 박스: Media Server ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">미디어 서버{selectedSystem && <span className="text-[#405189]"> — {selectedSystem.systemName}</span>}</h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedSystem && mediaServerData && (
                <>
                  <Button icon={<Pencil className="size-3.5" />} onClick={() => handleMediaEdit(selectedSystem.systemId, selectedSystem.systemName, mediaServerData)}>
                    편집
                  </Button>
                  <Button danger icon={<Trash2 className="size-3.5" />} onClick={() => handleMediaDelete(selectedSystem.systemId)}>
                    삭제
                  </Button>
                </>
              )}
              <span title={addTitle}>
                <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleAddMedia} disabled={addDisabled}>
                  미디어 서버 추가
                </Button>
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MediaServerPanel systemId={selectedSystemId} systemName={selectedSystem?.systemName ?? ''} />
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <MediaServerSheet ref={mediaSheetRef} onSuccess={invalidateMediaServer} />
      <TtsManageDrawer ref={ttsManageDrawerRef} />
      <SttManageDrawer ref={sttManageDrawerRef} />
    </div>
  );
}
