import WidgetCardHeader from './WidgetCardHeader';
import type { CustomWidget } from '../../types';
import { getCustomWidgetComponent } from '../../widgets/registry';

interface CustomWidgetCardProps {
  widget: CustomWidget;
  editMode: boolean;
  /** WebSocket DATA 프레임의 `data` (BE 위젯 `computeFromRawData` 반환값). */
  data?: unknown;
  onSettings?: () => void;
  onDelete?: () => void;
  /** 위젯이 SUBSCRIBE 옵션을 바꾸기 위해 모니터링 일시정지를 요청할 때 호출. */
  onRequestPause?: () => void;
  draggableClass?: string;
}

/**
 * 커스텀 위젯 카드.
 *
 * - 우선순위 1: `widgets/registry.ts` 에 등록된 컴포넌트 (BE 와 1:1 매칭되는 실 위젯)
 * - 우선순위 2: 본 파일 내 데모 placeholder (시안 §6 ExtensionStatusGrid / SLA 게이지)
 * - 우선순위 3: GenericCustomPlaceholder (FE 컴포넌트 미구현 widgetType)
 */
export default function CustomWidgetCard({ widget, editMode, data, onSettings, onDelete, onRequestPause, draggableClass }: CustomWidgetCardProps) {
  const Registered = getCustomWidgetComponent(widget.widgetTypeId);

  return (
    <div className="flex flex-col h-full bg-white bt-shadow overflow-hidden">
      <WidgetCardHeader widget={widget} editMode={editMode} onSettings={onSettings} onDelete={onDelete} draggableClass={draggableClass} />
      <div className="flex-1 overflow-hidden">
        {Registered ? (
          <Registered data={data} options={widget.options} widgetId={widget.widgetId} onRequestPause={onRequestPause} />
        ) : widget.widgetTypeId === 'extension-status-grid' ? (
          <ExtensionStatusGridDemo />
        ) : widget.widgetTypeId === 'service-level-gauge' ? (
          <ServiceLevelGaugeDemo />
        ) : (
          <GenericCustomPlaceholder typeId={widget.widgetTypeId} typeName={widget.widgetTypeName} />
        )}
      </div>
    </div>
  );
}

// ─── 내선 상태 격자 demo (시안 §6) ─────────────────────────────────────

function ExtensionStatusGridDemo() {
  const colors = ['bg-[var(--color-bt-success)]', 'bg-[var(--color-bt-primary)]', 'bg-[var(--color-bt-warn)]', 'bg-[var(--color-bt-fg-muted)]/40'];
  const cells = Array.from({ length: 64 }, (_, i) => {
    if (i === 12 || i === 23) return 'bg-[var(--color-bt-danger)] pulse-dot-danger';
    return colors[Math.floor(((i * 7) % 11) / 3)];
  });
  return (
    <div className="flex flex-col h-full p-3">
      <div className="mb-2 flex items-center gap-3 text-[10px]">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 bg-[var(--color-bt-success)]" />
          대기 38
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 bg-[var(--color-bt-primary)]" />
          통화 16
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 bg-[var(--color-bt-warn)]" />
          대기중 6
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 bg-[var(--color-bt-danger)]" />
          장애 2
        </span>
      </div>
      <div className="grid gap-0.5 flex-1" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
        {cells.map((c, i) => (
          <div key={i} className={`aspect-square ${c}`} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-bt-fg-muted)]">
        <span>전체 64개 · 가용 86%</span>
      </div>
    </div>
  );
}

// ─── SLA 게이지 demo ────────────────────────────────────────────────

function ServiceLevelGaugeDemo() {
  const level = 87;
  const isGood = level >= 80;
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e4e7ec" strokeWidth="14" strokeLinecap="round" />
        <path
          d={`M 20 100 A 80 80 0 0 1 ${20 + 160 * (level / 100)} ${100 - Math.sin(Math.PI * (level / 100)) * 80}`}
          fill="none"
          stroke={isGood ? '#0a8a4a' : '#b76e00'}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <text x="100" y="85" textAnchor="middle" fontSize="30" fontWeight="bold" fill={isGood ? '#0a8a4a' : '#b76e00'} className="mono">
          {level}%
        </text>
        <text x="100" y="105" textAnchor="middle" fontSize="10" fill="#6a6f78">
          목표 80%
        </text>
      </svg>
      <div className="mt-2 text-[10px] text-[var(--color-bt-fg-muted)]">20초 내 응답률 · 임계값 80%</div>
    </div>
  );
}

// ─── Generic placeholder ────────────────────────────────────────────

function GenericCustomPlaceholder({ typeId, typeName }: { typeId: string; typeName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="mb-2 text-[12px] font-semibold text-[var(--color-bt-fg-muted)]">{typeName ?? typeId}</div>
      <div className="mono text-[10px] text-[var(--color-bt-fg-muted)]">{typeId}</div>
      <div className="mt-2 text-[10px] text-[var(--color-bt-fg-muted)] italic">FE 컴포넌트 구현 필요 (M8)</div>
    </div>
  );
}
