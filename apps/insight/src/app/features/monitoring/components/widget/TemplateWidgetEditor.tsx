import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Checkbox, Input, InputNumber, Segmented, Select, Splitter, Switch, Tag } from 'antd';
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Star, X } from 'lucide-react';
import WidgetBarChart from './WidgetBarChart';
import WidgetGrid from './WidgetGrid';
import WidgetKpiCard from './WidgetKpiCard';
import WidgetLineChart from './WidgetLineChart';
import WidgetPieChart from './WidgetPieChart';
import { KPI_DIRECTION_LABELS, VIZ_ICON, VIZ_LABELS } from '../../constants/monitoringConstants';
import { useGetMonitoringDataset, useGetMonitoringDatasets } from '../../hooks/useDatasetQueries';
import { generateMockRows } from '../../mocks/mockWidgetData';
import type { DatasetDetail, KpiDirection, TemplateWidgetMapping, VizType } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** 좌측 팔레트·슬롯에서 다루는 필드 메타 (데이터셋 필드/계산필드 통합). */
interface FieldInfo {
  fieldName: string;
  classification: 'DIM' | 'MSR';
  displayName: string;
  dataType: string;
  source: 'BASE' | 'CALC' | 'VIRTUAL';
}

export interface TemplateWidgetEditorInitial {
  widgetName?: string;
  /** 구버전(단일 데이터셋) 호환용 — mapping.datasets / viz.datasetId 가 없을 때 폴백. */
  datasetId?: number;
  visualizations?: VizType[];
  defaultViz?: VizType;
  mapping?: TemplateWidgetMapping;
  refreshInterval?: number;
  layoutW?: number;
  layoutH?: number;
}

export interface TemplateWidgetEditorSaveDatas {
  widgetName: string;
  /** BE 엔티티/목록 표시용 대표 데이터셋 (기본 시각화의 데이터셋, 없으면 첫 바인딩). */
  datasetId: number;
  visualizations: VizType[];
  defaultViz: VizType;
  /** datasets(바인딩 목록) + 각 viz.datasetId 를 포함. */
  mapping: TemplateWidgetMapping;
  refreshInterval: number;
  layoutW?: number;
  layoutH?: number;
}

interface TemplateWidgetEditorProps {
  /** 신규 생성 시 초기 데이터셋. (initial.datasetId 가 있으면 그쪽 우선) */
  initialDatasetId?: number;
  /** 편집 모드 prefill. */
  initial?: TemplateWidgetEditorInitial;
  onCancel(): void;
  onSave(datas: TemplateWidgetEditorSaveDatas): void;
  saving?: boolean;
}

