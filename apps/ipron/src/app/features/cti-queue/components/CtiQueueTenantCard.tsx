/**
 * CTI 큐 테넌트/노드 카드 (240×100) — DnTenantCard / AcdGdnTenantCard 패턴.
 *
 * 표시: 이름 / CTI큐(큐 총수) / 활성 / 업무그룹수(그 테넌트의 TB_TR_CTIQ_MASTER 그룹 수).
 */
import { Building2 } from 'lucide-react';

export interface CtiQueueCardStats {
  totalCnt: number;
  activeCnt: number;
  /** 그 테넌트의 업무그룹(TB_TR_CTIQ_MASTER) 개수. 블록 카운트 아님. */
  groupCnt: number;
}

interface CtiQueueTenantCardProps {
  cardId: number | null; // null = "전체"
  cardName: string;
  stats: CtiQueueCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function CtiQueueTenantCard({ cardId, cardName, stats, selected, onClick }: CtiQueueTenantCardProps) {
  const isAll = cardId === null;
  const { totalCnt, activeCnt, groupCnt } = stats;

  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[100px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isAll ? (
          <span className={`text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={cardName}>
              {cardName}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">CTI큐</span>
          <span className="font-semibold text-gray-800">{totalCnt.toLocaleString()}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">활성</span>
          <span className="font-medium text-green-600">{activeCnt.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">업무그룹수</span>
          <span className="font-medium text-[#405189]">{groupCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
