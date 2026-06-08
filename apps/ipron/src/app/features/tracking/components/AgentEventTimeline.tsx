/**
 * Agent 이벤트 타임라인 — 상담사 상태 변화 + 호 응답/재전환만 표시.
 * 후처리/워크코드/응대메모/평가는 본 화면 노출 제외 (상담 어플리케이션 영역).
 */
import { Empty } from 'antd';
import type { AgentEvent, AgentEventType } from '../types';

interface Props {
  events: AgentEvent[];
  loading?: boolean;
}

const TYPE_STYLE: Record<AgentEventType, { bg: string; emoji: string; label: string }> = {
  STATE_CHANGE: { bg: 'bg-blue-100 text-blue-700', emoji: '🔄', label: '상태 변경' },
  CALL_RING: { bg: 'bg-amber-100 text-amber-700', emoji: '🔔', label: '벨울림' },
  CALL_ANSWER: { bg: 'bg-emerald-100 text-emerald-700', emoji: '🎧', label: '호 응답' },
  CALL_RELEASE: { bg: 'bg-gray-100 text-gray-600', emoji: '📤', label: '호 종료' },
  TRANSFER_OUT: { bg: 'bg-purple-100 text-purple-700', emoji: '↗️', label: '전환 (보냄)' },
  TRANSFER_IN: { bg: 'bg-purple-100 text-purple-700', emoji: '↘️', label: '전환 (받음)' },
};

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function AgentEventTimeline({ events, loading }: Props) {
  if (loading) {
    return <div className="p-4 text-[12px] text-gray-500">불러오는 중...</div>;
  }
  if (!events || events.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">Agent 이벤트 기록이 없습니다</span>} />
      </div>
    );
  }
  return (
    <div className="px-4 py-3 space-y-1">
      {events.map((evt) => {
        const style = TYPE_STYLE[evt.type] ?? TYPE_STYLE.STATE_CHANGE;
        return (
          <div key={evt.eventId} className="flex items-start gap-3 py-1.5 hover:bg-gray-50 rounded px-2 -mx-2">
            <div className={`size-7 rounded-md flex items-center justify-center flex-shrink-0 text-[12px] ${style.bg}`}>{style.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12px] font-medium text-gray-900">{style.label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{fmtTime(evt.eventTime)}</span>
                <span className="text-[11px] text-gray-700">
                  {evt.agentName ?? '-'}
                  <span className="text-gray-400 ml-1">({evt.agentId})</span>
                </span>
                {(evt.mediaAlias || evt.mediaType != null) && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-px rounded">{evt.mediaAlias ?? `Type ${evt.mediaType}`}</span>
                )}
              </div>
              {evt.fromState && evt.toState && (
                <div className="text-[11px] text-gray-600 mt-0.5">
                  <span className="font-mono">{evt.fromState}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-mono text-blue-700">{evt.toState}</span>
                </div>
              )}
              {evt.responseSec != null && <div className="text-[11px] text-gray-600 mt-0.5">응답 시간: {evt.responseSec}s</div>}
              {evt.description && <div className="text-[11px] text-gray-500 mt-0.5">{evt.description}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
