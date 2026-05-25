import { useEffect, useState } from 'react';
import { Button, Segmented } from 'antd';
import { PenSquare } from 'lucide-react';
import { DOMAIN_COLOR_CLASS, REFRESH_THROTTLE_OPTIONS } from '../constants/monitoringConstants';
import type { DashboardDetail, WsConnectionState } from '../types';

interface DashboardViewHeaderProps {
  dashboard: DashboardDetail;
  /** WebSocket 연결 상태 (Phase 1 — mock으로 항상 connected) */
  connectionState?: WsConnectionState;
  /** 사용자가 편집 권한 보유 여부 */
  canEdit?: boolean;
  /** 갱신 간격 (글로벌 옵션 — 1·3·5·10초·PAUSED) */
  refreshThrottle: 1 | 3 | 5 | 10 | 'PAUSED';
  onChangeRefreshThrottle: (next: 1 | 3 | 5 | 10 | 'PAUSED') => void;
  onEdit?: () => void;
}

const CONNECTION_STATE_INFO: Record<WsConnectionState, { color: string; label: string; isPulse: boolean }> = {
  connecting: { color: 'bg-[var(--color-bt-warn)] pulse-dot', label: '연결 중…', isPulse: true },
  connected: { color: 'bg-[var(--color-bt-success)] pulse-dot', label: '실시간 연결됨', isPulse: true },
  reconnecting: { color: 'bg-[var(--color-bt-warn)] pulse-dot', label: '재연결 중…', isPulse: true },
  disconnected: { color: 'bg-[var(--color-bt-danger)] pulse-dot-danger', label: '연결 끊김', isPulse: true },
};

export default function DashboardViewHeader({
  dashboard,
  connectionState = 'connected',
  canEdit = true,
  refreshThrottle,
  onChangeRefreshThrottle,
  onEdit,
}: DashboardViewHeaderProps) {
  const info = CONNECTION_STATE_INFO[connectionState];

  // 갱신 카운트 — 시뮬레이션용
  const [updatesCount, setUpdatesCount] = useState(0);
  useEffect(() => {
    if (refreshThrottle === 'PAUSED' || connectionState !== 'connected') return;
    const id = setInterval(() => setUpdatesCount((n) => n + 1), refreshThrottle * 1000);
    return () => clearInterval(id);
  }, [refreshThrottle, connectionState]);

  return (
    <div className="flex flex-col bg-white border-b border-[var(--color-bt-border)]">
      {/* 상단 — 대시보드 이름 + 도메인 + 연결 상태 + 편집 */}
      <div className="flex items-center justify-between px-7 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[16px] font-semibold truncate">{dashboard.dashboardName}</span>
          <span className={`shrink-0 rounded px-1.5 py-0.5 mono text-[9.5px] font-bold ${DOMAIN_COLOR_CLASS[dashboard.domainCode]}`}>{dashboard.domainCode}</span>

          {/* 연결 상태 */}
          <span className="ml-2 inline-flex items-center gap-1.5 rounded bg-[var(--color-bt-success-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-bt-success)]">
            <span className={`h-1.5 w-1.5 rounded-full ${info.color}`} />
            {info.label}
          </span>
        </div>

        {canEdit && (
          <Button icon={<PenSquare className="w-3.5 h-3.5" />} onClick={onEdit}>
            편집
          </Button>
        )}
      </div>

      {/* 글로벌 옵션 — 갱신 간격 + 구독 정보 (§8의 일부) */}
      <div className="flex flex-wrap items-end gap-3 bg-[var(--color-bt-bg-muted)]/40 border-t border-[var(--color-bt-border)] px-7 py-2.5">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)]">갱신 간격</label>
          <Segmented value={refreshThrottle} onChange={(v) => onChangeRefreshThrottle(v as 1 | 3 | 5 | 10 | 'PAUSED')} options={REFRESH_THROTTLE_OPTIONS} size="small" />
        </div>

        <div className="ml-auto flex items-center gap-3 text-[10.5px] text-[var(--color-bt-fg-muted)]">
          {refreshThrottle === 'PAUSED' ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-bt-warn)] font-semibold">
              <span className="mono">⏸</span> 화면 갱신 일시정지 (WebSocket은 유지)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="mono">⟳</span> {refreshThrottle}초마다 화면 갱신 · 누적 {updatesCount}회
            </span>
          )}
          <span className="text-[var(--color-bt-border)]">·</span>
          <span>{`구독 위젯 ${dashboard.widgets?.length ?? 0}개`}</span>
        </div>
      </div>
    </div>
  );
}
