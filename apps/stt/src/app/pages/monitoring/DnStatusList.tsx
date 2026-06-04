import { useEffect, useRef, useState } from 'react';
import { type BreadcrumbProps, Input, Select, Tooltip } from 'antd';
import { Pause, Phone, Play } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import RealtimeSentenceDrawer, { type RealtimeSentenceDrawerRef } from '../../features/monitoring/components/RealtimeSentenceDrawer';
import { useGetDnStatusList } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { DnStatusItem } from '../../features/monitoring/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/monitoring' },
  { title: 'STT 내선별 진행현황', path: '/stt/monitoring/dn/list' },
];

const TY_COLORS: Record<string, string> = {
  '1': '#17aae7',
  '2': '#fcc107',
  '3': '#88bf47',
  '4': '#f18b31',
  '5': '#d54d8b',
};

function getTyColor(ty?: string): string {
  if (!ty) return '#17aae7';
  const key = ty.replace(/\D/g, '').replace(/^0+/, '') || '1';
  return TY_COLORS[key] ?? '#17aae7';
}

function DnCard({ item, onClick }: { item: DnStatusItem; onClick: (item: DnStatusItem) => void }) {
  return (
    <div
      className="rounded-lg p-3 min-h-[130px] flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all"
      style={{ backgroundColor: item.analKind === 'B' ? '#6c757d' : getTyColor(item.ty) }}
      onClick={() => onClick(item)}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-2xl font-bold text-white">{item.dnNo}</p>
        <p className="text-xl text-white/80 shrink-0">{item.analKind === 'B' ? `${item.progressRate}%` : item.progressRate}</p>
      </div>
      <div>
        {item.ucidGkey && <p className="text-sm text-white/80 mt-0.5 truncate">{item.ucidGkey}</p>}
        {item.agentName && <p className="text-sm text-white/80 mt-0.5 truncate">{item.agentName}</p>}
      </div>
    </div>
  );
}

export default function DnStatusList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const drawerRef = useRef<RealtimeSentenceDrawerRef>(null);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [dnFilter, setDnFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(3);

  const { data: dnList = [], isLoading } = useGetDnStatusList({
    params: dnFilter.trim() ? { dnNo: dnFilter.trim() } : undefined,
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const handleCardClick = (item: DnStatusItem) => {
    if (!item.ucidGkey) return;
    drawerRef.current?.open({
      ucidGkey: item.ucidGkey,
      dnNo: item.dnNo,
      agentName: item.agentName,
      channelId: item.channelId,
      channelStatusNm: item.channelStatusNm,
      inoutKind: item.inoutKind,
      callDatetime: item.callDatetime,
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
            <span className="text-sm font-medium text-[#495057]">내선</span>
            <Input value={dnFilter} onChange={(e) => setDnFilter(e.target.value)} placeholder="내선번호 검색" style={{ width: 180 }} allowClear />
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

        {/* 카드 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">불러오는 중...</div>
          ) : dnList.length === 0 ? (
            <div key="empty" className="flex flex-col items-center justify-center h-full gap-3 text-gray-300">
              <Phone className="size-16" />
              <p className="text-sm text-gray-400">조회된 내선 정보가 없습니다.</p>
            </div>
          ) : (
            <div key="grid" className="grid grid-cols-5 gap-3">
              {dnList.map((item) => (
                <DnCard key={item.dnNo} item={item} onClick={handleCardClick} />
              ))}
            </div>
          )}
        </div>
      </div>
      <RealtimeSentenceDrawer ref={drawerRef} />
    </div>
  );
}
