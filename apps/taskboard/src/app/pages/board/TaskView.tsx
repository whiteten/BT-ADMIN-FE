import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { taskboardApi } from '../../features/board/api/taskboardApi';
import { AnnouncementWidget, isAnnouncementWidget } from '../../features/board/components/AnnouncementWidget';
import { RedisTableWidget, collectRedisTableWsSubscriptions, isRedisTableWidget } from '../../features/board/components/RedisTableWidget';
import { WebEmbedWidget, isWebEmbedWidget } from '../../features/board/components/WebEmbedWidget';
import { type CtiWsDataByHashKey, type CtiWsSubscription, useCtiqWebSocket } from '../../features/board/hooks/useCtiqWebSocket';
import { useResponsiveFontScale } from '../../features/board/hooks/useResponsiveFontScale';
import {
  useGetDbQueryDefList,
  useGetDbQueryDefOptionsMulti,
  useGetRedisHashKeys,
  useGetTaskboardDisplayList,
  useGetTaskboardLayoutList,
} from '../../features/board/hooks/useTaskboardQueries';
import { useValueChangeKey } from '../../features/board/hooks/useValueChangeAnimation';
import { type DroppedWidget, type TaskboardDisplaySelection, parseLayoutWidgets } from '../../features/board/types/taskboard.types';
import { DEFAULT_CUSTOM_CLOCK_FORMAT, formatCustomClock } from '../../features/board/utils/clockFormat';
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
} from '../../features/board/utils/redisValue';
import {
  VALUE_CHANGE_ANIMATION_CSS,
  formatWidgetValue,
  getThresholdColor,
  getValueAnimationClass,
  getValueAnimationStyle,
  getValueOffsetStyle,
  getWidgetVisualStyle,
  isTransparentBg,
} from '../../features/board/utils/widgetVisualStyle';

/** 섹션키 → selection 맵. TaskView 섹션 모드에서 각 섹션의 뷰 그룹 선택값을 담는다. */
type SectionSelections = Record<string, TaskboardDisplaySelection>;

const VIEW_GRID_COLS = 24;
const VIEW_GRID_ROWS = 20;

function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

/** DB query 결과(배열 또는 단일 행)에서 column 값을 추출. 배열이면 첫 번째 행을 사용 */
function extractDbResult(json: unknown, column: string): string {
  let row: unknown = json;
  if (Array.isArray(row)) row = (row as unknown[])[0] ?? null;
  if (row == null) return '';
  if (typeof row !== 'object') return String(row);
  const rec = row as Record<string, unknown>;
  if (!column) {
    const vals = Object.values(rec);
    return vals.length === 1 ? String(vals[0]) : JSON.stringify(rec);
  }
  const val = rec[column] !== undefined ? rec[column] : rec[column.toUpperCase()];
  return val != null ? String(val) : '';
}

// ── ExternalApi 중복 호출 방지: 같은 URL은 타이머 1개만 유지 ─────────────────
type ExternalApiSubscriber = (json: unknown) => void;
interface ExternalApiCacheEntry {
  raw: unknown;
  subscribers: Set<ExternalApiSubscriber>;
  timer?: ReturnType<typeof setInterval>;
}
const externalApiCache = new Map<string, ExternalApiCacheEntry>();

