/**
 * IVR 업무시간 테넌트 카드 (240×100) — CtiCodeTenantCard/AdnTenantCard 패턴.
 *
 * 표시: 테넌트명 + 업무시간 수 / 사용중 수.
 * 통계는 별도 API 없이 목록 데이터를 페이지에서 group by 하여 주입.
 */
import { Building2 } from 'lucide-react';

export interface WorktimeTenantCardStats {
  worktimeCnt: number;
  useCnt: number;
}

interface WorktimeTenantCardProps {
  tenantName: string;
  stats: WorktimeTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function WorktimeTenantCard({ tenantName, stats, selected, onClick }: WorktimeTenantCardProps) {
  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[100px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
        <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
          {tenantName}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">업무시간</span>
          <span className="font-semibold text-gray-800">{stats.worktimeCnt.toLocaleString()}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">사용중</span>
          <span className="font-medium text-blue-600">{stats.useCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
