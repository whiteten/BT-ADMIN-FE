/**
 * 우측 드릴다운 사이드바 (목업 #detailSidebar) — 540px slide-in + 탭 4종.
 *
 * 탭: 개요 / DR 수용 / DN 목록 / 번호 대역. 선택 노드·타입·DR링크 상태에 따라 패널 분기.
 * 닫기 버튼 + 오버레이 클릭 닫기. react-flow 캔버스 위에 fixed 가 아니라 페이지 flex 형제로 둠
 * (IPRON 셸 하위 — 풀스크린 fixed 복제 금지, PLAN-FE §0.2).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import { dnStatusQueryKeys, useDeleteDnBand, useDnStatusBands } from '../hooks/useDnStatusQueries';
import { type DnStatusNode, type DnTypeKey, type DrLink, type GdnTypeStat, type SidebarTab, TYPE_LABELS } from '../types';
import DnBandModal from './DnBandModal';
import BandMapPanel from './sidebar/BandMapPanel';
import DnListPanel from './sidebar/DnListPanel';
import DrPanel from './sidebar/DrPanel';
import OverviewPanel from './sidebar/OverviewPanel';

interface DnStatusSidebarProps {
  open: boolean;
  node: DnStatusNode | null;
  tab: SidebarTab;
  /** DN 목록 탭에서 선택된 자원 타입 */
  dnListType: DnTypeKey;
  /** DR 탭에서 선택된 링크 */
  drLink: { fromNodeId: number; toNodeId: number } | null;
  drLinks: DrLink[];
  gdnStats: GdnTypeStat[];
  onClose: () => void;
  onTabChange: (tab: SidebarTab) => void;
  onSelectDrLink: (fromNodeId: number, toNodeId: number) => void;
  onClearDrLink: () => void;
}

const TABS: { key: SidebarTab; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'dr', label: 'DR 수용' },
  { key: 'dnlist', label: 'DN 목록' },
  { key: 'bandmap', label: '번호 대역' },
];

export default function DnStatusSidebar({ open, node, tab, dnListType, drLink, drLinks, gdnStats, onClose, onTabChange, onSelectDrLink, onClearDrLink }: DnStatusSidebarProps) {
  const queryClient = useQueryClient();
  const [bandModalOpen, setBandModalOpen] = useState(false);

  // 번호 대역 — 대역 탭 활성 + 노드 있을 때만 조회
  const bandParams = node && tab === 'bandmap' ? { nodeId: node.nodeId } : null;
  const { data: bandStatus, isLoading: bandsLoading } = useDnStatusBands(bandParams);
  const { mutate: deleteBand, isPending: isDeleting } = useDeleteDnBand();
  const [deletingBandId, setDeletingBandId] = useState<number | null>(null);

  const invalidateBands = () => {
    if (node) queryClient.invalidateQueries({ queryKey: dnStatusQueryKeys.bands({ nodeId: node.nodeId }).queryKey });
  };

  const handleDeleteBand = (bandId: number) => {
    setDeletingBandId(bandId);
    deleteBand(
      { bandId },
      {
        onSuccess: () => {
          toast.success('번호 대역을 삭제했습니다.');
          invalidateBands();
        },
        onSettled: () => setDeletingBandId(null),
      },
    );
  };

  return (
    <>
      {/* 오버레이 */}
      {open && <div className="absolute inset-0 z-10 bg-black/10" onClick={onClose} />}

      {/* 패널 */}
      <aside
        className={`absolute right-0 top-0 z-20 flex h-full w-[540px] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 헤더 */}
        <div className="flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-gray-200 px-5">
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100">
            <X className="size-4" />
          </button>
          <span className="text-[13px] font-semibold text-gray-800">{node ? `${node.nodeName} 상세` : '상세'}</span>
          {tab === 'dnlist' && <span className="ml-1.5 text-[11px] text-gray-500">— {TYPE_LABELS[dnListType]}</span>}
        </div>

        {/* 탭바 */}
        <div className="flex h-[42px] flex-shrink-0 items-stretch border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange(t.key)}
              className={`flex items-center border-b-2 px-4 text-[12px] font-medium transition-colors ${tab === t.key ? 'border-[#405189] text-[#405189]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!node ? (
            <div className="py-10 text-center text-[12px] text-gray-400">노드를 선택하세요</div>
          ) : tab === 'overview' ? (
            <OverviewPanel node={node} gdnStats={gdnStats} />
          ) : tab === 'dr' ? (
            <DrPanel nodeId={node.nodeId} nodeName={node.nodeName} drLinks={drLinks} selectedLink={drLink} onSelectLink={onSelectDrLink} onClearLink={onClearDrLink} />
          ) : tab === 'dnlist' ? (
            <DnListPanel nodeId={node.nodeId} typeKey={dnListType} />
          ) : (
            <BandMapPanel
              nodeName={node.nodeName}
              bandStatus={bandStatus}
              isLoading={bandsLoading}
              onAddBand={() => setBandModalOpen(true)}
              onDeleteBand={handleDeleteBand}
              deletingBandId={isDeleting ? deletingBandId : null}
            />
          )}
        </div>
      </aside>

      {/* 대역 등록 모달 */}
      {node && <DnBandModal open={bandModalOpen} nodeId={node.nodeId} nodeName={node.nodeName} onClose={() => setBandModalOpen(false)} onCreated={invalidateBands} />}
    </>
  );
}