const VIZ_ORDER: VizType[] = ['GRID', 'BAR', 'LINE', 'PIE', 'CARD'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 드래그 정렬 가능한 팔레트 행 래퍼 (통계 PanelEditorSheet 와 동일한 dnd-kit 패턴)
function SortableFieldRow({
  id,
  children,
}: {
  id: string;
  children: (p: { setNodeRef: (el: HTMLElement | null) => void; style: React.CSSProperties; handleProps: Record<string, unknown> }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return <>{children({ setNodeRef, style, handleProps: { ...attributes, ...listeners } })}</>;
}

// 편집/구버전 매핑을 1:N 데이터셋 구조로 정규화. fallbackDatasetId = 구버전 단일 데이터셋.
function normalizeMapping(m?: TemplateWidgetMapping, fallbackDatasetId?: number): TemplateWidgetMapping {
  const src = m ?? {};
  const datasets = src.datasets && src.datasets.length > 0 ? [...src.datasets] : fallbackDatasetId != null ? [fallbackDatasetId] : [];
  const fb = (id?: number) => id ?? fallbackDatasetId ?? datasets[0];
  const next: TemplateWidgetMapping = {
    datasets,
    GRID: { datasetId: fb(src.GRID?.datasetId), columns: src.GRID?.columns ?? [], groupBy: src.GRID?.groupBy ?? [] },
  };
  if (src.BAR) next.BAR = { datasetId: fb(src.BAR.datasetId), x: src.BAR.x ?? '', y: src.BAR.y ?? [] };
  if (src.LINE) next.LINE = { datasetId: fb(src.LINE.datasetId), x: src.LINE.x ?? '', y: src.LINE.y ?? [] };
  if (src.PIE) next.PIE = { datasetId: fb(src.PIE.datasetId), dimension: src.PIE.dimension ?? '', measure: src.PIE.measure ?? '', donut: src.PIE.donut };
  if (src.CARD)
    next.CARD = {
      datasetId: fb(src.CARD.datasetId),
      measure: src.CARD.measure ?? '',
      unit: src.CARD.unit,
      kpiDirection: src.CARD.kpiDirection ?? 'NEUTRAL',
      threshold: src.CARD.threshold ?? {},
    };
  return next;
}

// 각 시각화가 직접 고른 datasetId 들의 합집합 — 별도 "바인딩" 단계 없이 자동 도출.
function deriveDatasets(m: TemplateWidgetMapping): number[] {
  return [...new Set([m.GRID?.datasetId, m.BAR?.datasetId, m.LINE?.datasetId, m.PIE?.datasetId, m.CARD?.datasetId].filter((x): x is number => x != null))];
}

// ─── 슬롯 카드 (통계 renderSlot 스타일) ─────────────────────────────────────────

function SlotCard({ badge, title, subtitle, count, children }: { badge: string; title: string; subtitle: string; count?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Tag className="!mb-0 font-mono text-[10px]">{badge}</Tag>
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-[var(--color-bt-fg-muted)]">{subtitle}</span>
        {count !== undefined && <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{count}</span>}
      </div>
      {children}
    </div>
  );
}

function FieldChip({ field, prefix, onRemove, children }: { field: FieldInfo; prefix?: ReactNode; onRemove(): void; children?: ReactNode }) {
  const isCalc = field.source === 'CALC';
  return (
    <div className="flex items-center gap-1.5 rounded border border-[var(--color-bt-border)] bg-white px-2 py-1 text-xs">
      {prefix}
      <span
        className={`shrink-0 rounded px-1 font-mono text-[9px] font-bold ${
          field.classification === 'MSR' ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg-muted)]'
        }`}
      >
        {field.classification}
      </span>
      <span className={`min-w-[4ch] flex-1 truncate font-mono font-semibold ${isCalc ? 'text-[var(--color-bt-success)]' : ''}`} title={field.fieldName}>
        {field.displayName}
      </span>
      {children}
      <button type="button" onClick={onRemove} className="shrink-0 text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-danger)]">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] px-3 py-2.5 text-center text-[11px] text-[var(--color-bt-fg-muted)]">
      {text}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function TemplateWidgetEditor({ initialDatasetId, initial, onCancel, onSave, saving }: TemplateWidgetEditorProps) {
  const [widgetName, setWidgetName] = useState(initial?.widgetName ?? '');
  const [mapping, setMapping] = useState<TemplateWidgetMapping>(() => normalizeMapping(initial?.mapping, initial?.datasetId ?? initialDatasetId));
  const [visualizations, setVisualizations] = useState<VizType[]>(initial?.visualizations?.length ? initial.visualizations : ['GRID']);
  const [defaultViz, setDefaultViz] = useState<VizType>(initial?.defaultViz ?? initial?.visualizations?.[0] ?? 'GRID');
  const [currentEditViz, setCurrentEditVizState] = useState<VizType>(initial?.defaultViz ?? initial?.visualizations?.[0] ?? 'GRID');
  const [refreshInterval, setRefreshInterval] = useState<number>(initial?.refreshInterval ?? 3);
  const [layoutW] = useState<number | undefined>(initial?.layoutW);
  const [layoutH] = useState<number | undefined>(initial?.layoutH);

  const [paletteSearch, setPaletteSearch] = useState('');
  const [fieldOrder, setFieldOrder] = useState<Record<string, string[]>>({});
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Data ──────────────────────────────────────────────────────────────────
  const { data: datasets = [], isLoading: datasetsLoading } = useGetMonitoringDatasets();

  // 현재 편집 중 시각화의 데이터셋 detail (팔레트·슬롯·미리보기 공용)
  const currentVizDatasetId = mapping[currentEditViz]?.datasetId;
  const { data: detail } = useGetMonitoringDataset({
    params: { datasetId: currentVizDatasetId ?? 0 },
    queryOptions: { enabled: !!currentVizDatasetId, retry: false },
  });

  // ─── Field meta (현재 viz 데이터셋 기준) ──────────────────────────────────────
  const baseDims = useMemo(() => (detail?.fields ?? []).filter((f) => f.isVisible && f.classification === 'DIM'), [detail]);
  const baseMsrs = useMemo(() => (detail?.fields ?? []).filter((f) => f.isVisible && f.classification === 'MSR'), [detail]);
  const calcFields = useMemo(() => (detail?.calcFields ?? []).filter((c) => c.isVisible !== false), [detail]);

  const lookup = useMemo(() => {
    const map = new Map<string, FieldInfo>();
    for (const f of detail?.fields ?? []) {
      map.set(f.fieldName, {
        fieldName: f.fieldName,
        classification: f.classification,
        displayName: f.displayName,
        dataType: f.dataType,
        source: f.isVirtual ? 'VIRTUAL' : 'BASE',
      });
    }
    for (const c of detail?.calcFields ?? []) {
      map.set(c.fieldName, { fieldName: c.fieldName, classification: c.classification, displayName: c.displayName, dataType: c.dataType, source: 'CALC' });
    }
    return map;
  }, [detail]);

  const dimInfos = useMemo<FieldInfo[]>(
    () => [...baseDims, ...calcFields.filter((c) => c.classification === 'DIM')].map((f) => lookup.get(f.fieldName)).filter((f): f is FieldInfo => !!f),
    [baseDims, calcFields, lookup],
  );
  const msrInfos = useMemo<FieldInfo[]>(
    () => [...baseMsrs, ...calcFields.filter((c) => c.classification === 'MSR')].map((f) => lookup.get(f.fieldName)).filter((f): f is FieldInfo => !!f),
    [baseMsrs, calcFields, lookup],
  );

  const gridColumns = mapping.GRID?.columns ?? [];
  const gridGroupBy = mapping.GRID?.groupBy ?? [];

  // ─── Palette ordering (GRID 노출 컬럼 정렬용) ─────────────────────────────────
  const GROUP_RANK: Record<string, number> = { DIM: 0, MSR: 1, CALC: 2 };
  const groupOf = (name: string): 'DIM' | 'MSR' | 'CALC' => {
    if (calcFields.some((c) => c.fieldName === name)) return 'CALC';
    return baseMsrs.some((f) => f.fieldName === name) ? 'MSR' : 'DIM';
  };
  const orderedNames = (group: 'DIM' | 'MSR' | 'CALC'): string[] => {
    const base = group === 'DIM' ? baseDims.map((f) => f.fieldName) : group === 'MSR' ? baseMsrs.map((f) => f.fieldName) : calcFields.map((f) => f.fieldName);
    const ord = fieldOrder[group];
    if (!ord) return base;
    return [...base].sort((a, b) => {
      const ia = ord.indexOf(a);
      const ib = ord.indexOf(b);
      return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    });
  };
  const paletteIndexOf = (name: string): number => {
    const g = groupOf(name);
    const i = orderedNames(g).indexOf(name);
    return GROUP_RANK[g] * 1000 + (i < 0 ? 999 : i);
  };

  // ─── per-viz dataset 지정 (각 시각화가 자기 데이터셋을 직접 선택; 변경 시 그 viz 필드 초기화) ──
  // datasets(합집합)는 viz 선택이 바뀔 때마다 자동 재계산 — 별도 바인딩 단계 없음.
  const setVizDataset = (v: VizType, id: number) =>
    setMapping((m) => {
      let next: TemplateWidgetMapping;
      switch (v) {
        case 'GRID':
          next = { ...m, GRID: { datasetId: id, columns: [], groupBy: [] } };
          break;
        case 'BAR':
          next = { ...m, BAR: { datasetId: id, x: '', y: [] } };
          break;
        case 'LINE':
          next = { ...m, LINE: { datasetId: id, x: '', y: [] } };
          break;
        case 'PIE':
          next = { ...m, PIE: { datasetId: id, dimension: '', measure: '', donut: false } };
          break;
        case 'CARD':
          next = { ...m, CARD: { datasetId: id, measure: '', unit: '', kpiDirection: 'NEUTRAL', threshold: {} } };
          break;
        default:
          return m;
      }
      return { ...next, datasets: deriveDatasets(next) };
    });

  // viz 진입/활성화 시 엔트리 보장 (없으면 기존 viz 가 쓰던 데이터셋을 기본값으로 생성)
  const ensureViz = (v: VizType) =>
    setMapping((m) => {
      if (m[v]) return m;
      const id = deriveDatasets(m)[0];
      switch (v) {
        case 'BAR':
          return { ...m, BAR: { datasetId: id, x: '', y: [] } };
        case 'LINE':
          return { ...m, LINE: { datasetId: id, x: '', y: [] } };
        case 'PIE':
          return { ...m, PIE: { datasetId: id, dimension: '', measure: '', donut: false } };
        case 'CARD':
          return { ...m, CARD: { datasetId: id, measure: '', unit: '', kpiDirection: 'NEUTRAL', threshold: {} } };
        default:
          return m;
      }
    });

  const selectEditViz = (v: VizType) => {
    ensureViz(v);
    setCurrentEditVizState(v);
  };

  // 현재 viz 의 필드 매핑만 초기화 (데이터셋 유지)
  const clearVizFields = () =>
    setMapping((m) => {
      const id = m[currentEditViz]?.datasetId;
      switch (currentEditViz) {
        case 'GRID':
          return { ...m, GRID: { datasetId: id, columns: [], groupBy: [] } };
        case 'BAR':
          return { ...m, BAR: { datasetId: id, x: '', y: [] } };
        case 'LINE':
          return { ...m, LINE: { datasetId: id, x: '', y: [] } };
        case 'PIE':
          return { ...m, PIE: { datasetId: id, dimension: '', measure: '', donut: false } };
        case 'CARD':
          return { ...m, CARD: { datasetId: id, measure: '', unit: '', kpiDirection: 'NEUTRAL', threshold: {} } };
        default:
          return m;
      }
    });

  const selectAllGridColumns = () =>
    setMapping((m) => ({
      ...m,
      GRID: { datasetId: m.GRID?.datasetId, columns: [...baseDims, ...baseMsrs, ...calcFields].map((f) => f.fieldName), groupBy: m.GRID?.groupBy },
    }));

  // ─── 팔레트 체크 토글 (현재 viz 기준) ─────────────────────────────────────────
  const usedFieldsForCurrent = (): Set<string> => {
    switch (currentEditViz) {
      case 'GRID':
        return new Set(gridColumns);
      case 'BAR':
      case 'LINE': {
        const c = mapping[currentEditViz];
        return new Set([c?.x, ...(c?.y ?? [])].filter((x): x is string => !!x));
      }
      case 'PIE': {
        const c = mapping.PIE;
        return new Set([c?.dimension, c?.measure].filter((x): x is string => !!x));
      }
      case 'CARD':
        return new Set([mapping.CARD?.measure].filter((x): x is string => !!x));
      default:
        return new Set();
    }
  };

  const toggleField = (f: FieldInfo) => {
    if (currentEditViz === 'GRID') {
      setMapping((m) => {
        const cols = m.GRID?.columns ?? [];
        if (cols.includes(f.fieldName)) {
          return {
            ...m,
            GRID: { datasetId: m.GRID?.datasetId, columns: cols.filter((c) => c !== f.fieldName), groupBy: (m.GRID?.groupBy ?? []).filter((c) => c !== f.fieldName) },
          };
        }
        const next = [...cols, f.fieldName].sort((a, b) => paletteIndexOf(a) - paletteIndexOf(b));
        return { ...m, GRID: { datasetId: m.GRID?.datasetId, columns: next, groupBy: m.GRID?.groupBy } };
      });
      return;
    }
    if (currentEditViz === 'BAR' || currentEditViz === 'LINE') {
      const kind = currentEditViz;
      setMapping((m) => {
        const e = m[kind] ?? { datasetId: currentVizDatasetId, x: '', y: [] };
        if (f.classification === 'DIM') return { ...m, [kind]: { ...e, x: e.x === f.fieldName ? '' : f.fieldName } };
        const y = e.y.includes(f.fieldName) ? e.y.filter((c) => c !== f.fieldName) : [...e.y, f.fieldName];
        return { ...m, [kind]: { ...e, y } };
      });
      return;
    }
    if (currentEditViz === 'PIE') {
      setMapping((m) => {
        const e = m.PIE ?? { datasetId: currentVizDatasetId, dimension: '', measure: '', donut: false };
        if (f.classification === 'DIM') return { ...m, PIE: { ...e, dimension: e.dimension === f.fieldName ? '' : f.fieldName } };
        return { ...m, PIE: { ...e, measure: e.measure === f.fieldName ? '' : f.fieldName } };
      });
      return;
    }
    if (currentEditViz === 'CARD') {
      if (f.classification !== 'MSR') return;
      setMapping((m) => {
        const e = m.CARD ?? { datasetId: currentVizDatasetId, measure: '', unit: '', kpiDirection: 'NEUTRAL' as KpiDirection, threshold: {} };
        return { ...m, CARD: { ...e, measure: e.measure === f.fieldName ? '' : f.fieldName } };
      });
    }
  };

  // ─── 팔레트 드래그 정렬 → fieldOrder + (GRID 편집 시) columns 순서 동기화 ────────
  const handleGroupDragEnd = (groupKey: 'DIM' | 'MSR' | 'CALC', displayedIds: string[]) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = displayedIds.indexOf(active.id as string);
    const newI = displayedIds.indexOf(over.id as string);
    if (oldI < 0 || newI < 0) return;
    const newIds = arrayMove(displayedIds, oldI, newI);
    setFieldOrder((o) => ({ ...o, [groupKey]: newIds }));
    if (currentEditViz !== 'GRID') return;
    setMapping((m) => {
      const cols = m.GRID?.columns ?? [];
      const rankFor = (name: string): number => {
        const g = groupOf(name);
        const order = g === groupKey ? newIds : orderedNames(g);
        const i = order.indexOf(name);
        return GROUP_RANK[g] * 1000 + (i < 0 ? 999 : i);
      };
      return { ...m, GRID: { datasetId: m.GRID?.datasetId, columns: [...cols].sort((a, b) => rankFor(a) - rankFor(b)), groupBy: m.GRID?.groupBy } };
    });
  };

  // ─── Visualizations ──────────────────────────────────────────────────────────
  const toggleViz = (v: VizType) =>
    setVisualizations((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      ensureViz(v);
      return [...prev, v];
    });

  useEffect(() => {
    if (visualizations.length > 0 && !visualizations.includes(defaultViz)) setDefaultViz(visualizations[0]);
  }, [visualizations, defaultViz]);

  // ─── Live preview ─────────────────────────────────────────────────────────────
  const [jitter, setJitter] = useState(0.5);
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(() => setJitter(Math.random()), refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval]);
  const rows = useMemo(() => generateMockRows(detail, jitter), [detail, jitter]);

  const previewKey = `${currentEditViz}:${currentVizDatasetId ?? ''}:${JSON.stringify(mapping[currentEditViz])}`;

  const renderPreview = (d: DatasetDetail) => {
    switch (currentEditViz) {
      case 'GRID':
        return <WidgetGrid detail={d} columns={mapping.GRID?.columns ?? []} groupBy={mapping.GRID?.groupBy} rows={rows} />;
      case 'BAR':
        return <WidgetBarChart detail={d} x={mapping.BAR?.x ?? ''} y={mapping.BAR?.y ?? []} rows={rows} />;
      case 'LINE':
        return <WidgetLineChart detail={d} x={mapping.LINE?.x ?? ''} y={mapping.LINE?.y ?? []} rows={rows} />;
      case 'PIE':
        return <WidgetPieChart detail={d} dimension={mapping.PIE?.dimension ?? ''} measure={mapping.PIE?.measure ?? ''} donut={mapping.PIE?.donut} rows={rows} />;
      case 'CARD':
        return (
          <WidgetKpiCard
            detail={d}
            measure={mapping.CARD?.measure ?? ''}
            unit={mapping.CARD?.unit}
            kpiDirection={(mapping.CARD?.kpiDirection ?? 'NEUTRAL') as KpiDirection}
            threshold={mapping.CARD?.threshold}
            rows={rows}
          />
        );
      default:
        return null;
    }
  };

  // ─── Save 가드 ────────────────────────────────────────────────────────────────
  const vizValid = (v: VizType): boolean => {
    const e = mapping[v];
    if (!e?.datasetId) return false;
    if (v === 'GRID') return (mapping.GRID?.columns?.length ?? 0) > 0;
    if (v === 'BAR') return !!mapping.BAR?.x && (mapping.BAR?.y?.length ?? 0) > 0;
    if (v === 'LINE') return !!mapping.LINE?.x && (mapping.LINE?.y?.length ?? 0) > 0;
    if (v === 'PIE') return !!mapping.PIE?.dimension && !!mapping.PIE?.measure;
    if (v === 'CARD') return !!mapping.CARD?.measure;
    return false;
  };
  const canSave = widgetName.trim().length > 0 && visualizations.length >= 1 && visualizations.includes(defaultViz) && visualizations.every(vizValid);

  const handleSave = () => {
    if (!canSave) return;
    // 대표 데이터셋: 기본 시각화의 것, 없으면 활성 viz 중 datasetId 가 있는 첫 번째.
    const primaryDatasetId = mapping[defaultViz]?.datasetId ?? visualizations.map((v) => mapping[v]?.datasetId).find((id): id is number => id != null);
    if (primaryDatasetId == null) return;
    const finalMapping: TemplateWidgetMapping = { ...mapping, datasets: deriveDatasets(mapping) };
    onSave({ widgetName: widgetName.trim(), datasetId: primaryDatasetId, visualizations, defaultViz, mapping: finalMapping, refreshInterval, layoutW, layoutH });
  };

  // ─── 좌측 팔레트 ───────────────────────────────────────────────────────────────
  const renderFieldPalette = () => {
    if (!currentVizDatasetId) return <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">이 시각화의 데이터셋을 선택하세요</div>;
    if (!detail) return <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">데이터셋 로딩 중…</div>;
    const used = usedFieldsForCurrent();
    const q = paletteSearch.toLowerCase();
    const matches = (name: string, display: string) => !q || name.toLowerCase().includes(q) || display.toLowerCase().includes(q);

    const fieldRowInner = (f: FieldInfo) => {
      const checked = used.has(f.fieldName);
      const isCalc = f.source === 'CALC';
      const disabled = currentEditViz === 'CARD' && f.classification !== 'MSR';
      let cls = 'border-border bg-card';
      if (isCalc) cls = 'border-green-200 bg-green-50';
      else if (f.classification === 'MSR') cls = 'border-border bg-primary/5';
      if (checked) cls = isCalc ? 'border-green-500 bg-green-50' : 'border-primary bg-primary/10';
      return (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && toggleField(f)}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleField(f);
            }
          }}
          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${cls} ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        >
          <Checkbox checked={checked} disabled={disabled} className="pointer-events-none" />
          {isCalc && <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white">ƒ</span>}
          <span className={`flex-1 truncate font-mono font-medium ${isCalc ? 'text-green-700' : ''}`} title={f.fieldName}>
            {f.displayName}
          </span>
        </div>
      );
    };

    const renderGroup = (groupKey: 'DIM' | 'MSR' | 'CALC', label: string, badge: ReactNode, items: FieldInfo[]) => {
      if (items.length === 0) return null;
      const displayedIds = items.map((f) => f.fieldName);
      return (
        <div>
          <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {badge}
            <span>{label}</span>
            <span className="ml-auto font-mono">{items.length}</span>
          </div>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd(groupKey, displayedIds)}>
            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {items.map((f) => (
                  <SortableFieldRow key={f.fieldName} id={f.fieldName}>
                    {({ setNodeRef, style, handleProps }) => (
                      <div ref={setNodeRef} style={style} className="flex items-center gap-1">
                        <span {...handleProps} className="shrink-0 cursor-grab text-muted-foreground" title="드래그하여 순서 변경">
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1">{fieldRowInner(f)}</div>
                      </div>
                    )}
                  </SortableFieldRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      );
    };

    const dimItems = orderedNames('DIM')
      .map((n) => lookup.get(n))
      .filter((f): f is FieldInfo => !!f && matches(f.fieldName, f.displayName));
    const msrItems = orderedNames('MSR')
      .map((n) => lookup.get(n))
      .filter((f): f is FieldInfo => !!f && matches(f.fieldName, f.displayName));
    const calcItems = orderedNames('CALC')
      .map((n) => lookup.get(n))
      .filter((f): f is FieldInfo => !!f && matches(f.fieldName, f.displayName));

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} allowClear />
          <div className="flex items-center gap-1.5">
            {currentEditViz === 'GRID' && (
              <button
                type="button"
                onClick={selectAllGridColumns}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                전체선택
              </button>
            )}
            <button
              type="button"
              onClick={clearVizFields}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-red-400 hover:text-red-500"
            >
              전체해제
            </button>
            <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {currentEditViz === 'GRID' ? `노출 ${used.size}` : `사용 ${used.size}`}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{currentEditViz === 'GRID' ? '체크=노출(그리드 컬럼) · ⠿ 드래그로 순서 변경' : '체크=이 시각화 슬롯에 추가'}</p>
        </div>

        {renderGroup('DIM', '디멘션', <span className="rounded bg-[var(--color-bt-bg-muted)] px-1 py-0.5 font-mono">DIM</span>, dimItems)}
        {renderGroup('MSR', '측정값', <span className="rounded bg-[var(--color-bt-primary)] px-1 py-0.5 font-mono text-white">MSR</span>, msrItems)}
        {renderGroup(
          'CALC',
          '계산필드',
          <span className="inline-flex h-4 items-center rounded bg-[var(--color-bt-success)] px-1 font-mono text-[9px] font-bold text-white">ƒ</span>,
          calcItems,
        )}
      </div>
    );
  };

  // ─── 우측 위젯 구성 (currentEditViz 기준) ───────────────────────────────────────
  const renderGridConfig = () => {
    const exposedFields = gridColumns.map((c) => lookup.get(c)).filter((f): f is FieldInfo => !!f);
    const moveColumn = (idx: number, dir: -1 | 1) =>
      setMapping((m) => {
        const cols = [...(m.GRID?.columns ?? [])];
        const t = idx + dir;
        if (t < 0 || t >= cols.length) return m;
        [cols[idx], cols[t]] = [cols[t], cols[idx]];
        return { ...m, GRID: { datasetId: m.GRID?.datasetId, columns: cols, groupBy: m.GRID?.groupBy } };
      });
    const removeColumn = (name: string) =>
      setMapping((m) => ({
        ...m,
        GRID: { datasetId: m.GRID?.datasetId, columns: (m.GRID?.columns ?? []).filter((c) => c !== name), groupBy: (m.GRID?.groupBy ?? []).filter((c) => c !== name) },
      }));
    const addGroupBy = (name: string) =>
      setMapping((m) => {
        const g = m.GRID?.groupBy ?? [];
        if (g.includes(name)) return m;
        return { ...m, GRID: { datasetId: m.GRID?.datasetId, columns: m.GRID?.columns ?? [], groupBy: [...g, name] } };
      });
    const removeGroupBy = (name: string) =>
      setMapping((m) => ({ ...m, GRID: { datasetId: m.GRID?.datasetId, columns: m.GRID?.columns ?? [], groupBy: (m.GRID?.groupBy ?? []).filter((c) => c !== name) } }));

    const groupCandidates = exposedFields.filter((f) => f.classification === 'DIM' && !gridGroupBy.includes(f.fieldName));

    return (
      <>
        <SlotCard badge="C" title="컬럼" subtitle="— 표시 순서 (노출 필드)" count={`${gridColumns.length}개`}>
          {gridColumns.length === 0 ? (
            <EmptyHint text="좌측 팔레트에서 필드를 체크하여 노출하세요" />
          ) : (
            <div className="max-h-[280px] space-y-1 overflow-y-auto">
              {exposedFields.map((f, idx) => (
                <FieldChip
                  key={f.fieldName}
                  field={f}
                  prefix={<span className="w-5 shrink-0 text-center font-mono text-[10px] text-[var(--color-bt-fg-muted)]">{idx + 1}</span>}
                  onRemove={() => removeColumn(f.fieldName)}
                >
                  <span className="ml-auto flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, -1)}
                      disabled={idx === 0}
                      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-bt-bg-muted)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, 1)}
                      disabled={idx === gridColumns.length - 1}
                      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-bt-bg-muted)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </span>
                </FieldChip>
              ))}
            </div>
          )}
        </SlotCard>

        <SlotCard badge="G" title="행 그룹" subtitle="— 트리 그룹화 (DIM)" count={`${gridGroupBy.length}개`}>
          <div className="space-y-1">
            {gridGroupBy.map((name) => {
              const f = lookup.get(name);
              if (!f) return null;
              return <FieldChip key={name} field={f} onRemove={() => removeGroupBy(name)} />;
            })}
            {groupCandidates.length > 0 ? (
              <Select
                size="small"
                placeholder="+ 행 그룹 추가"
                className="w-full"
                value={null}
                onChange={(v: string) => addGroupBy(v)}
                options={groupCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
                popupMatchSelectWidth={false}
              />
            ) : (
              gridGroupBy.length === 0 && <EmptyHint text="노출된 DIM 필드를 행 그룹으로 추가" />
            )}
          </div>
        </SlotCard>
      </>
    );
  };

  const renderAxisConfig = (kind: 'BAR' | 'LINE') => {
    const conf = mapping[kind] ?? { datasetId: currentVizDatasetId, x: '', y: [] };
    const setX = (x: string) => setMapping((m) => ({ ...m, [kind]: { datasetId: m[kind]?.datasetId, x, y: m[kind]?.y ?? [] } }));
    const addY = (name: string) => setMapping((m) => ({ ...m, [kind]: { datasetId: m[kind]?.datasetId, x: m[kind]?.x ?? '', y: [...(m[kind]?.y ?? []), name] } }));
    const removeY = (name: string) =>
      setMapping((m) => ({ ...m, [kind]: { datasetId: m[kind]?.datasetId, x: m[kind]?.x ?? '', y: (m[kind]?.y ?? []).filter((c) => c !== name) } }));

    const xField = conf.x ? lookup.get(conf.x) : undefined;
    const xCandidates = dimInfos.filter((f) => f.fieldName !== conf.x);
    const yCandidates = msrInfos.filter((f) => !conf.y.includes(f.fieldName));

    return (
      <>
        <SlotCard badge="X" title="X축" subtitle="— 카테고리 DIM 1개" count={xField ? '1/1' : '0/1'}>
          {xField ? (
            <FieldChip field={xField} onRemove={() => setX('')} />
          ) : xCandidates.length > 0 ? (
            <Select
              size="small"
              placeholder="+ X축 선택 (DIM)"
              className="w-full"
              value={null}
              onChange={(v: string) => setX(v)}
              options={xCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
              popupMatchSelectWidth={false}
            />
          ) : (
            <EmptyHint text="DIM 필드가 없습니다" />
          )}
        </SlotCard>

        <SlotCard badge="Y" title="Y축" subtitle="— 측정값 MSR 1개+" count={`${conf.y.length}개`}>
          <div className="space-y-1">
            {conf.y.map((name) => {
              const f = lookup.get(name);
              if (!f) return null;
              return <FieldChip key={name} field={f} onRemove={() => removeY(name)} />;
            })}
            {yCandidates.length > 0 ? (
              <Select
                size="small"
                placeholder="+ Y축 추가 (MSR)"
                className="w-full"
                value={null}
                onChange={(v: string) => addY(v)}
                options={yCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
                popupMatchSelectWidth={false}
              />
            ) : (
              conf.y.length === 0 && <EmptyHint text="MSR 필드를 Y축으로 추가" />
            )}
          </div>
        </SlotCard>
      </>
    );
  };

  const renderPieConfig = () => {
    const conf = mapping.PIE ?? { datasetId: currentVizDatasetId, dimension: '', measure: '', donut: false };
    const setDim = (dimension: string) => setMapping((m) => ({ ...m, PIE: { datasetId: m.PIE?.datasetId, dimension, measure: m.PIE?.measure ?? '', donut: m.PIE?.donut } }));
    const setMsr = (measure: string) => setMapping((m) => ({ ...m, PIE: { datasetId: m.PIE?.datasetId, dimension: m.PIE?.dimension ?? '', measure, donut: m.PIE?.donut } }));
    const setDonut = (donut: boolean) =>
      setMapping((m) => ({ ...m, PIE: { datasetId: m.PIE?.datasetId, dimension: m.PIE?.dimension ?? '', measure: m.PIE?.measure ?? '', donut } }));

    const dimField = conf.dimension ? lookup.get(conf.dimension) : undefined;
    const msrField = conf.measure ? lookup.get(conf.measure) : undefined;
    const dimCandidates = dimInfos.filter((f) => f.fieldName !== conf.dimension);
    const msrCandidates = msrInfos.filter((f) => f.fieldName !== conf.measure);

    return (
      <>
        <SlotCard badge="S" title="슬라이스" subtitle="— 분류 DIM 1개" count={dimField ? '1/1' : '0/1'}>
          {dimField ? (
            <FieldChip field={dimField} onRemove={() => setDim('')} />
          ) : dimCandidates.length > 0 ? (
            <Select
              size="small"
              placeholder="+ 슬라이스 선택 (DIM)"
              className="w-full"
              value={null}
              onChange={(v: string) => setDim(v)}
              options={dimCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
              popupMatchSelectWidth={false}
            />
          ) : (
            <EmptyHint text="DIM 필드가 없습니다" />
          )}
        </SlotCard>

        <SlotCard badge="V" title="값" subtitle="— 측정값 MSR 1개" count={msrField ? '1/1' : '0/1'}>
          {msrField ? (
            <FieldChip field={msrField} onRemove={() => setMsr('')} />
          ) : msrCandidates.length > 0 ? (
            <Select
              size="small"
              placeholder="+ 값 선택 (MSR)"
              className="w-full"
              value={null}
              onChange={(v: string) => setMsr(v)}
              options={msrCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
              popupMatchSelectWidth={false}
            />
          ) : (
            <EmptyHint text="MSR 필드가 없습니다" />
          )}
        </SlotCard>

        {conf.dimension && conf.measure && (
          <div className="flex items-center gap-2 rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
            <span className="text-sm font-semibold">도넛형</span>
            <span className="text-xs text-[var(--color-bt-fg-muted)]">— 가운데 합계 표시</span>
            <Switch className="ml-auto" checked={!!conf.donut} onChange={setDonut} />
          </div>
        )}
      </>
    );
  };

  const renderCardConfig = () => {
    const conf = mapping.CARD ?? { datasetId: currentVizDatasetId, measure: '', unit: '', kpiDirection: 'NEUTRAL' as KpiDirection, threshold: {} };
    const patch = (p: Partial<NonNullable<TemplateWidgetMapping['CARD']>>) =>
      setMapping((m) => {
        const cur = m.CARD ?? { datasetId: currentVizDatasetId, measure: '', unit: '', kpiDirection: 'NEUTRAL' as KpiDirection, threshold: {} };
        return { ...m, CARD: { ...cur, ...p } };
      });
    const setMeasure = (measure: string) => patch({ measure });
    const threshold = conf.threshold ?? {};

    const measureField = conf.measure ? lookup.get(conf.measure) : undefined;
    const msrCandidates = msrInfos.filter((f) => f.fieldName !== conf.measure);

    return (
      <>
        <SlotCard badge="M" title="측정값" subtitle="— 현재값 MSR 1개" count={measureField ? '1/1' : '0/1'}>
          {measureField ? (
            <FieldChip field={measureField} onRemove={() => setMeasure('')} />
          ) : msrCandidates.length > 0 ? (
            <Select
              size="small"
              placeholder="+ 측정값 선택 (MSR)"
              className="w-full"
              value={null}
              onChange={(v: string) => setMeasure(v)}
              options={msrCandidates.map((f) => ({ value: f.fieldName, label: f.displayName }))}
              popupMatchSelectWidth={false}
            />
          ) : (
            <EmptyHint text="MSR 필드가 없습니다" />
          )}
        </SlotCard>

        {conf.measure && (
          <SlotCard badge="O" title="카드 옵션" subtitle="— 단위·방향·임계값">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">단위</label>
                  <Input size="small" value={conf.unit ?? ''} onChange={(e) => patch({ unit: e.target.value })} placeholder="예: %, 건, 초" />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">KPI 방향</label>
                  <Select
                    size="small"
                    className="w-full"
                    value={conf.kpiDirection ?? 'NEUTRAL'}
                    onChange={(v) => patch({ kpiDirection: v as KpiDirection })}
                    options={Object.entries(KPI_DIRECTION_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10.5px] text-[var(--color-bt-warn)]">⚠ 경고 임계값</label>
                  <InputNumber
                    size="small"
                    className="w-full"
                    value={threshold.warn}
                    onChange={(v) => patch({ threshold: { ...threshold, warn: v ?? undefined } })}
                    placeholder="예: 90"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] text-[var(--color-bt-danger)]">🚨 장애 임계값</label>
                  <InputNumber
                    size="small"
                    className="w-full"
                    value={threshold.danger}
                    onChange={(v) => patch({ threshold: { ...threshold, danger: v ?? undefined } })}
                    placeholder="예: 85"
                  />
                </div>
              </div>
            </div>
          </SlotCard>
        )}
      </>
    );
  };

  const renderConfig = () => {
    switch (currentEditViz) {
      case 'GRID':
        return renderGridConfig();
      case 'BAR':
        return renderAxisConfig('BAR');
      case 'LINE':
        return renderAxisConfig('LINE');
      case 'PIE':
        return renderPieConfig();
      case 'CARD':
        return renderCardConfig();
      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* 헤더 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-3">
          <Button type="text" icon={<ArrowLeft className="h-4 w-4" />} onClick={onCancel}>
            목록
          </Button>
          <span className="text-[15px] font-bold">템플릿 위젯 편집</span>
          <Tag color="processing" className="!mb-0 font-mono">
            {currentEditViz}
          </Tag>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" onClick={handleSave} disabled={!canSave || saving} loading={saving}>
            위젯 저장
          </Button>
        </div>
      </div>

      {/* 3분할 본문 */}
      <Splitter className="min-h-0 flex-1">
        {/* 좌: 이 시각화의 데이터셋 + 필드 팔레트 */}
        <Splitter.Panel defaultSize={320} min={260} max={560}>
          <aside className="flex h-full flex-col gap-3 overflow-y-auto bg-muted/20 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                이 시각화 데이터셋 <span className="font-mono text-[var(--color-bt-primary)]">{currentEditViz}</span>
              </div>
              <Select
                size="small"
                className="mt-1 w-full"
                value={currentVizDatasetId}
                placeholder="이 시각화의 데이터셋 선택"
                loading={datasetsLoading}
                onChange={(id: number) => setVizDataset(currentEditViz, id)}
                options={datasets.map((d) => ({ value: d.datasetId, label: `${d.datasetName} (${d.datasetCode})` }))}
                showSearch
                optionFilterProp="label"
              />
              {detail && (
                <div className="mt-1 text-xs text-muted-foreground">
                  DIM {baseDims.length} · MSR {baseMsrs.length}
                  {calcFields.length > 0 && <span className="text-green-600"> · CALC {calcFields.length}</span>}
                </div>
              )}
            </div>
            {renderFieldPalette()}
          </aside>
        </Splitter.Panel>

        {/* 중: 위젯명 + 시각화 토글 + 미리보기 */}
        <Splitter.Panel min="30%">
          <div className="flex h-full min-w-0 flex-col bg-muted/10">
            {/* 위젯명 */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-4 py-2.5">
              <label className="shrink-0 text-xs font-medium text-[var(--color-bt-fg)]">
                위젯명 <span className="text-red-500">*</span>
              </label>
              <Input
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="위젯명 입력 (필수)"
                className="max-w-xs"
                status={!widgetName.trim() ? 'error' : undefined}
              />
              {!widgetName.trim() && <span className="shrink-0 text-xs text-red-500">위젯명을 입력하세요</span>}
              <span className="ml-auto text-xs text-muted-foreground">실시간 미리보기 · {refreshInterval}초</span>
            </div>

            {/* 시각화 토글 스트립 */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-white px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">시각화</span>
              {VIZ_ORDER.map((v) => {
                const enabled = visualizations.includes(v);
                const active = currentEditViz === v;
                const isDefault = defaultViz === v;
                const valid = vizValid(v);
                return (
                  <div
                    key={v}
                    onClick={() => selectEditViz(v)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded p-1.5 transition-all ${
                      active
                        ? 'border-2 border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/10'
                        : 'border border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]/50'
                    }`}
                  >
                    <Checkbox checked={enabled} onClick={(e) => e.stopPropagation()} onChange={() => toggleViz(v)} />
                    <span className="font-mono text-[14px]">{VIZ_ICON[v]}</span>
                    <span className={`text-[12px] font-semibold ${active ? 'text-[var(--color-bt-primary)]' : ''}`}>{v}</span>
                    <span className="text-[10px] text-[var(--color-bt-fg-muted)]">{VIZ_LABELS[v]}</span>
                    {enabled && !valid && <span className="text-[10px] text-[var(--color-bt-danger)]">미완성</span>}
                    <button
                      type="button"
                      title={isDefault ? '기본 시각화' : '기본으로 설정'}
                      disabled={!enabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (enabled) setDefaultViz(v);
                      }}
                      className={`ml-0.5 ${isDefault ? 'text-[var(--color-bt-warn)]' : 'text-[var(--color-bt-fg-muted)]'} disabled:opacity-30`}
                    >
                      <Star className="h-3.5 w-3.5" fill={isDefault ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 미리보기 */}
            <div className="flex-1 overflow-auto p-4">
              {!currentVizDatasetId ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">이 시각화의 데이터셋을 선택하세요</div>
              ) : !detail ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">데이터셋 로딩 중…</div>
              ) : (
                <>
                  <div key={previewKey} className="rounded-lg border border-border bg-white p-3" style={{ minHeight: currentEditViz === 'GRID' ? 260 : 420 }}>
                    <div style={{ height: currentEditViz === 'GRID' ? 320 : 420 }}>{renderPreview(detail)}</div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">시각화마다 자기 데이터셋·필드를 따로 구성합니다. 헤더의 ★ 로 기본 시각화를 지정하세요.</p>
                </>
              )}
            </div>
          </div>
        </Splitter.Panel>

        {/* 우: 위젯 구성 (currentEditViz) */}
        <Splitter.Panel defaultSize={420} min={340} max={620}>
          <aside className="flex h-full flex-col bg-muted/20">
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-4 py-2.5">
              <span className="text-sm font-semibold">위젯 구성</span>
              <Tag color="processing" className="!mb-0 font-mono text-[11px]">
                {currentEditViz}
              </Tag>
              <span className="text-xs text-muted-foreground">{VIZ_LABELS[currentEditViz]}</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!currentVizDatasetId ? (
                <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">이 시각화의 데이터셋을 먼저 선택하세요</div>
              ) : (
                <>
                  {renderConfig()}

                  {/* 갱신 간격 */}
                  <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">갱신 간격</div>
                    <Segmented
                      value={refreshInterval}
                      onChange={(v) => setRefreshInterval(Number(v))}
                      options={[
                        { value: 1, label: '1초' },
                        { value: 3, label: '3초' },
                        { value: 5, label: '5초' },
                        { value: 10, label: '10초' },
                      ]}
                      block
                    />
                  </div>
                </>
              )}
            </div>
          </aside>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
