/**
 * 3층 드릴다운 상세 패널 — 하단 전폭 인라인 (2026-06-16 우측 사이드바 구조 폐기 후 환원).
 *
 * IPRON 표준 2단: 상단 카드 슬라이더 / 하단 전폭 상세. 카드 단일 클릭 시 이 패널에 그 노드 상세를
 *  전폭·세로 flex-1 로 펼친다. 폭 540px 우측 사이드바가 좌측 1022px 빈 공백을 만들고 DN 목록 그리드를
 *  499×320 으로 욱여넣던 문제 해소 — 그리드/세그먼트 바가 화면 가로폭 전부를 쓴다.
 *
 * 탭: 개요 / DR 수용 / DN 목록 / 번호 대역. 선택 노드·타입·DR링크 상태에 따라 패널 분기.
 * 닫기 버튼만(오버레이 없음 — 인라인이라 노드 컨텍스트가 클릭으로 리셋될 여지 자체가 없음).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import { dnStatusQueryKeys, useDeleteDnBand, useDnStatusBands } from '../hooks/useDnStatusQueries';
import { type DnStatusNode, type DrLink, type GdnTypeStat, type SidebarTab } from '../types';
import DnBandModal from './DnBandModal';
import BandMapPanel from './sidebar/BandMapPanel';
import DnListPanel from './sidebar/DnListPanel';
import DrPanel from './sidebar/DrPanel';
import OverviewPanel from './sidebar/OverviewPanel';

interface DnStatusDetailPanelProps {
  node: DnStatusNode | null;
  tab: SidebarTab;
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

export default function DnStatusDetailPanel({ node, tab, drLink, drLinks, gdnStats, onClose, onTabChange, onSelectDrLink, onClearDrLink }: DnStatusDetailPanelProps) {
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

  // 개요/DR/대역 패널은 가독 폭 제한(과도한 가로 늘어짐 방지), DN 목록 그리드는 전폭 사용
  const isWidePanel = tab === 'dnlist';

  return (
    <div className="bg-white bt-shadow flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-gray-200 px-5">
        <span className="text-[13px] font-semibold text-gray-800">{node ? `${node.nodeName} 상세` : '상세'}</span>
        <button type="button" onClick={onClose} className="ml-auto flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title="상세 닫기">
          <X className="size-4" />
        </button>
      </div>

      {/* 탭바 */}
      <div className="flex h-[42px] flex-shrink-0 items-stretch border-b border-gray-200 px-2">
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

      {/* 본문 — 전폭 flex-1 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {!node ? (
          <div className="py-10 text-center text-[12px] text-gray-400">노드 카드를 클릭하면 상세 정보가 표시됩니다.</div>
        ) : (
          <div className={isWidePanel ? 'flex h-full flex-col' : 'mx-auto w-full max-w-[860px]'}>
            {tab === 'overview' ? (
              <OverviewPanel node={node} gdnStats={gdnStats} />
            ) : tab === 'dr' ? (
              <DrPanel nodeId={node.nodeId} nodeName={node.nodeName} drLinks={drLinks} selectedLink={drLink} onSelectLink={onSelectDrLink} onClearLink={onClearDrLink} />
            ) : tab === 'dnlist' ? (
              <DnListPanel nodeId={node.nodeId} />
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
        )}
      </div>

      {/* 대역 등록 모달 */}
      {node && <DnBandModal open={bandModalOpen} nodeId={node.nodeId} nodeName={node.nodeName} onClose={() => setBandModalOpen(false)} onCreated={invalidateBands} />}
    </div>
  );
}
