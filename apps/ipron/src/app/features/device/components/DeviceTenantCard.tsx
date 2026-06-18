/**
 * 단말기 관리 테넌트 카드 (240×100)
 * IPR20S2110 목록 페이지 상단 카드 슬라이더용 (Type C — DnTenantCard 패턴)
 *
 * 표시 정보:
 *  - 테넌트명 (또는 "전체")
 *  - 전체 단말기 수 / 펌웨어사용 수 / 프로비저닝성공 수
 */
import { Monitor } from 'lucide-react';

export interface DeviceTenantCardStats {
  /** 전체 단말기 수 */
  totalCnt: number;
  /** 펌웨어 UPDATE 사용 중인 단말기 수 */
  firmUpdCnt: number;
  /** 프로비저닝 성공 단말기 수 (PROV_RESULT = 1) */
  provSuccessCnt: number;
}

interface DeviceTenantCardProps {
  /** 테넌트 ID — null 이면 "전체" 카드 */
  tenantId: number | null;
  tenantName: string;
  stats: DeviceTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function DeviceTenantCard({ tenantId, tenantName, stats, selected, onClick }: DeviceTenantCardProps) {
  const isAll = tenantId === null;
  const { totalCnt, firmUpdCnt, provSuccessCnt } = stats;

  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[100px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-1.5 mb-1">
        {isAll ? (
          <span className={`text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            <Monitor className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
              {tenantName}
            </span>
          </>
        )}
      </div>

      {/* 수치 3줄 */}
      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">전체 단말기</span>
          <span className="font-semibold text-gray-800">{totalCnt.toLocaleString()}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">펌웨어사용</span>
          <span className="font-medium text-blue-600">{firmUpdCnt.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">프로비저닝성공</span>
          <span className="font-medium text-green-600">{provSuccessCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
