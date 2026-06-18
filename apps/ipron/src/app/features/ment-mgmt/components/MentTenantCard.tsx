/**
 * 멘트 테넌트 카드 (210×92) — DnTenantCard / CtiQueueTenantCard 패턴.
 *
 * 표시: 이름 + 공통/테넌트 배지 / 멘트 수.
 * tenantId=0 → "공통" (전 테넌트 공유 멘트).
 */
import { Building2, Globe } from 'lucide-react';

interface MentTenantCardProps {
  cardId: number | null; // null = "전체"
  cardName: string;
  count: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function MentTenantCard({ cardId, cardName, count, selected, onClick }: MentTenantCardProps) {
  const isAll = cardId === null;
  const isCommon = cardId === 0;

  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[210px] h-[92px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isAll ? (
          <span className={`text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            {isCommon ? (
              <Globe className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-blue-600'}`} />
            ) : (
              <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            )}
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={cardName}>
              {cardName}
            </span>
            <span className="ml-auto">
              {isCommon ? (
                <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold border border-blue-200 text-blue-700 bg-blue-50">공통</span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold border border-gray-200 text-gray-500 bg-gray-50">테넌트</span>
              )}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">멘트 수</span>
          <span className="font-semibold text-gray-800">{count.toLocaleString()}건</span>
        </div>
      </div>
    </div>
  );
}