function subscribeExternalApi(url: string, intervalMs: number, headers: string | undefined, onValue: ExternalApiSubscriber): () => void {
  const cacheKey = headers ? `${url}\0${headers}` : url;
  let entry = externalApiCache.get(cacheKey);
  if (!entry) {
    const isDb = url.startsWith('db:');
    const newEntry: ExternalApiCacheEntry = { raw: undefined, subscribers: new Set() };
    externalApiCache.set(cacheKey, newEntry);
    const fetchAndNotify = () => {
      const apiFn = isDb ? taskboardApi.executeDbQuery(url.slice(3)) : taskboardApi.testExternalApiUrl({ url, headers });
      apiFn
        .then((json) => {
          const e = externalApiCache.get(cacheKey);
          if (!e) return;
          e.raw = json;
          e.subscribers.forEach((s) => s(json));
        })
        .catch(() => {
          // 실패 시 기존 값 유지
        });
    };
    fetchAndNotify();
    newEntry.timer = setInterval(fetchAndNotify, intervalMs);
    entry = newEntry;
  } else if (entry.raw !== undefined) {
    onValue(entry.raw);
  }
  entry.subscribers.add(onValue);
  return () => {
    const e = externalApiCache.get(cacheKey);
    if (!e) return;
    e.subscribers.delete(onValue);
    if (e.subscribers.size === 0) {
      clearInterval(e.timer);
      externalApiCache.delete(cacheKey);
    }
  };
}

// ── 단일값 위젯 렌더 ────────────────────────────────────────────────────────
const VIEW_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime', 'etc-custom']);

