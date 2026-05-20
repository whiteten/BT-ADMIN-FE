/**
 * ADN 테넌트 카드 (240×100) — DnTenantCard 패턴.
 *
 * 표시 정보:
 *  - 테넌트명 (또는 "전체")
 *  - 전체 ADN / 로그인 / 로그아웃 수
 */
import { Building2 } from 'lucide-react';

export interface AdnTenantCardStats {
  totalCnt: number;
  loggedInCnt: number;
  loggedOutCnt: number;
}

interface AdnTenantCardProps {
  tenantId: number | null; // null = "전체" 카드
  tenantName: string;
  stats: AdnTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function AdnTenantCard({ tenantId, tenantName, stats, selected, onClick }: AdnTenantCardProps) {
  const isAll = tenantId === null;
  const { totalCnt, loggedInCnt, loggedOutCnt } = stats;

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
          <span className="text-gray-500">전체 ADN</span>
          <span className="font-semibold text-gray-800">{totalCnt.toLocaleString()}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">LOGGED IN</span>
          <span className="font-medium text-green-600">{loggedInCnt.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">LOGGED OUT</span>
          <span className="font-medium text-red-500">{loggedOutCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
