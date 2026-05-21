import rank1 from '../../../../assets/images/icon/rank1.png';
import rank2 from '../../../../assets/images/icon/rank2.png';
import rank3 from '../../../../assets/images/icon/rank3.png';
import type { OccupancyItem } from '../types';
// import NoData from '@/components/custom/NoData';

interface OccupancyBarChartProps {
  data?: OccupancyItem[];
}

const RANK_ICONS = [rank1, rank2, rank3];

const ICON_OFFSET = 48; // h-10(40px) + mb-2(8px)

const PODIUM_CONFIG = [
  { rank: 2, order: 'order-1', height: '70%', color: 'bg-[#878A99]' },
  { rank: 1, order: 'order-2', height: '90%', color: 'bg-[#3B82F6]' },
  { rank: 3, order: 'order-3', height: '50%', color: 'bg-[#878A99]' },
] as const;

export default function OccupancyBarChart({ data }: OccupancyBarChartProps) {
  // if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  const sorted = [...(data ?? [])].sort((a, b) => b.callCount - a.callCount);
  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="flex h-full overflow-hidden">
      {/* 좌측: 랭킹 영역 */}
      <div className={`flex items-end px-2 pb-2 ${rest.length > 0 ? 'w-[60%]' : 'w-full'}`}>
        {PODIUM_CONFIG.map((config) => {
          const item = topThree[config.rank - 1];
          return (
            <div key={config.rank} className={`flex h-full min-w-0 flex-1 flex-col justify-end ${config.order} px-0.5`}>
              <img src={RANK_ICONS[config.rank - 1]} alt={`rank${config.rank}`} className="mx-auto mb-2 h-10 w-10" />
              <div
                style={{ height: `calc(${config.height} - ${ICON_OFFSET}px)` }}
                className={`${config.color} flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-t-lg px-1`}
              >
                <span className="w-full break-all text-center text-sm font-bold leading-tight text-white line-clamp-2">{item?.key ?? '-'}</span>
                {item && (
                  <span className="text-base font-bold text-white">
                    {item.callCount.toLocaleString()}
                    <span className="ml-0.5 text-sm font-bold text-white/70">건</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 우측: 나머지 데이터 리스트 */}
      {rest.length > 0 && (
        <div className="flex w-[40%] flex-col overflow-y-auto border-l border-[#E9EBEC]">
          {rest.map((item, index) => (
            <div key={item.key} className="flex min-h-[40px] shrink-0 items-center gap-2 border-b border-[#E9EBEC] px-3 last:border-b-0">
              <span className="w-4 shrink-0 text-center text-sm text-[#878A99]">{index + 4}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#495057]">{item.key}</span>
              <span className="shrink-0 text-sm font-semibold text-[#495057]">
                {item.callCount.toLocaleString()}
                <span className="ml-0.5 text-sm font-normal text-[#878A99]">건</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