function ViewValueWidget({
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
  /** REASON 패밀리(그룹/스킬 등) 단일값 위젯 전용 — basePrefix별 디스플레이 선택 엔티티 ID 목록(없으면 전체). */
  targetIdsByPrefix?: Record<string, string[]>;
  /** 마스킹된 "{mediatype}" 키(GROUP/CTIQ/AGENT 등) 단일값 위젯 전용 — 이 위젯이 속한 섹션이 선택한 미디어타입. */
  selectedMediaTypes?: string[];
  fontScale?: number;
}) {
  const isEtcClock = widget.item.category === 'etc' && VIEW_ETC_CLOCK_IDS.has(widget.item.id);
  const isExternalApi = widget.item.category === 'ExternalApi' && !!widget.item.externalApiUrl;
  const isDbQuery = widget.item.category === 'DbQuery' && !!widget.item.dbQueryKey;
  const [now, setNow] = useState(() => new Date());
  const [externalApiValue, setExternalApiValue] = useState<string>(() => String(widget.item.sampleValue ?? ''));

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

  useEffect(() => {
    if (!isExternalApi) return;
    const url = widget.item.externalApiUrl!;
    const intervalMs = Math.max(5, widget.item.externalApiIntervalSec ?? 30) * 1000;
    const path = widget.item.externalApiJsonPath ?? '';
    const isDb = url.startsWith('db:');
    const headers = widget.item.externalApiHeaders || undefined;
    return subscribeExternalApi(url, intervalMs, headers, (json) => {
      if (isDb) {
        setExternalApiValue(extractDbResult(json, path));
      } else {
        const raw = path ? (path.split('.').reduce<unknown>((o, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), json) ?? json) : json;
        setExternalApiValue(raw != null ? String(raw) : '');
      }
    });
  }, [isExternalApi, widget.item.externalApiUrl, widget.item.externalApiJsonPath, widget.item.externalApiIntervalSec, widget.item.externalApiHeaders]);

  // DbQuery 위젯 — WS(DB:QUERY 가상 해시키)로 실시간 푸시 수신. REST 폴링 불필요.
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
  // IC:GROUP:REASON:{groupId}:{mediaType}처럼 그룹마다 키가 따로 있는 패밀리는 디스플레이가 선택한
  // 그룹들의 키를 전부 모아 합산한다(뷰그룹에 없는 그룹은 절대 섞이지 않음). 그 외 일반 해시는 기존처럼
  // widget이 직접 가리키는 hashKey 하나만 본다. 데이터는 REST 폴링이 아니라 화면 단일 WS 연결(redisData —
  // collectRedisTableWsSubscriptions가 같이 구독해둔 결과)에서 그대로 읽는다.
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
      : isExternalApi
        ? externalApiValue
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

// ── 단일 레이아웃 뷰 ────────────────────────────────────────────────────────
function SingleLayoutView({
  displayName,
  layout,
  selection,
  sectionSelections,
}: {
  displayName: string;
  layout: { layoutName: string; layoutJson?: string; fileName?: string; pageName?: string };
  selection: TaskboardDisplaySelection;
  /** 섹션 모드일 때 섹션키 → selection 맵. 미지정 시 단일 selection 모드(기존 동작). */
  sectionSelections?: SectionSelections;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgRatio, setImgRatio] = useState(16 / 9);
  const fontScale = useResponsiveFontScale(imgRatio);

  // 그리드 모드 여백 보정을 위한 캔버스 실 픽셀 크기 (viewport 변화 시 fontScale 재렌더가 여기까지 전파됨)
  const canvasWPx = Math.min(window.innerWidth, imgRatio * window.innerHeight);
  const canvasHPx = Math.min(window.innerHeight, window.innerWidth / imgRatio);

  const rawWidgets = parseLayoutWidgets(layout.layoutJson);

  // layoutJson에서 그리드 모드 메타(layoutMode, gridMargin, containerPadding) 파싱
  const layoutMeta = (() => {
    try {
      const raw = JSON.parse(layout.layoutJson ?? '{}') as {
        version?: number;
        layoutMode?: string;
        gridMargin?: [number, number];
        containerPadding?: [number, number];
      };
      if (raw?.version === 2) {
        return {
          layoutMode: raw.layoutMode ?? 'free',
          gridMargin: (raw.gridMargin ?? [0, 0]) as [number, number],
          containerPadding: (raw.containerPadding ?? [0, 0]) as [number, number],
        };
      }
    } catch {
      /* ignore */
    }
    return { layoutMode: 'free', gridMargin: [0, 0] as [number, number], containerPadding: [0, 0] as [number, number] };
  })();

  // 그리드 모드일 때 위젯의 실제 렌더 위치를 % 로 계산한다.
  // fromGridItem()은 gridX/GRID_COLS * 100 같은 단순 비율만 저장하므로
  // gridMargin / containerPadding 이 실제 view에서 반영되려면 역산이 필요하다.
  const getGridAdjustedPos = (widget: DroppedWidget): { left: string; top: string; width: string; height: string } | null => {
    if (layoutMeta.layoutMode !== 'grid' || canvasWPx < 50) return null;
    const [padX, padY] = layoutMeta.containerPadding;
    const [mX, mY] = layoutMeta.gridMargin;

    const gx = Math.round((widget.x / 100) * VIEW_GRID_COLS);
    const gy = Math.round((widget.y / 100) * VIEW_GRID_ROWS);
    const gw = Math.max(1, Math.round(((widget.w ?? 13) / 100) * VIEW_GRID_COLS));
    const gh = Math.max(1, Math.round(((widget.h ?? 16) / 100) * VIEW_GRID_ROWS));

    const cellW = (canvasWPx - 2 * padX - mX * (VIEW_GRID_COLS - 1)) / VIEW_GRID_COLS;
    const cellH = (canvasHPx - 2 * padY - mY * (VIEW_GRID_ROWS - 1)) / VIEW_GRID_ROWS;

    return {
      left: `${((padX + gx * (cellW + mX)) / canvasWPx) * 100}%`,
      top: `${((padY + gy * (cellH + mY)) / canvasHPx) * 100}%`,
      width: `${((gw * cellW + (gw - 1) * mX) / canvasWPx) * 100}%`,
      height: `${((gh * cellH + (gh - 1) * mY) / canvasHPx) * 100}%`,
    };
  };

  // 데이터소스관리 탭에 등록된 커스텀 데이터소스(dbQueryId)의 등록 키 ↔ 위젯 redisHashKey 매칭 — 태그
  // 같은 별도 식별자 없이, 섹션이 여러 개면 선택값을 합산(union)해 전역으로 미리 만들어 둔다.
  const { data: dbQueryDefs = [], isLoading: dbQueryDefsLoading } = useGetDbQueryDefList();

  // 섹션 모드 시 모든 섹션의 selection을 합산해 WS 구독에 사용한다.
  const allSelections = sectionSelections ? Object.values(sectionSelections) : [selection];
  const selectedGroupIds = [...new Set(allSelections.flatMap((s) => resolveGroupIdsFromSelection(s, dbQueryDefs)))];
  // 섹션마다 미디어타입이 다를 수 있으므로(A섹션=VOIP, B섹션=SMS 등) 화면 전체 WS 구독은 합집합을 쓴다.
  // 위젯별 표시값 계산은 renderWidget의 effectiveMediaTypes(섹션 단위)를 따로 쓴다.
  const selectedMediaTypes = [...new Set(allSelections.flatMap((s) => resolveMediaTypesFromSelection(s, dbQueryDefs)))];

  const mergedDbQuerySelections = mergeDbQuerySelections(allSelections.map((s) => s.dbQuerySelections));
  const widgets = rawWidgets;

  // 플레이스홀더 데이터소스(예: {nodeId}) + 그룹 목록 데이터소스(IC:GROUP:{mediatype} 등록)의 전체 VALUE 목록.
  // 뷰그룹에서 선택값이 없을 때 폴백으로 쓰인다(노드ID 전체, REASON 그룹 스코프 "선택 없음=전체" 등). 쿼리 결과라 캐시됨.
  const placeholderDefs = dbQueryDefs.filter((d) => !!d.placeholderName);
  const groupListDbQueryId = findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs).get('IC:GROUP:');
  const optionFetchIds = [...new Set([...placeholderDefs.map((d) => d.dbQueryId), ...(groupListDbQueryId !== undefined ? [groupListDbQueryId] : [])])];
  const optionsResults = useGetDbQueryDefOptionsMulti(optionFetchIds);
  const optionValuesById: Record<number, string[]> = Object.fromEntries(
    optionFetchIds.map((id, idx) => [id, extractNameValueItems(optionsResults[idx]?.data ?? []).map((i) => i.id)]),
  );
  const placeholderOptionValues = Object.fromEntries(placeholderDefs.map((d) => [d.dbQueryId, optionValuesById[d.dbQueryId] ?? []]));
  const validGroupIds = groupListDbQueryId !== undefined ? (optionValuesById[groupListDbQueryId] ?? []) : [];

  // 마스터 데이터(데이터소스 정의/옵션) 로딩 중에는 빈 구독 → WS 연결 미룸(로드 순서에 따른 재연결 방지)
  const isMasterLoading = dbQueryDefsLoading || optionsResults.some((r) => r.isLoading);

  // IC:GROUP:REASON 패밀리 — "선택 없음=전체"는 그룹 목록 데이터소스 전체(validGroupIds)로 폴백. 선택값이 있으면 그 그룹만.
  const groupReasonTargetGroupIds = resolveValidEntityIds(selectedGroupIds, validGroupIds);
  const targetIdsByPrefix = buildReasonFamilyTargetIdsByPrefix(dbQueryDefs, mergedDbQuerySelections);
  targetIdsByPrefix['IC:GROUP:'] = groupReasonTargetGroupIds;

  // Redis 값/테이블 위젯 WS 구독 — 위젯이 실제 쓰는 hashKey만 모은다. 큐/그룹/상담사 마스터목록은 이제 데이터소스
  // 경로(buildDataSourceKeySelectionIds)가 선택값을 계산한다(옛 IC 전용 마스터해시 직접구독/직접선택 제거).
  const selectionIdsByHashKey = buildDataSourceKeySelectionIds(dbQueryDefs, mergedDbQuerySelections, placeholderOptionValues, { groupId: groupReasonTargetGroupIds });
  const widgetRedisSubscriptions = collectRedisWsSubscriptions(widgets, selectionIdsByHashKey, targetIdsByPrefix, selectedMediaTypes);
  const { data: allRedisHashKeysForTable = [] } = useGetRedisHashKeys();
  // allowAllGroupsFallback=false — 실행 화면에서 그룹 스코프가 비면(선택 불일치·데이터소스 미등록) 전체
  // 그룹으로 새지 않고 0. 편집 미리보기(TaskCreate)만 전체 폴백을 쓴다.
  const redisTableSubscriptions = collectRedisTableWsSubscriptions(widgets, allRedisHashKeysForTable, targetIdsByPrefix, false, selectionIdsByHashKey);

  const subscriptions: CtiWsSubscription[] = isMasterLoading
    ? []
    : mergeWsSubscriptions([...widgetRedisSubscriptions, ...redisTableSubscriptions, ...collectDbQueryWsSubscriptions(widgets)]);
  const { dataByHashKey, isConnected: wsConnected } = useCtiqWebSocket(subscriptions);

  useEffect(() => {
    if (!layout.fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImgRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = layout.fileName;
  }, [layout.fileName]);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const renderWidget = (widget: DroppedWidget) => {
    // 섹션 모드 시 위젯의 sectionKey에 맞는 selection을 사용. sectionKey가 없으면 합산 selection(전체 공통).
    const effectiveSelection = widget.sectionKey && sectionSelections ? (sectionSelections[widget.sectionKey] ?? sectionSelections['__etc'] ?? selection) : selection;
    const effectiveGroupIds = resolveGroupIdsFromSelection(effectiveSelection, dbQueryDefs);
    const effectiveMediaTypes = resolveMediaTypesFromSelection(effectiveSelection, dbQueryDefs);
    // REASON 패밀리(그룹/스킬 등) 위젯 전용 — 그룹은 "선택 없음=전체(그룹 데이터소스 전체)" 폴백, 그 외 엔티티는
    // 등록 데이터소스 선택값(없으면 0 표시).
    const effectiveTargetGroupIds = resolveValidEntityIds(effectiveGroupIds, validGroupIds);
    const effectiveTargetIdsByPrefix = buildReasonFamilyTargetIdsByPrefix(dbQueryDefs, effectiveSelection.dbQuerySelections);
    effectiveTargetIdsByPrefix['IC:GROUP:'] = effectiveTargetGroupIds;
    // 값 위젯은 이 섹션(effectiveSelection)만의 id로 값 계산(화면 전체 union을 쓰면 여러 섹션 위젯이 같은 합산값을 봄).
    const effectiveSelectionIdsByHashKey = buildDataSourceKeySelectionIds(dbQueryDefs, effectiveSelection.dbQuerySelections, placeholderOptionValues, {
      groupId: effectiveTargetGroupIds,
    });

    if (isAnnouncementWidget(widget)) return <AnnouncementWidget widget={widget} />;
    if (isWebEmbedWidget(widget)) return <WebEmbedWidget widget={widget} />;
    // table-redis/그룹·스킬 이석사유/조인 테이블은 RedisTableWidget 내부에서 표/차트 모두 처리(실데이터 fetch가 거기 있어서)
    if (isRedisTableWidget(widget))
      return (
        <RedisTableWidget
          widget={widget}
          fontScale={fontScale}
          dataByHashKey={dataByHashKey}
          targetIdsByPrefix={effectiveTargetIdsByPrefix}
          // table 위젯의 행 필터는 "실제 구독한 id"와 일치해야 하므로, 값 위젯용 섹션별(effective) 대신
          // 구독 생성과 동일한 화면 전체 selection(selectionIdsByHashKey)을 넘긴다 — 안 그러면 구독은 1개인데
          // 필터 기준엔 그 id가 없어 BE 초과분(빈 큐)을 못 걸러낸다.
          selectionIdsByHashKey={selectionIdsByHashKey}
        />
      );
    return (
      <ViewValueWidget
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

  const hasLiveSelection = subscriptions.length > 0;

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{
            width: `min(100vw, calc(${imgRatio} * 100vh))`,
            height: `min(100vh, calc(100vw / ${imgRatio}))`,
          }}
        >
          {layout.fileName && <img src={layout.fileName} alt={layout.layoutName} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />}
          {widgets.map((widget) => {
            const gridPos = getGridAdjustedPos(widget);
            return (
              <div
                key={widget.id}
                style={{
                  position: 'absolute',
                  left: gridPos ? gridPos.left : `${widget.x}%`,
                  top: gridPos ? gridPos.top : `${widget.y}%`,
                  width: gridPos ? gridPos.width : `${widget.w ?? 13}%`,
                  height: gridPos ? gridPos.height : `${widget.h ?? 16}%`,
                  ...getWidgetVisualStyle(widget.style, fontScale),
                }}
                className={isTransparentBg(widget.style) ? '' : 'shadow-xl backdrop-blur-sm'}
              >
                {renderWidget(widget)}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <button
              onClick={() => navigate('/taskboard/board/task-list')}
              className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            >
              ← 목록
            </button>
            <span className="text-white font-bold text-sm truncate min-w-0">{displayName}</span>
            <span className="text-white/50 text-xs truncate flex-shrink-0 max-w-[200px]">({layout.layoutName})</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasLiveSelection && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${wsConnected ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'}`}>
                {wsConnected ? '● 실시간' : '○ 연결중'}
              </span>
            )}
            <span className="text-white/40 text-xs">{widgets.length}개 위젯</span>
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

      <style>{VALUE_CHANGE_ANIMATION_CSS + `body { cursor: ${showControls ? 'auto' : 'none'} !important; }`}</style>
    </div>
  );
}

// ── TaskView 진입점 ─────────────────────────────────────────────────────────
// 레이아웃(전광판)과 뷰 그룹(표시값)은 서로 매핑되지 않는 독립된 풀이다.
// 단일 모드: URL 경로에 layoutId + displayId  (/task-view/:layoutId/:displayId)
// 섹션 모드: URL 쿼리에 s 파라미터           (/task-view/:layoutId?s=A:1,B:2,C:3)
export default function TaskView() {
  const { layoutId, displayId } = useParams<{ layoutId: string; displayId?: string }>();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('s'); // "A:1,B:2,C:3" 형식
  const navigate = useNavigate();
  const numLayoutId = layoutId ? Number(layoutId) : undefined;
  const numDisplayId = displayId ? Number(displayId) : undefined;

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb([{ title: '전광판 관리' }, { title: '전광판 보기' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: layoutList = [], isLoading: layoutLoading } = useGetTaskboardLayoutList();
  const { data: displayList = [], isLoading: displayLoading } = useGetTaskboardDisplayList();

  // layoutId 없거나 (displayId도 없고 sectionParam도 없으면) 에러
  if (!numLayoutId || (!numDisplayId && !sectionParam)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">전광판 정보가 없습니다.</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (layoutLoading || displayLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">불러오는 중...</div>;
  }

  const layout = layoutList.find((l) => l.layoutId === numLayoutId);

  if (!layout) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">전광판을 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 섹션 모드: ?s=A:1,B:2,C:3 파싱 → 섹션키 별 selection 맵 구성
  if (sectionParam) {
    const pairs = sectionParam.split(',').map((pair) => {
      const [sKey, dIdStr] = pair.split(':');
      const display = displayList.find((d) => d.displayId === Number(dIdStr));
      return { sKey, display };
    });
    const allFound = pairs.every(({ display }) => !!display);
    if (!allFound) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
          <p className="text-lg">일부 뷰 그룹을 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
            목록으로 돌아가기
          </button>
        </div>
      );
    }
    const sectionSelections: SectionSelections = Object.fromEntries(pairs.map(({ sKey, display }) => [sKey, parseSelection(display!.selectionJson)]));
    const primaryDisplay = pairs[0].display!;
    return <SingleLayoutView displayName={layout.layoutName} layout={layout} selection={parseSelection(primaryDisplay.selectionJson)} sectionSelections={sectionSelections} />;
  }

  // 단일 모드 (기존)
  const display = displayList.find((d) => d.displayId === numDisplayId);
  if (!display) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">뷰 그룹을 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return <SingleLayoutView displayName={display.displayName} layout={layout} selection={parseSelection(display.selectionJson)} />;
}
