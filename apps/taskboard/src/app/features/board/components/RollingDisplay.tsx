import { useCallback, useEffect, useRef, useState } from 'react';
import { AnnouncementWidget, isAnnouncementWidget } from './AnnouncementWidget';
import { RedisTableWidget, collectRedisTableWsSubscriptions, isRedisTableWidget } from './RedisTableWidget';
import { WebEmbedWidget, isWebEmbedWidget } from './WebEmbedWidget';
import { type CtiWsDataByHashKey, type CtiWsSubscription, type CtiqRecord, useCtiqWebSocket } from '../hooks/useCtiqWebSocket';
import { useResponsiveFontScale } from '../hooks/useResponsiveFontScale';
import { useGetDbQueryDefList, useGetDbQueryDefOptionsMulti, useGetRedisHashKeys } from '../hooks/useTaskboardQueries';
import { useValueChangeKey } from '../hooks/useValueChangeAnimation';
import { type DroppedWidget, type TaskboardDisplaySelection, parseLayoutWidgets } from '../types/taskboard.types';
import { DEFAULT_CUSTOM_CLOCK_FORMAT, formatCustomClock } from '../utils/clockFormat';
import {
  buildDataSourceKeySelectionIds,
  buildGroupReasonHashKeys,
  buildReasonFamilyTargetIdsByPrefix,
  collectDbQueryWsSubscriptions,
  collectRedisWsSubscriptions,
  extractNameValueItems,
  findEntitySelectionDbQueryIdsByPrefix,
  getCalcDisplayValue,
  getRedisDisplayValue,
  groupSumAcrossHashKeys,
  groupSumRedisHashEntries,
  mergeDbQuerySelections,
  mergeWsSubscriptions,
  parseGroupReasonHashKey,
  resolveGroupIdsFromSelection,
  resolveMediaTypesFromSelection,
  resolveValidEntityIds,
} from '../utils/redisValue';
import {
  VALUE_CHANGE_ANIMATION_CSS,
  formatWidgetValue,
  getThresholdColor,
  getValueAnimationClass,
  getValueAnimationStyle,
  getValueOffsetStyle,
  getWidgetVisualStyle,
  isTransparentBg,
} from '../utils/widgetVisualStyle';

export interface RollingLayout {
  layoutId: number;
  layoutName: string;
  fileName?: string;
  layoutJson?: string;
  /** 이 슬라이드에 입힐 뷰 그룹(선택값 묶음) ID — 단일 모드 */
  displayId: number;
  selectionJson?: string;
  /** 섹션 모드일 때 구역별 뷰 그룹 선택값 (있으면 sectionKey 기준으로 selection을 골라 씀) */
  sectionSelections?: Record<string, TaskboardDisplaySelection>;
}

export interface RollingData {
  transitionType: string;
  layouts: RollingLayout[];
}

export function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

