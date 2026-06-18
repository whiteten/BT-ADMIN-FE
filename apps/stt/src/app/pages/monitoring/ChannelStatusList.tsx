import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type BreadcrumbProps, Select, Tooltip } from 'antd';
import { Pause, Phone, Play } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import RealtimeSentenceDrawer, { type RealtimeSentenceDrawerRef } from '../../features/monitoring/components/RealtimeSentenceDrawer';
import { useGetChannelStatusList } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { ChannelStatusItem } from '../../features/monitoring/types';
import { useGetSttSystemList } from '../../features/stt-config/hooks/useCommonQueries';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/stt/monitoring' },
  { title: 'STT 채널현황', path: '/stt/monitoring/channel/list' },
];

const TY_COLORS: Record<string, string> = {
  '1': '#17aae7',
  '2': '#fcc107',
  '3': '#88bf47',
  '4': '#f18b31',
  '5': '#d54d8b',
};

function getTyColor(ty?: string | null): string {
  if (!ty) return '#17aae7';
  const key = ty.replace(/\D/g, '').replace(/^0+/, '') || '1';
  return TY_COLORS[key] ?? '#17aae7';
}

function ChannelCard({ item, onClick }: { item: ChannelStatusItem; onClick: (item: ChannelStatusItem) => void }) {
  if (item.channelStatus === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 min-h-[130px] flex flex-col">
        <p className="text-2xl font-bold text-gray-300">{item.channelId}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3 min-h-[130px] flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all"
      style={{ backgroundColor: item.analKind === 'B' ? '#6c757d' : getTyColor(item.ty) }}
      onClick={() => onClick(item)}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-2xl font-bold text-white">{item.channelId}</p>
        <p className="text-xl text-white/80 shrink-0">{item.analKind === 'B' ? `${item.progressRate}%` : item.progressRate}</p>
      </div>
      <div>
        {item.ucidGkey && <p className="text-sm text-white/80 mt-0.5 truncate">{item.ucidGkey}</p>}
        {item.agentName && <p className="text-sm text-white/80 mt-0.5 truncate">{item.agentName}</p>}
      </div>
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

  const [searchParams] = useSearchParams();
  const [selectedIpv4, setSelectedIpv4] = useState<string | undefined>(searchParams.get('ipv4') ?? undefined);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(3);

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
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const handleSystemChange = (value: string) => {
    setSelectedIpv4(value);
  };

  const handleCardClick = (item: ChannelStatusItem) => {
    if (!item.ucidGkey) return;
    drawerRef.current?.open({
      ucidGkey: item.ucidGkey,
      channelId: item.channelId,
      channelStatusNm: item.channelStatusNm ?? undefined,
      dnNo: item.dnNo ?? undefined,
      agentName: item.agentName ?? undefined,
      inoutKind: item.inoutKind ?? undefined,
      callDatetime: item.callDatetime ?? undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* 툴바 */}
        <header className="flex items-center justify-between gap-2">
          {/* 색상 범례 */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { color: '#fcc107', label: '1분 미만' },
              { color: '#17aae7', label: '1~3분' },
              { color: '#88bf47', label: '4~6분' },
              { color: '#f18b31', label: '7~9분' },
              { color: '#d54d8b', label: '10분+' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#6c757d' }} />
              배치
            </span>
          </div>
          {/* 검색 조건 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-[#495057] shrink-0">시스템</span>
            <Select
              value={selectedIpv4}
              onChange={handleSystemChange}
              options={systemOptions}
              placeholder="시스템을 선택하세요"
              style={{ width: 200 }}
              loading={systems.length === 0}
            />
            <span className="text-sm font-medium text-[#495057] shrink-0 pl-2">모니터링</span>
            <Select
              value={refreshSeconds}
              onChange={setRefreshSeconds}
              options={[
                { label: '3초', value: 3 },
                { label: '5초', value: 5 },
                { label: '10초', value: 10 },
                { label: '30초', value: 30 },
              ]}
              style={{ width: 72 }}
            />
            <Tooltip title={autoRefresh ? '모니터링 중지' : '모니터링 시작'}>
              <button
                type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${autoRefresh ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white' : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'}`}
              >
                {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </Tooltip>
          </div>
        </header>

        {/* 채널 카드 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">불러오는 중...</div>
          ) : channels.length === 0 ? (
            <div key="empty" className="flex flex-col items-center justify-center h-full gap-3 text-gray-300">
              <Phone className="size-16" />
              <p className="text-sm text-gray-400">조회된 채널 정보가 없습니다.</p>
            </div>
          ) : (
            <div key="grid" className="grid grid-cols-5 gap-3">
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
