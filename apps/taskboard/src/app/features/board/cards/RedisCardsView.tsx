import type { CSSProperties } from 'react';
import { type CardPreset, getCardPreset } from './cardPresets';
import { useValueChangeKey } from '../hooks/useValueChangeAnimation';
import type { DroppedWidget, WidgetStyle } from '../types/taskboard.types';
import { getValueAnimationClass, getValueAnimationStyle } from '../utils/widgetVisualStyle';

/**
 * 카드 1개 — 테이블 셀(AnimatedTableCell)과 동일하게 값이 바뀌면 위젯 style.valueChangeAnimation
 * (깜빡/펄스/흔들림/하이라이트)으로 반응한다. 카드의 모든 슬롯 값을 이어붙인 signature가 바뀔 때만 애니메이션.
 */
function AnimatedCardItem({ preset, data, accent, style }: { preset: CardPreset; data: Record<string, string>; accent: string; style: WidgetStyle }) {
  const signature = preset.slots.map((s) => data[s.key] ?? '').join('|');
  const animKey = useValueChangeKey(signature);
  const animation = style.valueChangeAnimation;
  const isHighlight = animation === 'highlight';
  return (
    <div style={{ position: 'relative' }}>
      {isHighlight && <span key={`hl-${animKey}`} className="absolute inset-0 pointer-events-none tb-anim-highlight" style={getValueAnimationStyle(style)} />}
      <div key={animKey} className={!isHighlight ? getValueAnimationClass(animation) : ''} style={!isHighlight ? getValueAnimationStyle(style) : undefined}>
        {preset.Render({ data, accent })}
      </div>
    </div>
  );
}

/**
 * table 위젯(viewMode='cards')의 카드 렌더 — RedisTableWidget이 계산한 최종 rows(정렬/limit/이름매핑 반영)를
 * 받아, 각 행을 카드 1개로 반복 렌더한다. 컬럼→슬롯 매핑(cardConfig.slotMap)으로 프리셋 카드에 값을 채운다.
 * 값은 전부 문자열로 넘겨 프리셋(React)이 JSX 텍스트로 렌더 → 자동 escape로 XSS 불가.
 */
export function RedisCardsView({
  widget,
  rows,
  showTitle,
  displayTitle,
  fontScale = 1,
}: {
  widget: DroppedWidget;
  rows: Record<string, string | number>[];
  showTitle: boolean;
  displayTitle: string;
  fontScale?: number;
}) {
  const cfg = widget.item.tableConfig?.cardConfig;
  const preset = getCardPreset(cfg?.presetId);
  const accent = cfg?.accent?.trim() ? cfg.accent : preset.defaultAccent;
  const slotMap = cfg?.slotMap ?? {};
  const cols = cfg?.columns && cfg.columns > 0 ? cfg.columns : 0;

  const gridStyle: CSSProperties = {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: cols > 0 ? `repeat(${cols}, minmax(0, 1fr))` : 'repeat(auto-fill, minmax(150px, 1fr))',
    gridAutoRows: 'min-content',
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`,
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto p-0.5"
        style={{ fontSize: `${Math.max(9, Math.round(widget.style.fontSize * 0.7 * fontScale))}px`, fontFamily: widget.style.fontFamily }}
      >
        {rows.length === 0 ? (
          <div className="opacity-50 py-2 text-center">데이터 없음</div>
        ) : (
          <div style={gridStyle}>
            {rows.map((row, i) => {
              const data: Record<string, string> = {};
              preset.slots.forEach((slot) => {
                const colKey = slotMap[slot.key];
                const raw = colKey ? row[colKey] : undefined;
                data[slot.key] = raw != null ? String(raw) : '';
              });
              return <AnimatedCardItem key={i} preset={preset} data={data} accent={accent} style={widget.style} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