export const parseRollingData = (raw?: string): RollingData => {
  try {
    if (!raw) return { transitionType: 'fade', layouts: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { transitionType: 'fade', layouts: parsed as RollingLayout[] };
    return {
      transitionType: (parsed as RollingData).transitionType ?? 'fade',
      layouts: (parsed as RollingData).layouts ?? [],
    };
  } catch {
    return { transitionType: 'fade', layouts: [] };
  }
};

export const TRANSITION_OPTIONS = [
  { value: 'none', label: '기본', icon: '■' },
  { value: 'fade', label: '페이드', icon: '✦' },
  { value: 'slideLeft', label: '← 슬라이드', icon: '←' },
  { value: 'slideRight', label: '→ 슬라이드', icon: '→' },
  { value: 'slideUp', label: '↑ 슬라이드', icon: '↑' },
  { value: 'slideDown', label: '↓ 슬라이드', icon: '↓' },
  { value: 'zoomIn', label: '줌 인', icon: '⊕' },
  { value: 'zoomOut', label: '줌 아웃', icon: '⊖' },
  { value: 'blur', label: '블러', icon: '◎' },
  { value: 'flip', label: '플립', icon: '⟳' },
  { value: 'mosaic', label: '모자이크', icon: '▦' },
  { value: 'wipe', label: '와이프', icon: '◨' },
  { value: 'rotateIn', label: '회전', icon: '↻' },
  { value: 'bounce', label: '바운스', icon: '⤵' },
  { value: 'random', label: '랜덤', icon: '⚄' },
];

const TRANSITION_ANIMATION: Record<string, string> = {
  none: '',
  fade: 'rollingFadeIn 0.7s ease-in-out',
  slideLeft: 'rollingSlideLeft 0.5s ease-out',
  slideRight: 'rollingSlideRight 0.5s ease-out',
  slideUp: 'rollingSlideUp 0.5s ease-out',
  slideDown: 'rollingSlideDown 0.5s ease-out',
  zoomIn: 'rollingZoomIn 0.6s ease-out',
  zoomOut: 'rollingZoomOut 0.6s ease-out',
  blur: 'rollingBlur 0.7s ease-in-out',
  flip: 'rollingFlip 0.7s ease-out',
  mosaic: 'rollingMosaicIn 0.9s ease-out',
  wipe: 'rollingWipeIn 0.6s ease-in-out',
  rotateIn: 'rollingRotateIn 0.6s ease-out',
  bounce: 'rollingBounceIn 0.8s ease-out',
};

/** '랜덤' 선택 시 매 전환마다 이 목록에서 하나를 골라 적용 ('기본'은 제외) */
export const RANDOM_TRANSITION_POOL = Object.keys(TRANSITION_ANIMATION).filter((key) => key !== 'none');

export const TRANSITION_PREVIEW_ANIMATION: Record<string, string> = {
  none: 'pvNone 2s ease-in-out infinite',
  fade: 'pvFade 2s ease-in-out infinite',
  slideLeft: 'pvSlideLeft 2s ease-in-out infinite',
  slideRight: 'pvSlideRight 2s ease-in-out infinite',
  slideUp: 'pvSlideUp 2s ease-in-out infinite',
  slideDown: 'pvSlideDown 2s ease-in-out infinite',
  zoomIn: 'pvZoomIn 2s ease-in-out infinite',
  zoomOut: 'pvZoomOut 2s ease-in-out infinite',
  blur: 'pvBlur 2s ease-in-out infinite',
  flip: 'pvFlip 2s ease-in-out infinite',
  mosaic: 'pvMosaic 2s ease-in-out infinite',
  wipe: 'pvWipe 2s ease-in-out infinite',
  rotateIn: 'pvRotateIn 2s ease-in-out infinite',
  bounce: 'pvBounce 2s ease-in-out infinite',
  random: 'pvRandom 2s ease-in-out infinite',
};

const TRANSITION_CSS = `
  @keyframes rollingFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rollingSlideLeft { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideRight { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rollingSlideDown { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rollingZoomIn { from { opacity: 0; transform: scale(0.75); } to { opacity: 1; transform: scale(1); } }
  @keyframes rollingZoomOut { from { opacity: 0; transform: scale(1.25); } to { opacity: 1; transform: scale(1); } }
  @keyframes rollingBlur { from { opacity: 0; filter: blur(24px); } to { opacity: 1; filter: blur(0); } }
  @keyframes rollingFlip { from { opacity: 0; transform: perspective(1000px) rotateY(-90deg); } to { opacity: 1; transform: perspective(1000px) rotateY(0); } }
  @keyframes rollingMosaicIn {
    from {
      opacity: 0;
      filter: blur(2px);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      -webkit-mask-size: 28px 28px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      mask-size: 28px 28px;
    }
    to {
      opacity: 1;
      filter: blur(0);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      -webkit-mask-size: 2px 2px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      mask-size: 2px 2px;
    }
  }
  @keyframes rollingWipeIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes rollingRotateIn { from { opacity: 0; transform: rotate(-10deg) scale(0.85); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
  @keyframes rollingBounceIn {
    0% { opacity: 0; transform: translateY(-60px); }
    60% { opacity: 1; transform: translateY(12px); }
    80% { transform: translateY(-6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export const TRANSITION_PREVIEW_CSS = `
  @keyframes pvFade { 0%,100%{opacity:0} 40%,60%{opacity:1} }
  @keyframes pvSlideLeft { 0%{transform:translateX(12px);opacity:0} 40%,60%{transform:translateX(0);opacity:1} 100%{transform:translateX(-12px);opacity:0} }
  @keyframes pvSlideRight { 0%{transform:translateX(-12px);opacity:0} 40%,60%{transform:translateX(0);opacity:1} 100%{transform:translateX(12px);opacity:0} }
  @keyframes pvSlideUp { 0%{transform:translateY(10px);opacity:0} 40%,60%{transform:translateY(0);opacity:1} 100%{transform:translateY(-10px);opacity:0} }
  @keyframes pvSlideDown { 0%{transform:translateY(-10px);opacity:0} 40%,60%{transform:translateY(0);opacity:1} 100%{transform:translateY(10px);opacity:0} }
  @keyframes pvZoomIn { 0%,100%{transform:scale(0.4);opacity:0} 40%,60%{transform:scale(1);opacity:1} }
  @keyframes pvZoomOut { 0%,100%{transform:scale(1.6);opacity:0} 40%,60%{transform:scale(1);opacity:1} }
  @keyframes pvBlur { 0%,100%{filter:blur(6px);opacity:0} 40%,60%{filter:blur(0);opacity:1} }
  @keyframes pvFlip { 0%{transform:perspective(60px) rotateY(-90deg);opacity:0} 40%,60%{transform:perspective(60px) rotateY(0);opacity:1} 100%{transform:perspective(60px) rotateY(90deg);opacity:0} }
  @keyframes pvMosaic {
    0%,100% {
      opacity: 0; filter: blur(2px);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%); -webkit-mask-size: 14px 14px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%); mask-size: 14px 14px;
    }
    40%,60% {
      opacity: 1; filter: blur(0);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%); -webkit-mask-size: 2px 2px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%); mask-size: 2px 2px;
    }
  }
  @keyframes pvWipe { 0%{clip-path:inset(0 100% 0 0)} 40%,60%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 100%)} }
  @keyframes pvRotateIn { 0%,100%{transform:rotate(-10deg) scale(0.7);opacity:0} 40%,60%{transform:rotate(0deg) scale(1);opacity:1} }
  @keyframes pvBounce {
    0%,100% { opacity:0; transform: translateY(-12px); }
    30% { opacity:1; transform: translateY(4px); }
    40% { transform: translateY(-2px); }
    50%,65% { opacity:1; transform: translateY(0); }
  }
  @keyframes pvRandom {
    0%,100% { opacity:0; transform: scale(0.5) rotate(-12deg); filter: blur(3px); }
    30% { opacity:1; transform: scale(1) rotate(0deg) translateX(0); filter: blur(0); }
    50%,60% { opacity:1; transform: scale(1) rotate(0deg) translateX(0); }
    80% { opacity:1; transform: translateX(6px); }
  }
  @keyframes pvNone { 0%,39.9%{opacity:0} 40%,60%{opacity:1} 60.1%,100%{opacity:0} }
