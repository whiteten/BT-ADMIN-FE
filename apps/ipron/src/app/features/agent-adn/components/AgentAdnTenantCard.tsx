/**
 * 상담사 ADN 매핑 — 테넌트 카드 (240×100).
 *
 * AdnTenantCard 패턴 동일. 표시 stats:
 *  - 전체 상담사 / 배정 / 미배정
 *  - 미배정이 화면 핵심 KPI (자동할당 대상). 0 초과 시 주황색 강조.
 */
import { Building2 } from 'lucide-react';

export interface AgentAdnTenantCardStats {
  totalCnt: number;
  assignedCnt: number;
  unassignedCnt: number;
}

interface AgentAdnTenantCardProps {
  tenantId: number | null; // null = "전체" 카드
  tenantName: string;
  stats: AgentAdnTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function AgentAdnTenantCard({ tenantId, tenantName, stats, selected, onClick }: AgentAdnTenantCardProps) {
  const isAll = tenantId === null;
  const { totalCnt, assignedCnt, unassignedCnt } = stats;
  const unassignedColor = unassignedCnt > 0 ? 'text-orange-600' : 'text-gray-400';

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
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
              {tenantName}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">전체 상담사</span>
          <span className="font-semibold text-gray-800">{totalCnt.toLocaleString()}명</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">배정</span>
          <span className="font-medium text-green-600">{assignedCnt.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">미배정</span>
          <span className={`font-medium ${unassignedColor}`}>{unassignedCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
