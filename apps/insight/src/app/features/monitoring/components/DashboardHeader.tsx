import { useState } from 'react';
import { Button } from 'antd';
import { Play, Plus, Square } from 'lucide-react';
import { DOMAIN_LABELS } from '../constants/monitoringConstants';
import type { DashboardDetail, WsConnectionState } from '../types';

type Mode = 'view' | 'edit';
type Throttle = 1 | 3 | 5 | 10 | 'PAUSED';

interface DashboardHeaderProps {
  dashboard: DashboardDetail;
  mode: Mode;

  /** View 모드 — 모니터링 시작 여부 */
  monitoringStarted?: boolean;
  /** View 모드 — WebSocket 상태 */
  connectionState?: WsConnectionState;
  /** View 모드 — 갱신 간격 */
  refreshThrottle?: Throttle;
  onChangeRefreshThrottle?: (next: Throttle) => void;
  /** View 모드 — 모니터링 시작/일시정지 */
  onToggleMonitoring?: () => void;
  /** View 모드 — 편집 모드로 전환 */
  onEnterEdit?: () => void;

  /** Edit 모드 — 이름 변경 */
  onRename?: (next: string) => void;
  /** Edit 모드 — 저장 */
  onSave?: () => void;
  isSaving?: boolean;
  /** Edit 모드 — 취소 */
  onCancel?: () => void;
  /** Edit 모드 — 영역(Slot) 추가 */
  onAddSlot?: () => void;

  /** 편집 권한 보유 여부 */
  canEdit?: boolean;
}

const CONNECTION_LABEL: Record<WsConnectionState, { label: string; dotClass: string; pillClass: string }> = {
  idle: { label: '대기', dotClass: 'bg-[#adb5bd]', pillClass: 'bg-bt-bg-muted text-bt-fg-muted' },
  connecting: { label: 'CONNECTING…', dotClass: 'bg-[#ffa94d] pulse-dot', pillClass: 'bg-bt-warn-soft text-bt-warn' },
  connected: { label: 'LIVE', dotClass: 'bg-[#37b24d] pulse-dot', pillClass: 'bg-bt-success-soft text-bt-success' },
  reconnecting: { label: 'RECONNECTING…', dotClass: 'bg-[#ffa94d] pulse-dot', pillClass: 'bg-bt-warn-soft text-bt-warn' },
  disconnected: { label: '연결 끊김', dotClass: 'bg-[#fa5252]', pillClass: 'bg-bt-danger-soft text-bt-danger' },
};

export default function DashboardHeader({
  dashboard,
  mode,
  monitoringStarted = false,
  connectionState = 'idle',
  refreshThrottle = 3,
  onChangeRefreshThrottle,
  onToggleMonitoring,
  onEnterEdit,
  onRename,
  onSave,
  isSaving,
  onCancel,
  onAddSlot,
  canEdit = true,
}: DashboardHeaderProps) {
  const [name, setName] = useState(dashboard.dashboardName);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(dashboard.dashboardName);
      return;
    }
    if (trimmed !== dashboard.dashboardName) onRename?.(trimmed);
  };

  const conn = CONNECTION_LABEL[connectionState];

  return (
    <div className="flex gap-2 w-full h-[58px] min-h-[58px] items-center shrink-0 bg-white bt-shadow px-5">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        {/* 좌측 — 타이틀 + 도메인 + 실시간 표시 */}
        <div className="flex items-center gap-2 min-w-0">
          {mode === 'edit' ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setName(dashboard.dashboardName);
                  e.currentTarget.blur();
                }
              }}
              className="text-sm font-medium text-[#495057] bg-white border border-[#dee2e6] hover:border-[#adb5bd] focus:border-[var(--color-bt-primary)] focus:outline-none rounded px-2 py-1 min-w-[220px] max-w-[420px]"
            />
          ) : (
            <span className="text-sm font-medium text-[#495057] shrink-0">{dashboard.dashboardName}</span>
          )}

          <span className="text-xs text-[#868e96] shrink-0">· {DOMAIN_LABELS[dashboard.domainCode]}</span>

          {mode === 'view' && monitoringStarted && (
            <span className={`ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${conn.pillClass}`}>
              <span className={`h-2 w-2 rounded-full ${conn.dotClass}`} />
              {conn.label}
            </span>
          )}
        </div>

        {/* 우측 — 액션 */}
        {mode === 'view' ? (
          <div className="flex items-center gap-2">
            {/* 모니터링 시작/중지 — Antd Button 으로 통일 (화면편집 버튼과 동일 메트릭). */}
            <Button
              color={monitoringStarted ? 'red' : 'green'}
              variant="solid"
              icon={monitoringStarted ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              onClick={onToggleMonitoring}
            >
              {monitoringStarted ? '중지' : '시작'}
            </Button>

            {canEdit && <Button onClick={onEnterEdit}>화면편집</Button>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={onCancel}>취소</Button>
            <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={onAddSlot}>
              영역 추가
            </Button>
            <Button variant="solid" color="cyan" onClick={onSave} loading={isSaving}>
              저장
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