`;

const ROLLING_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime', 'etc-custom']);

function RollingValueWidget({
  widget,
  widgets,
  redisData,
  selectionIdsByHashKey,
  targetIdsByPrefix = {},
  selectedMediaTypes = [],
  fontScale = 1,
}: {
  widget: DroppedWidget;
  widgets: DroppedWidget[];
  redisData?: CtiWsDataByHashKey;
  selectionIdsByHashKey?: Record<string, string[]>;
  /** REASON 패밀리(그룹/스킬 등) 단일값 위젯 전용 — 이 슬라이드의 basePrefix별 디스플레이 선택 엔티티 ID 목록. */
  targetIdsByPrefix?: Record<string, string[]>;
  /** 마스킹된 "{mediatype}" 키(GROUP/CTIQ/AGENT 등) 단일값 위젯 전용 — 이 슬라이드가 선택한 미디어타입. */
  selectedMediaTypes?: string[];
  fontScale?: number;
}) {
  const isEtcClock = widget.item.category === 'etc' && ROLLING_ETC_CLOCK_IDS.has(widget.item.id);
  const isDbQuery = widget.item.category === 'DbQuery' && !!widget.item.dbQueryKey;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

  // DbQuery: WS(DB:QUERY 가상 해시키)로 실시간 데이터 수신 — REST 폴링 불필요.
  const dbRecord = isDbQuery ? ((redisData?.['DB:QUERY'] as Record<string, Record<string, string>> | undefined)?.[widget.item.dbQueryKey!] ?? {}) : {};
  const dbQueryValue = isDbQuery
    ? widget.item.dbQueryColumn
      ? (dbRecord[widget.item.dbQueryColumn] ?? dbRecord[widget.item.dbQueryColumn.toUpperCase()] ?? String(widget.item.sampleValue ?? ''))
      : (Object.values(dbRecord)[0] ?? String(widget.item.sampleValue ?? ''))
    : '';

  const getLiveValue = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const mo = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    if (widget.item.id === 'etc-date') return `${y}${mo}${d}`;
    if (widget.item.id === 'etc-time') return `${h}${mi}${s}`;
    if (widget.item.id === 'etc-datetime') return `${y}${mo}${d} ${h}:${mi}:${s}`;
    if (widget.item.id === 'etc-custom') return formatCustomClock(now, widget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT);
    return String(widget.item.sampleValue);
  };

  const isRedis = widget.item.category === 'Redis' && !!widget.item.redisHashKey;
  const isCalc = widget.item.category === 'Calc';
  const groupBy = isRedis ? widget.item.groupBy : undefined;
  // IC:GROUP:REASON:{groupId}:{mediaType}처럼 그룹마다 키가 따로 있는 패밀리는 이 슬라이드가 선택한
  // 그룹들의 키를 전부 모아 합산한다(뷰그룹에 없는 그룹은 절대 섞이지 않음). 데이터는 REST 폴링이 아니라
  // 화면 단일 WS 연결(redisData)에서 그대로 읽는다.
  const groupReason = isRedis ? parseGroupReasonHashKey(widget.item.redisHashKey!) : null;
  const groupBySum = groupBy
    ? groupReason
      ? (groupSumAcrossHashKeys(
          redisData ?? {},
          buildGroupReasonHashKeys(groupReason.prefix, groupReason.mediaType, targetIdsByPrefix[groupReason.basePrefix] ?? []),
          groupBy.byKey,
          groupBy.aggKey,
        ).get(groupBy.matchValue) ?? 0)
      : (groupSumRedisHashEntries(redisData?.[widget.item.redisHashKey!] ?? {}, groupBy.byKey, groupBy.aggKey).get(groupBy.matchValue) ?? 0)
    : undefined;
  const displayValue = isEtcClock
    ? getLiveValue()
    : isDbQuery
      ? dbQueryValue
      : isCalc
        ? getCalcDisplayValue(widget, widgets, redisData, selectionIdsByHashKey, targetIdsByPrefix, selectedMediaTypes)
        : (groupBySum ?? (isRedis ? getRedisDisplayValue(widget, redisData, selectionIdsByHashKey, targetIdsByPrefix, selectedMediaTypes) : widget.item.sampleValue));
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const animKey = useValueChangeKey(displayValue);
  const thresholdColor = getThresholdColor(displayValue, widget.style);
  return (
    <div className="relative w-full h-full flex flex-col justify-center px-2 overflow-hidden">
      {/* 하이라이트 모션은 텍스트가 아니라 위젯 박스 전체를 덮는 오버레이로 그려서, 값 위치 세밀조정으로
          텍스트가 어디로 이동해 있어도 사용자가 정한 위젯 영역 전체에 배경색이 채워지게 한다. */}
      {widget.style.valueChangeAnimation === 'highlight' && (
        <div key={`hl-${animKey}`} className="absolute inset-0 pointer-events-none tb-anim-highlight" style={getValueAnimationStyle(widget.style)} />
      )}
      {showTitle && (
        <div
          className="truncate mb-0.5 opacity-80 leading-tight"
          style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`, textAlign: widget.style.titleAlign ?? 'left' }}
        >
          {displayTitle}
        </div>
      )}
      <div
        key={animKey}
        className={`font-bold leading-tight truncate ${widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationClass(widget.style.valueChangeAnimation) : ''}`}
        style={{
          fontSize: widget.style.fontSize * fontScale,
          textAlign: widget.style.valueAlign ?? 'left',
          color: thresholdColor,
          ...getValueOffsetStyle(widget.style),
          ...(widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationStyle(widget.style) : {}),
        }}
      >
        {formatWidgetValue(displayValue, widget.style.useThousandSep)}
        {isCalc && widget.calc?.showPercent && (
          <span
            className="font-normal ml-0.5 opacity-70"
            style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * (widget.calc?.percentFontScale ?? 0.65) * fontScale))}px` }}
          >
            %
          </span>
        )}
        {widget.item.unit && (
          <span className="font-normal ml-0.5 opacity-70" style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px` }}>
            {widget.item.unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── LayoutScreen ─────────────────────────────────────────────────────────────
interface LayoutScreenProps {
  layout: RollingLayout;
  /** RollingPlayer가 로테이션 전체 레이아웃 합산으로 구독한 WS 데이터(공유) */
  dataByHashKey?: Record<string, Record<string, CtiqRecord>>;
}

export function LayoutScreen({ layout, dataByHashKey = {} }: LayoutScreenProps) {
  const rawWidgets = parseLayoutWidgets(layout.layoutJson);
  const selection = parseSelection(layout.selectionJson);
  const { sectionSelections } = layout;
  const [imgRatio, setImgRatio] = useState(16 / 9);
  const fontScale = useResponsiveFontScale(imgRatio);

  // 데이터소스관리 탭에 등록된 커스텀 데이터소스(dbQueryId)의 등록 키 ↔ 위젯 redisHashKey 매칭 —
  // 이 슬라이드 자신의 선택값 기준.
  const { data: dbQueryDefs = [] } = useGetDbQueryDefList();
  const widgets = rawWidgets;
  const placeholderDefs = dbQueryDefs.filter((d) => !!d.placeholderName);
  // 그룹 목록 데이터소스(IC:GROUP:{mediatype} 등록)의 전체 VALUE — REASON 그룹 스코프 "선택 없음=전체" 폴백용.
  const groupListDbQueryId = findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs).get('IC:GROUP:');
  const optionFetchIds = [...new Set([...placeholderDefs.map((d) => d.dbQueryId), ...(groupListDbQueryId !== undefined ? [groupListDbQueryId] : [])])];
  const optionsResults = useGetDbQueryDefOptionsMulti(optionFetchIds);
  const optionValuesById: Record<number, string[]> = Object.fromEntries(
    optionFetchIds.map((id, idx) => [id, extractNameValueItems(optionsResults[idx]?.data ?? []).map((i) => i.id)]),
  );
  const placeholderOptionValues = Object.fromEntries(placeholderDefs.map((d) => [d.dbQueryId, optionValuesById[d.dbQueryId] ?? []]));
  const validGroupIds = groupListDbQueryId !== undefined ? (optionValuesById[groupListDbQueryId] ?? []) : [];

  // 이 레이아웃 기본 selection 기준 해시키별 선택 id — table 위젯의 행 필터(BE 초과분 방어)에 쓴다.
  const layoutTargetGroupIds = resolveValidEntityIds(resolveGroupIdsFromSelection(selection, dbQueryDefs), validGroupIds);
  const layoutSelectionIdsByHashKey = buildDataSourceKeySelectionIds(dbQueryDefs, selection.dbQuerySelections, placeholderOptionValues, { groupId: layoutTargetGroupIds });

  useEffect(() => {
    if (!layout.fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImgRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = layout.fileName;
  }, [layout.fileName]);

  const renderWidget = (widget: DroppedWidget) => {
    if (isAnnouncementWidget(widget)) return <AnnouncementWidget widget={widget} />;
    if (isWebEmbedWidget(widget)) return <WebEmbedWidget widget={widget} />;
    // 섹션 모드: 위젯의 sectionKey로 구역별 선택값 적용, 없으면 __etc fallback, 그것도 없으면 기본 selection
    const effectiveSel = widget.sectionKey && sectionSelections ? (sectionSelections[widget.sectionKey] ?? sectionSelections['__etc'] ?? selection) : selection;
    // REASON 패밀리(그룹/스킬 등)용 targetIdsByPrefix도 이 위젯의 sectionKey 기준 selection을 따라야 한다(레이아웃 전체 기준 X)
    const effectiveGroupIds = resolveGroupIdsFromSelection(effectiveSel, dbQueryDefs);
    const effectiveMediaTypes = resolveMediaTypesFromSelection(effectiveSel, dbQueryDefs);
    // 그룹은 "선택 없음=전체(그룹 데이터소스 전체)" 폴백, 그 외 엔티티는 등록 데이터소스 선택값(없으면 0 표시).
    const effectiveTargetGroupIds = resolveValidEntityIds(effectiveGroupIds, validGroupIds);
    const effectiveTargetIdsByPrefix = buildReasonFamilyTargetIdsByPrefix(dbQueryDefs, effectiveSel.dbQuerySelections);
    effectiveTargetIdsByPrefix['IC:GROUP:'] = effectiveTargetGroupIds;
    // 값 위젯은 이 섹션(effectiveSel)만의 id로 값 계산(레이아웃 전체 union을 쓰면 여러 섹션 위젯이 같은 합산값을 봄).
    const effectiveSelectionIdsByHashKey = buildDataSourceKeySelectionIds(dbQueryDefs, effectiveSel.dbQuerySelections, placeholderOptionValues, {
      groupId: effectiveTargetGroupIds,
    });
    // table-redis/그룹·스킬 이석사유/조인 테이블은 RedisTableWidget 내부에서 표/차트 모두 처리(실데이터 fetch가 거기 있어서)
    if (isRedisTableWidget(widget))
      return (
        <RedisTableWidget
          widget={widget}
          fontScale={fontScale}
          dataByHashKey={dataByHashKey}
          targetIdsByPrefix={effectiveTargetIdsByPrefix}
          // table 위젯 행 필터 — 이 레이아웃 selection 기준 선택 id로 BE 초과분(빈 큐)을 걸러낸다.
          selectionIdsByHashKey={layoutSelectionIdsByHashKey}
        />
      );
    return (
      <RollingValueWidget
        widget={widget}
        widgets={widgets}
        redisData={dataByHashKey}
        selectionIdsByHashKey={effectiveSelectionIdsByHashKey}
        targetIdsByPrefix={effectiveTargetIdsByPrefix}
        selectedMediaTypes={effectiveMediaTypes}
        fontScale={fontScale}
      />
    );
  };

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: `min(100vw, calc(${imgRatio} * 100vh))`,
          height: `min(100vh, calc(100vw / ${imgRatio}))`,
        }}
      >
        {layout.fileName && <img src={layout.fileName} alt={layout.layoutName} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />}
        {widgets.map((widget) => (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: `${widget.x}%`,
              top: `${widget.y}%`,
              width: `${widget.w ?? 13}%`,
              height: `${widget.h ?? 16}%`,
              ...getWidgetVisualStyle(widget.style, fontScale),
            }}
            className={isTransparentBg(widget.style) ? '' : 'shadow-xl backdrop-blur-sm'}
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RollingPlayer ─────────────────────────────────────────────────────────────
export interface RollingPlayerProps {
  layouts: RollingLayout[];
  intervalSec: number;
  transitionType?: string;
  onStop?: () => void;
}

export function RollingPlayer({ layouts, intervalSec, transitionType = 'fade', onStop }: RollingPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로테이션에 포함된 모든 레이아웃의 디스플레이 선택값을 합산해 WS 구독 하나로 커버.
  // 섹션모드 레이아웃은 selectionJson(첫 섹션)만이 아니라 sectionSelections(전 섹션)를 모두 펼쳐야
  // 첫 섹션 외 구역 위젯의 큐/그룹/미디어타입까지 구독된다(TaskView.SingleLayoutView와 동일 규칙).
  const allSelections = layouts.flatMap((l) => (l.sectionSelections ? Object.values(l.sectionSelections) : [parseSelection(l.selectionJson)]));

  // 데이터소스관리 탭에 등록된 커스텀 데이터소스(dbQueryId)의 등록 키 ↔ 위젯 redisHashKey 매칭 — 로테이션
  // 내 모든 슬라이드의 선택값을 합산해 구독 자원을 넉넉히 만들어 둔다. 그룹 목록 데이터소스 옵션도 함께 조회(REASON 전체 폴백용).
  const { data: dbQueryDefs = [], isLoading: dbQueryDefsLoading } = useGetDbQueryDefList();
  const mergedDbQuerySelections = mergeDbQuerySelections(allSelections.map((s) => s.dbQuerySelections));
  const allPlaceholderDefs = dbQueryDefs.filter((d) => !!d.placeholderName);
  const groupListDbQueryId = findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs).get('IC:GROUP:');
  const optionFetchIds = [...new Set([...allPlaceholderDefs.map((d) => d.dbQueryId), ...(groupListDbQueryId !== undefined ? [groupListDbQueryId] : [])])];
  const optionsResults = useGetDbQueryDefOptionsMulti(optionFetchIds);
  const optionValuesById: Record<number, string[]> = Object.fromEntries(
    optionFetchIds.map((id, idx) => [id, extractNameValueItems(optionsResults[idx]?.data ?? []).map((i) => i.id)]),
  );
  const allPlaceholderOptionValues = Object.fromEntries(allPlaceholderDefs.map((d) => [d.dbQueryId, optionValuesById[d.dbQueryId] ?? []]));
  const validGroupIds = groupListDbQueryId !== undefined ? (optionValuesById[groupListDbQueryId] ?? []) : [];

  // 마스터 데이터(데이터소스 정의/옵션) 로딩 중에는 빈 구독 → WS 연결 미룸(로드 순서에 따른 재연결 방지)
  const isMasterLoading = dbQueryDefsLoading || optionsResults.some((r) => r.isLoading);

  const allWidgets = layouts.flatMap((l) => parseLayoutWidgets(l.layoutJson));
  const allSelectedGroupIds = [...new Set(allSelections.flatMap((s) => resolveGroupIdsFromSelection(s, dbQueryDefs)))];
  // 슬라이드마다 미디어타입이 다를 수 있으므로 구독은 전체 슬라이드 선택값의 합집합으로 넉넉히 받는다
  // (표시는 LayoutScreen이 슬라이드 자신의 selectedMediaTypes로 다시 좁혀 읽는다).
  const allSelectedMediaTypes = [...new Set(allSelections.flatMap((s) => resolveMediaTypesFromSelection(s, dbQueryDefs)))];
  // IC:GROUP:REASON 패밀리 전용 — 로테이션 내 모든 슬라이드 선택값의 합집합(없으면 그룹 데이터소스 전체).
  const allGroupReasonTargetGroupIds = resolveValidEntityIds(allSelectedGroupIds, validGroupIds);
  const allTargetIdsByPrefix = buildReasonFamilyTargetIdsByPrefix(dbQueryDefs, mergedDbQuerySelections);
  allTargetIdsByPrefix['IC:GROUP:'] = allGroupReasonTargetGroupIds;

  // Redis 값/테이블 위젯 WS 구독 — 위젯이 실제 쓰는 hashKey만. 큐/그룹/상담사 마스터목록은 데이터소스 경로로 처리.
  const allSelectionIdsByHashKey = buildDataSourceKeySelectionIds(dbQueryDefs, mergedDbQuerySelections, allPlaceholderOptionValues, { groupId: allGroupReasonTargetGroupIds });
  const widgetRedisSubscriptions = collectRedisWsSubscriptions(allWidgets, allSelectionIdsByHashKey, allTargetIdsByPrefix, allSelectedMediaTypes);

  // table-redis(임의 해시 통째로 보여주는 위젯) 구독도 같이 모아서 화면당 단일 소켓에 합친다.
  const { data: allRedisHashKeysForTable = [] } = useGetRedisHashKeys();
  // allowAllGroupsFallback=false — 실행 화면에서 그룹 스코프가 비면 전체로 새지 않고 0(TaskView와 동일 정책).
  // selectionIdsByHashKey 전달 — 뷰그룹이 선택한 행 id만 구독(전체 * 대신). 선택 없는 해시키는 * 폴백.
  const redisTableSubscriptions = collectRedisTableWsSubscriptions(allWidgets, allRedisHashKeysForTable, allTargetIdsByPrefix, false, allSelectionIdsByHashKey);

  const subscriptions: CtiWsSubscription[] = isMasterLoading
    ? []
    : mergeWsSubscriptions([...widgetRedisSubscriptions, ...redisTableSubscriptions, ...collectDbQueryWsSubscriptions(allWidgets)]);
  const { dataByHashKey } = useCtiqWebSocket(subscriptions);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    if (layouts.length <= 1) return;
    setProgress(0);
    let elapsed = 0;
    const totalMs = intervalSec * 1000;
    const progressInterval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / totalMs) * 100, 100));
    }, 100);
    const slideTimer = setTimeout(() => setCurrentIndex((prev) => (prev + 1) % layouts.length), totalMs);
    return () => {
      clearInterval(progressInterval);
      clearTimeout(slideTimer);
    };
  }, [currentIndex, layouts.length, intervalSec]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // '랜덤'은 매 전환(currentIndex 변경)마다 한 번씩 새로 뽑아 전환 도중 애니메이션이 바뀌지 않도록 고정
  const [randomAnimation, setRandomAnimation] = useState(() => TRANSITION_ANIMATION[RANDOM_TRANSITION_POOL[Math.floor(Math.random() * RANDOM_TRANSITION_POOL.length)]]);
  useEffect(() => {
    if (transitionType !== 'random') return;
    setRandomAnimation(TRANSITION_ANIMATION[RANDOM_TRANSITION_POOL[Math.floor(Math.random() * RANDOM_TRANSITION_POOL.length)]]);
  }, [transitionType, currentIndex]);

  const current = layouts[currentIndex];
  if (!current) return null;

  const animation = transitionType === 'random' ? (randomAnimation ?? TRANSITION_ANIMATION.fade) : (TRANSITION_ANIMATION[transitionType] ?? TRANSITION_ANIMATION.fade);
  const styleContent = TRANSITION_CSS + VALUE_CHANGE_ANIMATION_CSS + `body { cursor: ${showControls ? 'auto' : 'none'} !important; }`;

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      <div key={currentIndex} className="absolute inset-0" style={{ animation }}>
        <LayoutScreen layout={current} dataByHashKey={dataByHashKey} />
      </div>

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            {onStop && (
              <button onClick={onStop} className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                ← 그룹 목록
              </button>
            )}
            <span className="text-white font-bold text-sm truncate min-w-0">{current.layoutName}</span>
            <span className="text-white/40 text-xs flex-shrink-0">
              {currentIndex + 1} / {layouts.length}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-white/40 text-xs">{intervalSec}초마다 전환</span>
            <button
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
              title={isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {layouts.length > 1 && (
          <div className="flex justify-center gap-2 pb-3 pt-4 bg-gradient-to-t from-black/60 to-transparent">
            {layouts.map((l, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentIndex(i);
                  setProgress(0);
                }}
                className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                title={l.layoutName}
              />
            ))}
          </div>
        )}
        <div className="h-1 bg-white/20">
          <div className="h-full bg-[#0f5b9e] transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
