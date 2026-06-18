/**
 * 스킬 배정 테넌트 카드 (240×116) — AdnTenantCard 패턴.
 *
 * 표시 정보:
 *  - 테넌트명 (또는 "전체")
 *  - 상담사/스킬셋 수
 *  - 매핑 수
 *  - 스킬모음 수
 *  - 스킬 미보유 상담사 수 (경고)
 */
import { Building2 } from 'lucide-react';

export interface SkillAssignTenantCardStats {
  agentCount: number;
  skillsetCount: number;
  mappingCount: number;
  skillGroupCount: number;
  unassignedAgentCnt: number;
}

interface SkillAssignTenantCardProps {
  tenantId: number | null; // null = "전체"
  tenantName: string;
  stats: SkillAssignTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function SkillAssignTenantCard({ tenantId, tenantName, stats, selected, onClick }: SkillAssignTenantCardProps) {
  const isAll = tenantId === null;
  const { agentCount, skillsetCount, mappingCount, skillGroupCount, unassignedAgentCnt } = stats;

  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[116px] flex-shrink-0 flex flex-col ${
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
          <span className="text-gray-500">상담사 / 스킬셋</span>
          <span className="font-semibold text-gray-800">
            {agentCount.toLocaleString()} / {skillsetCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">매핑 수</span>
          <span className="font-medium text-[#405189]">{mappingCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">스킬모음</span>
          <span className="font-medium text-gray-800">{skillGroupCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">스킬 미보유</span>
          <span className={`font-medium ${unassignedAgentCnt > 0 ? 'text-red-500' : 'text-green-600'}`}>{unassignedAgentCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
