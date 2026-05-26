import { useEffect, useRef, useState } from 'react';
import { type BreadcrumbProps, Select } from 'antd';
import { Monitor } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import RealtimeSentenceDrawer, { type RealtimeSentenceDrawerRef } from '../../features/monitoring/components/RealtimeSentenceDrawer';
import { useGetChannelStatusList } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { ChannelStatusItem } from '../../features/monitoring/types';
import { useGetSttSystemList } from '../../features/stt-config/hooks/useCommonQueries';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/monitoring' },
  { title: 'STT 채널현황', path: '/stt/monitoring/channel/list' },
];

function ChannelCard({ item, onClick }: { item: ChannelStatusItem; onClick: (item: ChannelStatusItem) => void }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-3 min-h-[80px] cursor-pointer hover:border-[var(--color-bt-primary)] hover:shadow-sm transition-all"
      onClick={() => onClick(item)}
    >
      <span className="text-sm font-medium text-[#212529]">#{item.channelId}</span>
    </div>
  );
}

export default function ChannelStatusList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const drawerRef = useRef<RealtimeSentenceDrawerRef>(null);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedIpv4, setSelectedIpv4] = useState<string | undefined>(undefined);

  const { data: systems = [] } = useGetSttSystemList();

  useEffect(() => {
    if (systems.length > 0 && !selectedIpv4) {
      setSelectedIpv4(systems[0].ipv4Address);
    }
  }, [systems, selectedIpv4]);

  const systemOptions = systems.map((s) => ({
    label: `[${s.hostName}] ${s.systemName}`,
    value: s.ipv4Address,
  }));

  const { data: channels = [], isLoading } = useGetChannelStatusList({
    params: selectedIpv4 ? { ipv4: selectedIpv4 } : undefined,
  });

  const handleSystemChange = (value: string) => {
    setSelectedIpv4(value);
  };

  const handleCardClick = (item: ChannelStatusItem) => {
    if (!item.ucidGkey) return;
    drawerRef.current?.open({
      ucidGkey: item.ucidGkey,
      channelId: item.channelId,
      channelStatusNm: item.channelStatusNm,
      dnNo: item.dnNo,
      agentName: item.agentName,
      inoutKind: item.inoutKind,
      callDatetime: item.callDatetime,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* 툴바 */}
        <header className="flex items-center justify-end gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">시스템</span>
          <Select
            value={selectedIpv4}
            onChange={handleSystemChange}
            options={systemOptions}
            placeholder="시스템을 선택하세요"
            style={{ width: 200 }}
            loading={systems.length === 0}
          />
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded border border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5 transition-colors"
          >
            <Monitor className="size-4" />
          </button>
        </header>

        {/* 채널 카드 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">불러오는 중...</div>
          ) : channels.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <NoData message="조회된 채널 정보가 없습니다." />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {channels.map((item) => (
                <ChannelCard key={item.channelId} item={item} onClick={handleCardClick} />
              ))}
            </div>
          )}
        </div>
      </div>
      <RealtimeSentenceDrawer ref={drawerRef} />
    </div>
  );
}
