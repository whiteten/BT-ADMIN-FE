/**
 * 콜 상세 우측 — 상담사 오늘 통화 패널.
 *
 * 같은 agentId 의 오늘 통화 (현재 ucid 제외) 단독 패널.
 * (고객 최근 통화는 하단 고객 여정 타임라인이 담당 — 정보 중복 제거)
 *
 * 기존 검색 API (trackingApi.search) 재사용 — 신규 BE 불요.
 * 각 row 클릭 시 해당 ucid 의 상세 페이지로 이동.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Empty, Spin } from 'antd';
import { Headphones, PhoneIncoming, PhoneOutgoing, User } from 'lucide-react';
import { trackingApi } from '../api/trackingApi';
import type { CallSearchResult } from '../types/tracking';

interface Props {
  currentUcid: string;
  agentId: string | null;
  /** 콜 시작 시각 — "오늘" 기준점. 없으면 클라이언트 now */
  currentCallStartTime?: string | null;
}

const PAGE_SIZE = 10;

export default function RelatedCallsPanel({ currentUcid, agentId, currentCallStartTime }: Props) {
  const dateRange = useMemo(() => {
    const base = currentCallStartTime ? new Date(currentCallStartTime) : new Date();
    const todayStart = new Date(base);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(base);
    todayEnd.setHours(23, 59, 59, 999);
    return {
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
    };
  }, [currentCallStartTime]);

  const agentQ = useQuery({
    queryKey: ['related-calls', 'agent', agentId, dateRange.todayStart, dateRange.todayEnd],
    queryFn: () =>
      trackingApi.search({
        mode: 'PBX',
        agentId: agentId!,
        startTime: dateRange.todayStart,
        endTime: dateRange.todayEnd,
        size: PAGE_SIZE + 1,
      }),
    enabled: !!agentId,
    staleTime: 60_000,
  });

  const items: CallSearchResult[] = useMemo(() => {
    const raw = agentQ.data?.items ?? [];
    return raw.filter((r) => r.ucid !== currentUcid).slice(0, PAGE_SIZE);
  }, [agentQ.data, currentUcid]);

  const loading = agentQ.isLoading;
  const total = agentQ.data?.total ?? 0;
  const totalExcludingCurrent = Math.max(0, total - 1);

  return (
    <div className="flex-1 min-h-0 bg-white rounded-md border border-gray-200 flex flex-col overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
      {/* 헤더 — 단일 (상담사 오늘) */}
      <div className="h-[44px] px-4 flex items-center gap-2 border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
        <User className="size-3.5 text-brand" />
        <span className="text-[12.5px] font-semibold text-gray-700">상담사 오늘 통화</span>
        <span className="text-[10.5px] text-gray-400 font-mono truncate">{agentId ? `${agentId}` : '상담사 없음'}</span>
        {!loading && totalExcludingCurrent > 0 && <span className="ml-auto text-[10.5px] text-gray-400">{totalExcludingCurrent}건</span>}
      </div>

      {/* 결과 */}
      <div className="flex-1 overflow-y-auto">
        {!agentId ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-1.5">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              styles={{ image: { height: 40 } }}
              description={<span className="text-[11.5px] text-gray-400">이 콜에 배정된 상담사 정보가 없어 조회할 수 없습니다</span>}
            />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Spin size="small" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              styles={{ image: { height: 40 } }}
              description={<span className="text-[11.5px] text-gray-400">오늘 다른 통화가 없습니다</span>}
            />
          </div>
        ) : (
          <>
            {totalExcludingCurrent > PAGE_SIZE && (
              <div className="px-3 pt-2 pb-1 text-[10.5px] text-gray-400">
                전체 <b className="text-gray-600">{totalExcludingCurrent}</b>건 중 최근 {items.length}건 표시
              </div>
            )}
            <ul className="divide-y divide-gray-100">
              {items.map((row) => (
                <CallRow key={`${row.ucid}-${row.hop ?? 0}`} row={row} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function CallRow({ row }: { row: CallSearchResult }) {
  const navigate = useNavigate();
  const ts = row.startTime ? new Date(row.startTime) : null;
  const dateStr = ts ? ts.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
  const durSec = row.durationSec ?? 0;
  const durLabel = durSec === 0 ? '0s' : durSec < 60 ? `${durSec}s` : `${Math.floor(durSec / 60)}m${durSec % 60 ? ` ${durSec % 60}s` : ''}`;

  const callKind = row.callKind;
  const DirIcon = callKind === 2 ? PhoneOutgoing : PhoneIncoming;
  const dirCls = callKind === 2 ? 'text-amber-600' : 'text-emerald-600';

  const r = row as { result?: string | null; agentName?: string | null };
  const resultCls = r.result === 'COMPLETED' || r.result === 'NORMAL' ? 'text-emerald-700' : r.result === 'ABANDONED' ? 'text-amber-700' : 'text-gray-500';

  return (
    <li onClick={() => navigate(`/ipron/tracking/call/${encodeURIComponent(row.ucid)}`)} className="px-3 py-2 cursor-pointer hover:bg-blue-50/40 transition-colors">
      <div className="flex items-center gap-2 text-[11.5px]">
        <DirIcon className={`size-3 flex-shrink-0 ${dirCls}`} />
        <span className="tabular-nums text-gray-700 font-mono">{dateStr}</span>
        <span className="ml-auto tabular-nums text-[10.5px] text-gray-500">{durLabel}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-600 font-mono">
        <span className="truncate">{row.ani ?? '-'}</span>
        <span className="text-gray-300">→</span>
        <span className="truncate">{row.dnis ?? '-'}</span>
      </div>
      {(r.agentName || r.result) && (
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px]">
          {r.agentName && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Headphones className="size-2.5" /> {r.agentName}
            </span>
          )}
          {r.result && <span className={`ml-auto ${resultCls}`}>{r.result}</span>}
        </div>
      )}
    </li>
  );
}
