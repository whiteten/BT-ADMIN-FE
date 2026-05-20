import { useEffect, useRef, useState } from 'react';
import { type BreadcrumbProps, Input } from 'antd';
import { Monitor } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import SttRealSentenceDrawer, { type SttRealSentenceDrawerRef } from '../../features/monitoring/components/SttRealSentenceDrawer';
import { useGetDnStatusList } from '../../features/monitoring/hooks/useDnStatusQueries';
import type { DnStatusItem } from '../../features/monitoring/types';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/stt-monitoring' },
  { title: '내선 현황', path: '/stt/stt-monitoring/dn/list' },
];

function DnCard({ item, onClick }: { item: DnStatusItem; onClick: (item: DnStatusItem) => void }) {
  return (
    <div className="rounded-lg bg-[#c2255c] p-3 min-h-[100px] flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all" onClick={() => onClick(item)}>
      <div>
        <p className="text-2xl font-bold text-white">{item.dnNo}</p>
        {item.agentName && <p className="text-xs text-white/80 mt-0.5 truncate">{item.agentName}</p>}
        {item.ucidGkey && <p className="text-xs text-white/60 truncate">{item.ucidGkey}</p>}
      </div>
      {item.progressRate && <p className="text-sm text-white/80 text-right">{item.progressRate}</p>}
    </div>
  );
}

export default function DnStatusList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const drawerRef = useRef<SttRealSentenceDrawerRef>(null);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [dnFilter, setDnFilter] = useState('');

  const { data: dnList = [], isLoading } = useGetDnStatusList();

  const filtered = dnFilter ? dnList.filter((item) => item.dnNo.includes(dnFilter)) : dnList;

  const handleCardClick = (item: DnStatusItem) => {
    if (!item.ucidGkey) return;
    drawerRef.current?.open({
      ucidGkey: item.ucidGkey,
      dnNo: item.dnNo,
      agentName: item.agentName,
      progressRate: item.progressRate,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* 툴바 */}
        <header className="flex items-center justify-end gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
          <Input value={dnFilter} onChange={(e) => setDnFilter(e.target.value)} placeholder="내선번호 검색" style={{ width: 180 }} allowClear />
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded border border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5 transition-colors"
          >
            <Monitor className="size-4" />
          </button>
        </header>

        {/* 카드 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <NoData message="조회된 내선 정보가 없습니다." />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {filtered.map((item) => (
                <DnCard key={item.dnNo} item={item} onClick={handleCardClick} />
              ))}
            </div>
          )}
        </div>
      </div>
      <SttRealSentenceDrawer ref={drawerRef} />
    </div>
  );
}
