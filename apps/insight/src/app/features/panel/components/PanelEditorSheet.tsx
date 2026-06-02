import { type ReactNode, useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Checkbox, Input, Select, Splitter, Tag } from 'antd';
import { ArrowLeft, GripVertical, X } from 'lucide-react';
import { toast } from '@/shared-util';
import PanelBarChart from './chart/PanelBarChart';
import PanelLineChart from './chart/PanelLineChart';
import PanelPieChart from './chart/PanelPieChart';
import PanelRadarChart from './chart/PanelRadarChart';
import PanelGrid from './grid/PanelGrid';
import PanelKpiCard from './kpi/PanelKpiCard';
import { useGetDataSourceFields, useGetDatasets } from '../../dataset/hooks/useDatasetQueries';
import type { FieldMetaItem } from '../../dataset/types';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useCreatePanel, useUpdatePanel } from '../../report/hooks/useReportQueries';
import type { AggFunc, ColumnFormat, PanelDetail, PanelFieldMap, PanelLayout, PanelType, SlotType } from '../../report/types';
import { useGetSearchConditions } from '../../search-condition/hooks/useSearchConditionQueries';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = 'BAR' | 'LINE' | 'PIE' | 'RADAR' | 'KPI';
type ActiveSlot = SlotType | null;

interface PanelEditorSheetProps {
  reportId: number;
  panelType?: PanelType;
  panelId?: number;
  datasetId: number;
  onClose(): void;
  isDraft?: boolean;
  /** 신규 패널 생성 시 사용할 초기 레이아웃 (빈 영역에서 전달) */
  initialLayout?: PanelLayout;
  /** 신규 패널 생성 완료 콜백 (빈 영역 제거 등) */
  onSaved?(): void;
}

interface SlotDef {
  slotType: SlotType;
  badge: string;
  title: string;
  subtitle: string;
  maxItems?: number;
  acceptsRole?: 'DIM' | 'MSR' | 'BOTH';
}

// ─── Slot definitions per panel type ─────────────────────────────────────────

const GRID_SLOTS: SlotDef[] = [
  { slotType: 'ROW', badge: 'G', title: '그룹화 기준', subtitle: '— GROUP BY 차원', acceptsRole: 'DIM' },
  { slotType: 'VALUE', badge: 'V', title: '표시할 값', subtitle: '— 측정값 + 집계', acceptsRole: 'MSR' },
  { slotType: 'SORT', badge: 'S', title: '정렬', subtitle: '— ORDER BY', acceptsRole: 'BOTH' },
];

function getChartSlots(chartType: ChartType): SlotDef[] {
  if (chartType === 'PIE') {
    return [
      { slotType: 'SLICE', badge: 'S', title: '슬라이스 (디멘션)', subtitle: '— 카테고리 1개', maxItems: 1, acceptsRole: 'DIM' },
      { slotType: 'VALUE', badge: 'V', title: '값 (측정값)', subtitle: '— 측정값 1개', maxItems: 1, acceptsRole: 'MSR' },
    ];
  }
  if (chartType === 'KPI') {
    return [{ slotType: 'Y_AXIS', badge: 'V', title: '지표 값', subtitle: '— 측정값 1개', maxItems: 1, acceptsRole: 'MSR' }];
  }
  if (chartType === 'RADAR') {
    return [
      { slotType: 'X_AXIS', badge: 'A', title: '축 (디멘션)', subtitle: '— 카테고리 1개', maxItems: 1, acceptsRole: 'DIM' },
      { slotType: 'Y_AXIS', badge: 'V', title: '값 (측정값)', subtitle: '— 측정값 1개+', acceptsRole: 'MSR' },
    ];
  }
  return [
    { slotType: 'X_AXIS', badge: 'X', title: 'X축 (카테고리)', subtitle: `— ${chartType === 'LINE' ? 'DATE 권장' : '디멘션 1개'}`, maxItems: 1, acceptsRole: 'DIM' },
    { slotType: 'Y_AXIS', badge: 'Y', title: 'Y축 (값)', subtitle: '— 측정값 1개+', acceptsRole: 'MSR' },
    { slotType: 'SERIES', badge: 'SR', title: '시리즈', subtitle: '— 선택 (그룹 분리)', acceptsRole: 'DIM' },
  ];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGG_OPTIONS = [{ value: '', label: '(없음)' }, ...(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'] as const).map((v) => ({ value: v, label: v }))];

const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number', label: 'Number' },
  { value: 'Decimal', label: 'Decimal' },
  { value: 'Rate', label: 'Rate %' },
  { value: 'Time', label: 'Time' },
  { value: 'String', label: 'String' },
];

const TOP_N_PRESETS = [5, 10, 20, 50];

const FILTER_SLOT_DEF: SlotDef = { slotType: 'FILTER', badge: 'F', title: '검색조건 바인딩', subtitle: '— 글로벌 필터 연결', acceptsRole: 'BOTH' };

const FIELD_COLLAPSE_THRESHOLD = 8;

// 검색조건 입력 타입 → 짧은 라벨 (단일/복수 표시)
const SC_TYPE_LABEL: Record<string, string> = {
  SELECT: '단일 선택',
  MULTI_SELECT: '복수 선택',
  TREE_MULTI_SELECT: '계층 복수',
  RADIO: '라디오',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 드래그 정렬 가능한 팔레트 행 래퍼 (데이터셋 원천뷰와 동일한 dnd-kit 패턴)
function SortableFieldRow({
  id,
  children,
}: {
  id: string;
  children: (p: { setNodeRef: (el: HTMLElement | null) => void; style: React.CSSProperties; isDragging: boolean; handleProps: Record<string, unknown> }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return <>{children({ setNodeRef, style, isDragging, handleProps: { ...attributes, ...listeners } })}</>;
}

function makeFieldMapEntry(field: FieldMetaItem, slotType: SlotType, slotOrder: number): PanelFieldMap {
  const isMsr = field.fieldRole === 'MEASURE' || field.fieldRole === 'CALC';
  return {
    slotType,
    slotOrder,
    fieldName: field.fieldName,
    isCalcField: false,
    aggFunc: undefined,
    columnFormat: isMsr ? 'Number' : undefined,
  };
}

function removeFromSlot(fieldName: string, setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) {
  setter((prev) => prev.filter((f) => f.fieldName !== fieldName));
}

function updateInSlot<K extends keyof PanelFieldMap>(fieldName: string, key: K, value: PanelFieldMap[K], setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) {
  setter((prev) => prev.map((f) => (f.fieldName === fieldName ? { ...f, [key]: value } : f)));
}

// ─── Main component — 풀페이지 3분할 패널 편집 ──────────────────────────────────
// 좌: 데이터셋 필드 팔레트(데이터셋 원천뷰 패턴) / 중: 라이브 미리보기 / 우: 슬롯·검색조건·옵션

export default function PanelEditorSheet({ reportId, panelType, panelId, datasetId: defaultDatasetId, onClose, isDraft, initialLayout, onSaved }: PanelEditorSheetProps) {
  const { panels, addPanel, updatePanel: storeUpdatePanel } = useReportEditorStore();
  const existingPanel = panelId ? panels.find((p) => p.panelId === panelId) : undefined;
  const isEdit = !!existingPanel;

  const currentPanelType = panelType ?? existingPanel?.panelType ?? 'GRID';
  const isGrid = currentPanelType === 'GRID';
  // 차트 종류는 진입 시점에 1회 확정 (모달에서 선택). 편집 화면 내 재선택 없음.
  const chartType: ChartType = (isGrid ? 'BAR' : currentPanelType) as ChartType;

  // ─── Active slot state (which slot receives palette clicks) ───────────────
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);

  // ─── Common state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState(existingPanel?.title ?? '');
  const [paletteSearch, setPaletteSearch] = useState('');
  // 팔레트 표시 순서 (그룹키 → fieldName[]). 드래그로 변경, 우측 슬롯 순서에 반영.
  const [fieldOrder, setFieldOrder] = useState<Record<string, string[]>>({});
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [layout] = useState<PanelLayout>(() => {
    if (existingPanel?.layout) return existingPanel.layout;
    if (initialLayout) return initialLayout;
    if (isGrid) return { x: 0, y: 0, w: 12, h: 6 };
    // Chart: 6W, fill left→right then new row
    if (panels.length === 0) return { x: 0, y: 0, w: 6, h: 6 };
    const maxBottom = Math.max(...panels.map((p) => p.layout.y + p.layout.h));
    const lastRowPanels = panels.filter((p) => p.layout.y + p.layout.h === maxBottom);
    const leftPanel = lastRowPanels.find((p) => p.layout.x === 0 && p.layout.w === 6);
    const rightOccupied = lastRowPanels.some((p) => p.layout.x >= 6);
    if (leftPanel && !rightOccupied) return { x: 6, y: leftPanel.layout.y, w: 6, h: 6 };
    return { x: 0, y: maxBottom, w: 6, h: 6 };
  });
  const [selectedDatasetId, setSelectedDatasetId] = useState(existingPanel?.datasetId ?? defaultDatasetId);

  // ─── GRID slot state ───────────────────────────────────────────────────────
  const existingFieldMap = existingPanel?.fieldMap ?? [];
  const [groupByFields, setGroupByFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'ROW'));
  const [valueFields, setValueFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'VALUE'));
  const [sortFields, setSortFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SORT'));
  const [filterFields, setFilterFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'FILTER'));
  const [showSumRow, setShowSumRow] = useState(() => (existingPanel?.chartOptions as { showSumRow?: boolean } | undefined)?.showSumRow ?? true);

  // ─── CHART slot state ──────────────────────────────────────────────────────
  const [xAxisFields, setXAxisFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'X_AXIS' || f.slotType === 'AXIS'));
  const [yAxisFields, setYAxisFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'Y_AXIS' || (f.slotType === 'VALUE' && chartType === 'KPI')));
  const [seriesFields, setSeriesFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SERIES'));
  const [sliceFields, setSliceFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SLICE'));
  const [pieValueFields, setPieValueFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'VALUE' && chartType === 'PIE'));

  // ─── Chart options state ───────────────────────────────────────────────────
  const [chartDirection, setChartDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [showDataLabel, setShowDataLabel] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [goalLineEnabled, setGoalLineEnabled] = useState(false);
  const [goalLineValue, setGoalLineValue] = useState<number | undefined>();

  // ─── Top N state ──────────────────────────────────────────────────────────
  const limitEntry = existingFieldMap.find((f) => f.slotType === 'LIMIT');
  const [topNEnabled, setTopNEnabled] = useState<boolean>(!!limitEntry);
  const [topNValue, setTopNValue] = useState<number>(limitEntry?.topN ?? 10);
  const [topNSortField, setTopNSortField] = useState<string>(limitEntry?.fieldName ?? '');
  const [topNSortDir, setTopNSortDir] = useState<'ASC' | 'DESC'>(limitEntry?.sortDirection ?? 'DESC');
  const [otherGroupingEnabled, setOtherGroupingEnabled] = useState<boolean>(limitEntry?.otherGrouping ?? false);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const { data: searchConds = [], isLoading: searchCondsLoading } = useGetSearchConditions();
  const { data: datasets = [], isLoading: datasetsLoading } = useGetDatasets();
  const { data: fields = [], isLoading: fieldsLoading } = useGetDataSourceFields({
    params: { datasetId: selectedDatasetId },
    queryOptions: { enabled: !!selectedDatasetId },
  });

  const calcDatasetFields = fields.filter((f) => f.fieldRole === 'CALC');
  const visibleFields = fields.filter((f) => f.isVisible && f.fieldRole !== 'CALC');
  const dimFields = visibleFields.filter((f) => f.fieldRole === 'DIMENSION' || f.fieldRole === 'TIMESTAMP');
  const msrFields = visibleFields.filter((f) => f.fieldRole === 'MEASURE');

  // ─── Slot map: slotType → { fields, setter, maxItems } ───────────────────
  const slotMap: Record<string, { fields: PanelFieldMap[]; setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>; maxItems?: number }> = {
    ROW: { fields: groupByFields, setter: setGroupByFields },
    VALUE: { fields: isGrid ? valueFields : pieValueFields, setter: isGrid ? setValueFields : setPieValueFields, maxItems: isGrid ? undefined : 1 },
    SORT: { fields: sortFields, setter: setSortFields },
    X_AXIS: { fields: xAxisFields, setter: setXAxisFields, maxItems: 1 },
    Y_AXIS: { fields: yAxisFields, setter: setYAxisFields, maxItems: chartType === 'KPI' ? 1 : undefined },
    SERIES: { fields: seriesFields, setter: setSeriesFields },
    SLICE: { fields: sliceFields, setter: setSliceFields, maxItems: 1 },
  };

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: createPanel, isPending: creating } = useCreatePanel({
    mutationOptions: {
      onSuccess: (panel) => {
        addPanel(panel);
        toast.success('패널이 추가되었습니다.');
        onSaved?.();
        onClose();
      },
    },
  });

  const { mutate: updatePanelMutation, isPending: updating } = useUpdatePanel({
    mutationOptions: {
      onSuccess: (panel) => {
        storeUpdatePanel(panel.panelId, panel);
        toast.success('패널이 수정되었습니다.');
        onClose();
      },
    },
  });

  const normalizeField = (f: PanelFieldMap): PanelFieldMap => ({
    ...f,
    aggFunc: f.aggFunc ?? undefined,
  });

  // ─── Build fieldMap ────────────────────────────────────────────────────────
  const buildFieldMap = (): PanelFieldMap[] => {
    if (isGrid) {
      return [
        ...groupByFields.map((f, i) => normalizeField({ ...f, slotType: 'ROW' as SlotType, slotOrder: i })),
        ...valueFields.map((f, i) => normalizeField({ ...f, slotType: 'VALUE' as SlotType, slotOrder: i })),
        ...sortFields.map((f, i) => normalizeField({ ...f, slotType: 'SORT' as SlotType, slotOrder: i })),
        ...filterFields.map((f, i) => normalizeField({ ...f, slotType: 'FILTER' as SlotType, slotOrder: i })),
      ];
    }
    let slotFields: PanelFieldMap[];
    if (chartType === 'PIE') {
      slotFields = [
        ...sliceFields.map((f, i) => normalizeField({ ...f, slotType: 'SLICE' as SlotType, slotOrder: i })),
        ...pieValueFields.map((f, i) => normalizeField({ ...f, slotType: 'VALUE' as SlotType, slotOrder: i })),
      ];
    } else {
      slotFields = [
        ...xAxisFields.map((f, i) => normalizeField({ ...f, slotType: 'X_AXIS' as SlotType, slotOrder: i })),
        ...yAxisFields.map((f, i) => normalizeField({ ...f, slotType: 'Y_AXIS' as SlotType, slotOrder: i })),
        ...seriesFields.map((f, i) => normalizeField({ ...f, slotType: 'SERIES' as SlotType, slotOrder: i })),
      ];
    }
    // 검색조건(FILTER) 바인딩은 그리드 전용 — 차트류 패널은 fieldMap에 포함하지 않음
    if (topNEnabled && topNSortField) {
      slotFields.push({
        slotType: 'LIMIT',
        slotOrder: 0,
        fieldName: topNSortField,
        isCalcField: false,
        topN: topNValue,
        sortDirection: topNSortDir,
        otherGrouping: chartType === 'PIE' ? otherGroupingEnabled : false,
      });
    }
    return slotFields;
  };

  const buildChartOptions = () => {
    if (isGrid) return { showSumRow };
    return { direction: chartDirection, dataLabel: showDataLabel, legend: showLegend, goalLine: { enabled: goalLineEnabled, value: goalLineValue } };
  };

  const handleSave = () => {
    const fieldMap = buildFieldMap();
    const chartOptions = buildChartOptions();
    const data = { panelType: (isGrid ? 'GRID' : chartType) as PanelType, title, datasetId: selectedDatasetId, layout, fieldMap, chartOptions };
    if (isDraft) {
      addPanel({ panelId: -Date.now(), reportId: 0, ...data });
      toast.success('패널이 추가되었습니다.');
      onSaved?.();
      onClose();
      return;
    }
    if (isEdit && panelId) {
      updatePanelMutation({ reportId, panelId, data });
    } else {
      createPanel({ reportId, data });
    }
  };

  // 좌측 팔레트 표시 순서에서의 인덱스 (재선택해도 그 위치로 들어가도록)
  const paletteIndexOf = (fieldName: string): number => {
    const f = fields.find((x) => x.fieldName === fieldName);
    const isMsrLike = f?.fieldRole === 'MEASURE' || f?.fieldRole === 'CALC';
    const groupKey = isMsrLike ? 'MSR' : 'DIM';
    const base = isMsrLike ? [...msrFields, ...calcDatasetFields] : dimFields;
    const order = fieldOrder[groupKey] ?? base.map((x) => x.fieldName);
    const i = order.indexOf(fieldName);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };

  // 슬롯에 추가 — 끝에 붙이지 않고 팔레트 순서대로 삽입
  const insertOrdered = (field: FieldMetaItem, setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>, slotType: SlotType, maxItems?: number) => {
    setter((prev) => {
      if (prev.some((f) => f.fieldName === field.fieldName)) return prev;
      if (maxItems !== undefined && prev.length >= maxItems) return prev;
      const next = [...prev, makeFieldMapEntry(field, slotType, 0)];
      next.sort((a, b) => paletteIndexOf(a.fieldName) - paletteIndexOf(b.fieldName));
      return next.map((f, i) => ({ ...f, slotOrder: i }));
    });
  };

  // ─── Palette click → active slot ──────────────────────────────────────────
  const handlePaletteClick = (field: FieldMetaItem) => {
    if (activeSlot === 'FILTER') {
      if (!filterFields.some((f) => f.fieldName === field.fieldName)) {
        setFilterFields((prev) => [...prev, { slotType: 'FILTER', slotOrder: prev.length, fieldName: field.fieldName, isCalcField: false }]);
      }
      return;
    }
    if (activeSlot) {
      const entry = slotMap[activeSlot];
      if (entry) {
        insertOrdered(field, entry.setter, activeSlot, entry.maxItems);
        return;
      }
    }
    // fallback: auto-route by role
    const isMsr = field.fieldRole === 'MEASURE' || field.fieldRole === 'CALC';
    if (isGrid) {
      if (isMsr) insertOrdered(field, setValueFields, 'VALUE');
      else insertOrdered(field, setGroupByFields, 'ROW');
    } else if (chartType === 'PIE') {
      if (!isMsr) insertOrdered(field, setSliceFields, 'SLICE', 1);
      else insertOrdered(field, setPieValueFields, 'VALUE', 1);
    } else {
      if (!isMsr) insertOrdered(field, setXAxisFields, 'X_AXIS', 1);
      else insertOrdered(field, setYAxisFields, 'Y_AXIS');
    }
  };

  // ─── Select all / Deselect all ───────────────────────────────────────────
  const handleSelectAll = () => {
    if (isGrid) {
      setGroupByFields(dimFields.map((f, i) => makeFieldMapEntry(f, 'ROW', i)));
      setValueFields([...msrFields, ...calcDatasetFields].map((f, i) => makeFieldMapEntry(f, 'VALUE', i)));
    } else if (chartType === 'PIE') {
      setSliceFields(dimFields.slice(0, 1).map((f, i) => makeFieldMapEntry(f, 'SLICE', i)));
      setPieValueFields(msrFields.slice(0, 1).map((f, i) => makeFieldMapEntry(f, 'VALUE', i)));
    } else {
      setXAxisFields(dimFields.slice(0, 1).map((f, i) => makeFieldMapEntry(f, 'X_AXIS', i)));
      setYAxisFields(msrFields.map((f, i) => makeFieldMapEntry(f, 'Y_AXIS', i)));
    }
  };
  const handleDeselectAll = () => {
    setGroupByFields([]);
    setValueFields([]);
    setSortFields([]);
    setXAxisFields([]);
    setYAxisFields([]);
    setSeriesFields([]);
    setSliceFields([]);
    setPieValueFields([]);
    setFilterFields([]);
    setFieldOrder({});
  };

  // 컬럼(값/차원) 슬롯에서만 제거 — 검색조건(FILTER) 바인딩은 보존
  const removeFromColumns = (fieldName: string) => {
    const drop = (prev: PanelFieldMap[]) => prev.filter((f) => f.fieldName !== fieldName);
    setGroupByFields(drop);
    setValueFields(drop);
    setSortFields(drop);
    setXAxisFields(drop);
    setYAxisFields(drop);
    setSeriesFields(drop);
    setSliceFields(drop);
    setPieValueFields(drop);
  };

  // 드래그 정렬 → fieldOrder + 해당 슬롯 순서 동기화
  const handleGroupDragEnd = (groupKey: string, displayedIds: string[], slotSetter?: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = displayedIds.indexOf(active.id as string);
    const newI = displayedIds.indexOf(over.id as string);
    if (oldI < 0 || newI < 0) return;
    const newIds = arrayMove(displayedIds, oldI, newI);
    setFieldOrder((o) => ({ ...o, [groupKey]: newIds }));
    // 우측 슬롯도 같은 순서로 정렬 (매핑된 필드만)
    slotSetter?.((prev) => [...prev].sort((a, b) => newIds.indexOf(a.fieldName) - newIds.indexOf(b.fieldName)).map((f, i) => ({ ...f, slotOrder: i })));
  };

  // 팔레트 표시 순서 적용 (fieldOrder 우선, 없으면 데이터셋 순서)
  const applyOrder = (items: FieldMetaItem[], groupKey: string): FieldMetaItem[] => {
    const ord = fieldOrder[groupKey];
    if (!ord) return items;
    return [...items].sort((a, b) => {
      const ia = ord.indexOf(a.fieldName);
      const ib = ord.indexOf(b.fieldName);
      return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    });
  };

  // ─── Hidden fields toggle ─────────────────────────────────────────────────
  const [showHiddenFields, setShowHiddenFields] = useState(false);

  // ─── Field group expand (더보기) ──────────────────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroupExpand = (group: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  // ─── Display name lookup ──────────────────────────────────────────────────
  const fieldDisplayMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  // ─── Active slot label (for palette hint) ─────────────────────────────────
  const activeSlotDef = activeSlot ? [...GRID_SLOTS, ...getChartSlots(chartType), FILTER_SLOT_DEF].find((s) => s.slotType === activeSlot) : null;

  // check if active slot is full (FILTER has no limit)
  const activeSlotFull =
    activeSlot && activeSlot !== 'FILTER' && slotMap[activeSlot]
      ? slotMap[activeSlot].maxItems !== undefined && slotMap[activeSlot].fields.length >= (slotMap[activeSlot].maxItems ?? Infinity)
      : false;

  // ─── Field palette (데이터셋 원천뷰 패턴 — 체크 선택 + 드래그 정렬) ───────────
  const renderFieldPalette = () => {
    const columnSlotNames = [...groupByFields, ...valueFields, ...xAxisFields, ...yAxisFields, ...seriesFields, ...sliceFields, ...pieValueFields].map((f) => f.fieldName);
    const hiddenFields = fields.filter((f) => !f.isVisible && f.fieldRole !== 'CALC');
    const q = paletteSearch.toLowerCase();
    const matches = (f: FieldMetaItem) => !q || f.fieldName.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q);
    const fDim = applyOrder(dimFields.filter(matches), 'DIM');
    const fMsr = applyOrder([...msrFields, ...calcDatasetFields].filter(matches), 'MSR');
    const hasFields = visibleFields.length > 0 || calcDatasetFields.length > 0;

    // 값 슬롯 setter (그리드=VALUE, 차트=Y_AXIS/PIE VALUE) / 차원 슬롯 setter는 그리드만 정렬 의미 있음
    const valueSetter = isGrid ? setValueFields : chartType === 'PIE' ? setPieValueFields : setYAxisFields;
    const dimSetter = isGrid ? setGroupByFields : undefined;

    const fieldRowInner = (f: FieldMetaItem, isHidden = false) => {
      const isCalc = f.fieldRole === 'CALC';
      const isMsr = f.fieldRole === 'MEASURE';
      // 통일 규칙: 활성 슬롯이 있으면 체크=그 슬롯 소속, 없으면 체크=컬럼(값/차원) 소속.
      const filterMode = activeSlot === 'FILTER';
      const inFilter = filterFields.some((ff) => ff.fieldName === f.fieldName);
      const inColumn = columnSlotNames.includes(f.fieldName);
      const inActiveSlot = activeSlot ? (filterMode ? inFilter : !!slotMap[activeSlot]?.fields.some((sf) => sf.fieldName === f.fieldName)) : false;
      const checked = activeSlot ? inActiveSlot : inColumn;
      const anyMapped = inColumn || inFilter;
      const disabled = !checked && !!activeSlot && !filterMode && activeSlotFull;

      let cls = 'border-border bg-card';
      if (isHidden) cls = 'border-dashed border-border bg-card text-muted-foreground';
      else if (isCalc) cls = 'border-green-200 bg-green-50';
      else if (isMsr) cls = 'border-border bg-primary/5';
      if (anyMapped) cls = isCalc ? 'border-green-500 bg-green-50' : 'border-primary bg-primary/10';

      const toggle = () => {
        if (disabled) return;
        if (activeSlot) {
          if (inActiveSlot) {
            if (filterMode) setFilterFields((prev) => prev.filter((ff) => ff.fieldName !== f.fieldName));
            else removeFromSlot(f.fieldName, slotMap[activeSlot].setter);
          } else {
            handlePaletteClick(f);
          }
        } else if (inColumn) {
          removeFromColumns(f.fieldName);
        } else {
          handlePaletteClick(f);
        }
      };

      return (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${cls} ${disabled ? 'opacity-40' : 'cursor-pointer'}`}
        >
          <Checkbox checked={checked} disabled={disabled} className="pointer-events-none" />
          {isCalc && <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white">ƒ</span>}
          <span className={`flex-1 truncate font-mono font-medium ${isCalc ? 'text-green-700' : ''}`} title={`${f.fieldName}${isHidden ? ' (비활성)' : ''}`}>
            {f.displayName}
          </span>
          {inFilter && !filterMode && (
            <span className="shrink-0 text-[10px] text-[var(--color-bt-primary)]" title="검색조건으로도 사용 중">
              🔎
            </span>
          )}
        </div>
      );
    };

    const renderGroup = (groupKey: string, label: string, badge: ReactNode, items: FieldMetaItem[], slotSetter?: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) => {
      if (items.length === 0) return null;
      const isExpanded = expandedGroups.has(groupKey);
      const collapsed = !isExpanded && items.length > FIELD_COLLAPSE_THRESHOLD;
      const displayed = collapsed ? items.slice(0, FIELD_COLLAPSE_THRESHOLD) : items;
      const displayedIds = displayed.map((f) => f.fieldName);
      const reorderable = !!slotSetter;
      return (
        <div>
          <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {badge}
            <span>{label}</span>
            <span className="ml-auto font-mono">{items.length}</span>
          </div>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleGroupDragEnd(groupKey, displayedIds, slotSetter)}
          >
            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {displayed.map((f) =>
                  reorderable ? (
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
                  ) : (
                    <div key={f.fieldName}>{fieldRowInner(f)}</div>
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
          {(collapsed || (isExpanded && items.length > FIELD_COLLAPSE_THRESHOLD)) && (
            <button
              type="button"
              onClick={() => toggleGroupExpand(groupKey)}
              className="mt-1 w-full rounded-lg border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {collapsed ? `+${items.length - FIELD_COLLAPSE_THRESHOLD}개 더보기` : '접기 ▲'}
            </button>
          )}
        </div>
      );
    };

    if (fieldsLoading) return <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">필드 로딩 중…</div>;
    if (!hasFields) return <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">데이터셋을 먼저 선택하세요</div>;

    return (
      <div className="flex flex-col gap-3">
        {/* 검색 + 전체선택/해제 */}
        <div className="flex flex-col gap-1.5">
          <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              전체선택
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-red-400 hover:text-red-500"
            >
              전체해제
            </button>
            {activeSlotDef && (
              <span
                className={`ml-auto rounded px-1.5 py-0.5 text-[11px] font-semibold ${activeSlotFull ? 'bg-[var(--color-bt-danger-soft)] text-[var(--color-bt-danger)]' : 'bg-primary/10 text-primary'}`}
              >
                {activeSlotFull ? '슬롯 가득 참' : `→ ${activeSlotDef.title}`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">체크=추가 · 해제=제거 · ⠿ 드래그로 순서 변경</p>
        </div>

        {renderGroup('DIM', '디멘션', <span className="rounded bg-[var(--color-bt-bg-muted)] px-1 py-0.5 font-mono">DIM</span>, fDim, dimSetter)}
        {renderGroup('MSR', '측정값', <span className="rounded bg-[var(--color-bt-primary)] px-1 py-0.5 font-mono text-white">MSR</span>, fMsr, valueSetter)}

        {hiddenFields.length > 0 && (
          <div className="border-t border-dashed border-border pt-2">
            <button
              type="button"
              onClick={() => setShowHiddenFields((v) => !v)}
              className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{showHiddenFields ? '▲' : '▼'}</span>
              <span>비활성 필드 {hiddenFields.length}개</span>
            </button>
            {showHiddenFields && (
              <div className="space-y-1">
                {hiddenFields.filter(matches).map((f) => (
                  <div key={f.fieldName}>{fieldRowInner(f, true)}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Slot section renderer ─────────────────────────────────────────────────
  const renderSlot = (slotDef: SlotDef) => {
    const { slotType, badge, title: slotTitle, subtitle, maxItems } = slotDef;
    const entry = slotMap[slotType];
    const slotFields = entry?.fields ?? [];
    const isActive = activeSlot === slotType;
    const isFull = maxItems !== undefined && slotFields.length >= maxItems;

    return (
      <div
        key={slotType}
        onClick={() => setActiveSlot(isActive ? null : slotType)}
        className={`cursor-pointer rounded p-2.5 transition-all ${
          isActive
            ? 'border-2 border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/10'
            : 'border border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]/50'
        }`}
      >
        {/* Slot header */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <Tag color={isActive ? 'processing' : undefined} className="!mb-0 font-mono text-[10px]">
            {badge}
          </Tag>
          <span className={`text-sm font-semibold ${isActive ? 'text-[var(--color-bt-primary)]' : ''}`}>{slotTitle}</span>
          <span className="text-xs text-[var(--color-bt-fg-muted)]">{subtitle}</span>
          <div className="ml-auto flex items-center gap-1">
            {isFull && (
              <Tag color="warning" className="!mb-0 text-[10px]">
                최대
              </Tag>
            )}
            {maxItems && (
              <span className="text-xs text-[var(--color-bt-fg-muted)]">
                {slotFields.length}/{maxItems}
              </span>
            )}
            {!maxItems && slotFields.length > 0 && <Tag className="!mb-0 font-mono text-[10px]">{slotFields.length}</Tag>}
            {isActive && !isFull && <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">선택됨</span>}
          </div>
        </div>

        {/* Slot hint when active and empty */}
        {isActive && !isFull && slotFields.length === 0 && (
          <div className="mb-1.5 flex items-center gap-1 rounded border border-dashed border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)]/20 px-2 py-1">
            <span className="text-xs text-[var(--color-bt-primary)]">← 좌측 팔레트에서 필드를 클릭하세요</span>
          </div>
        )}

        {/* Slot fields */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          {slotFields.map((f) => (
            <div key={f.fieldName} className="flex items-center gap-1.5 rounded border border-[var(--color-bt-border)] bg-white px-2 py-1 text-xs">
              <span className="font-mono font-semibold" title={f.fieldName}>
                {fieldDisplayMap.get(f.fieldName) ?? f.fieldName}
              </span>
              {slotType === 'VALUE' && (
                <>
                  <Select
                    size="small"
                    value={f.aggFunc ?? ''}
                    onChange={(v) => updateInSlot(f.fieldName, 'aggFunc', (v || null) as AggFunc, entry.setter)}
                    options={AGG_OPTIONS}
                    className="ml-auto w-20"
                    popupMatchSelectWidth={false}
                  />
                  <Select
                    size="small"
                    value={f.columnFormat ?? 'Number'}
                    onChange={(v) => updateInSlot(f.fieldName, 'columnFormat', v as ColumnFormat, entry.setter)}
                    options={FORMAT_OPTIONS}
                    className="w-24"
                    popupMatchSelectWidth={false}
                  />
                </>
              )}
              {slotType === 'Y_AXIS' && (
                <Select
                  size="small"
                  value={f.aggFunc ?? ''}
                  onChange={(v) => updateInSlot(f.fieldName, 'aggFunc', v as AggFunc, entry.setter)}
                  options={AGG_OPTIONS}
                  className="ml-auto w-20"
                  popupMatchSelectWidth={false}
                />
              )}
              {slotType === 'SORT' && (
                <Button size="small" className="ml-auto" onClick={() => updateInSlot(f.fieldName, 'sortDirection', f.sortDirection === 'ASC' ? 'DESC' : 'ASC', entry.setter)}>
                  {f.sortDirection === 'ASC' ? '↑ ASC' : '↓ DESC'}
                </Button>
              )}
              <button
                type="button"
                onClick={() => removeFromSlot(f.fieldName, entry.setter)}
                className={`text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-danger)] ${slotType === 'VALUE' || slotType === 'Y_AXIS' || slotType === 'SORT' ? '' : 'ml-auto'}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* SORT: add field picker */}
          {slotType === 'SORT' && [...groupByFields, ...valueFields, ...xAxisFields, ...yAxisFields].length > 0 && (
            <Select
              size="small"
              placeholder="+ 정렬 기준 추가"
              className="w-full"
              value={undefined}
              onChange={(val: string) => {
                const source = [...groupByFields, ...valueFields, ...xAxisFields, ...yAxisFields].find((f) => f.fieldName === val);
                if (source && !sortFields.some((s) => s.fieldName === val)) {
                  setSortFields((prev) => [...prev, { ...source, slotType: 'SORT', slotOrder: prev.length, sortDirection: 'DESC' }]);
                }
              }}
              options={[...groupByFields, ...valueFields, ...xAxisFields, ...yAxisFields]
                .filter((f) => !sortFields.some((s) => s.fieldName === f.fieldName))
                .map((f) => ({ value: f.fieldName, label: f.fieldName }))}
              popupMatchSelectWidth={false}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
    );
  };

  // ─── Filter slot renderer (검색조건 바인딩) ────────────────────────────────
  const renderFilterSlot = () => {
    const isActive = activeSlot === 'FILTER';
    const scOf = (id?: number) => searchConds.find((sc) => sc.searchCondId === id);
    const scTypeLabel = (sc?: (typeof searchConds)[number]) => {
      if (!sc) return '';
      const it = sc.nodes?.[0]?.inputType;
      const base = it ? (SC_TYPE_LABEL[it] ?? it) : '';
      return sc.isBundle ? `${base} · 묶음` : base;
    };
    return (
      <div
        onClick={() => setActiveSlot(isActive ? null : 'FILTER')}
        className={`cursor-pointer rounded p-2.5 transition-all ${
          isActive
            ? 'border-2 border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/10'
            : 'border border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]/50'
        }`}
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <Tag color={isActive ? 'processing' : undefined} className="!mb-0 font-mono text-[10px]">
            F
          </Tag>
          <span className={`text-sm font-semibold ${isActive ? 'text-[var(--color-bt-primary)]' : ''}`}>검색조건 바인딩</span>
          <span className="text-xs text-[var(--color-bt-fg-muted)]">— 글로벌 필터 연결</span>
          <div className="ml-auto flex items-center gap-1">
            {filterFields.length > 0 && <Tag className="!mb-0 font-mono text-[10px]">{filterFields.length}</Tag>}
            {isActive && <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">선택됨</span>}
          </div>
        </div>

        {isActive && filterFields.length === 0 && (
          <div className="mb-1.5 flex items-center gap-1 rounded border border-dashed border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)]/20 px-2 py-1">
            <span className="text-xs text-[var(--color-bt-primary)]">← 좌측 팔레트에서 필터할 컬럼을 클릭하세요</span>
          </div>
        )}

        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          {filterFields.map((f) => (
            <div key={f.fieldName} className="flex items-center gap-1.5 rounded border border-[var(--color-bt-border)] bg-white px-2 py-1 text-xs">
              <span className="font-mono font-semibold" title={f.fieldName}>
                {fieldDisplayMap.get(f.fieldName) ?? f.fieldName}
              </span>
              <span className="text-[var(--color-bt-fg-muted)]">→</span>
              <Select
                size="small"
                className="flex-1"
                placeholder="검색조건 선택"
                value={f.searchCondId ?? undefined}
                loading={searchCondsLoading}
                onChange={(v: number) => setFilterFields((prev) => prev.map((ff) => (ff.fieldName === f.fieldName ? { ...ff, searchCondId: v } : ff)))}
                options={searchConds.map((sc) => ({ value: sc.searchCondId, label: sc.title }))}
                popupMatchSelectWidth={false}
                showSearch
                optionFilterProp="label"
              />
              {f.searchCondId != null && (
                <Tag color="processing" className="!mb-0 shrink-0 text-[10px]">
                  {scTypeLabel(scOf(f.searchCondId))}
                </Tag>
              )}
              <button
                type="button"
                onClick={() => setFilterFields((prev) => prev.filter((ff) => ff.fieldName !== f.fieldName))}
                className="text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-danger)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Top N sort candidates ────────────────────────────────────────────────
  const chartSortCandidates = [...(chartType === 'PIE' ? pieValueFields : yAxisFields), ...(chartType === 'PIE' ? sliceFields : xAxisFields)];

  // ─── Live preview panel (편집 상태로 합성) ─────────────────────────────────
  const previewPanel = {
    panelId: existingPanel?.panelId ?? -1,
    reportId: existingPanel?.reportId ?? reportId,
    datasetId: selectedDatasetId,
    panelType: (isGrid ? 'GRID' : chartType) as PanelType,
    title: title || '미리보기',
    layout,
    chartOptions: buildChartOptions(),
    fieldMap: buildFieldMap(),
  } as PanelDetail;

  // 컬럼 구성이 바뀌면 미리보기를 remount해 동적으로 다시 그림 (컬럼 추가/제거/집계/포맷/정렬)
  const previewKey = `${previewPanel.panelType}:${previewPanel.fieldMap
    .map((f) => `${f.slotType}|${f.fieldName}|${f.aggFunc ?? ''}|${f.columnFormat ?? ''}|${f.sortDirection ?? ''}`)
    .join(',')}`;

  const renderPreview = () => {
    if (!selectedDatasetId) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">데이터셋을 먼저 선택하세요</div>;
    switch (previewPanel.panelType) {
      case 'GRID':
        return <PanelGrid panel={previewPanel} reportId={0} />;
      case 'BAR':
        return <PanelBarChart panel={previewPanel} reportId={0} />;
      case 'LINE':
        return <PanelLineChart panel={previewPanel} reportId={0} />;
      case 'PIE':
        return <PanelPieChart panel={previewPanel} reportId={0} />;
      case 'RADAR':
        return <PanelRadarChart panel={previewPanel} reportId={0} />;
      case 'KPI':
        return <PanelKpiCard panel={previewPanel} reportId={0} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-3">
          <Button type="text" icon={<ArrowLeft className="h-4 w-4" />} onClick={onClose}>
            캔버스
          </Button>
          <span className="text-[15px] font-bold">패널 편집</span>
          <Tag color="processing" className="!mb-0 font-mono">
            {isGrid ? 'GRID' : chartType}
          </Tag>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSave} disabled={!title || creating || updating} loading={creating || updating}>
            이 패널 저장
          </Button>
        </div>
      </div>

      {/* 3분할 본문 — 가운데 바를 드래그하여 좌/우 폭 조절 (AntD Splitter) */}
      <Splitter className="min-h-0 flex-1">
        {/* 좌: 데이터셋 + 필드 팔레트 */}
        <Splitter.Panel defaultSize={300} min={220} max={520}>
          <aside className="flex h-full flex-col gap-3 overflow-y-auto bg-muted/20 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">데이터셋</div>
              <Select
                size="small"
                className="mt-1 w-full"
                value={selectedDatasetId || undefined}
                placeholder="데이터셋 선택"
                loading={datasetsLoading}
                onChange={(val) => {
                  setSelectedDatasetId(val);
                  handleDeselectAll();
                }}
                options={datasets.map((d) => ({
                  value: d.datasetId,
                  label: `${d.datasourceName || d.datasetId}${d.productCode ? ` (${d.productCode})` : ''}`,
                }))}
                showSearch
                optionFilterProp="label"
              />
              {selectedDatasetId && !fieldsLoading && (visibleFields.length > 0 || calcDatasetFields.length > 0) && (
                <div className="mt-1 text-xs text-muted-foreground">
                  DIM {dimFields.length} · MSR {msrFields.length}
                  {calcDatasetFields.length > 0 && <span className="text-green-600"> · CALC {calcDatasetFields.length}</span>}
                </div>
              )}
            </div>
            {renderFieldPalette()}
          </aside>
        </Splitter.Panel>

        {/* 중: 라이브 미리보기 */}
        <Splitter.Panel min="30%">
          <div className="flex h-full min-w-0 flex-col bg-muted/10">
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-4 py-2.5">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="패널 제목 입력" className="max-w-xs" />
              <span className="ml-auto text-xs text-muted-foreground">실시간 미리보기 · 저장 전</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div key={previewKey} className="rounded-lg border border-border bg-white p-3" style={{ minHeight: isGrid ? 260 : 480 }}>
                {renderPreview()}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">좌측 필드·우측 옵션을 바꾸면 즉시 반영됩니다. 저장하면 보고서 캔버스에 패널이 확정됩니다.</p>
            </div>
          </div>
        </Splitter.Panel>

        {/* 우: 슬롯 + 검색조건 + 옵션 */}
        <Splitter.Panel defaultSize={400} min={320} max={600}>
          <aside className="flex h-full flex-col bg-muted/20">
            <div className="shrink-0 border-b border-border bg-white px-4 py-2.5 text-sm font-semibold">패널 구성</div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {isGrid ? (
                <>
                  {GRID_SLOTS.map(renderSlot)}
                  {renderFilterSlot()}
                  <div className="flex items-center gap-2 rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
                    <span className="text-sm font-semibold">합계 행</span>
                    <span className="text-xs text-[var(--color-bt-fg-muted)]">— 하단 고정</span>
                    <Checkbox className="ml-auto" checked={showSumRow} onChange={(e) => setShowSumRow(e.target.checked)}>
                      표시
                    </Checkbox>
                  </div>
                </>
              ) : (
                <>
                  {getChartSlots(chartType).map(renderSlot)}

                  {/* Top N — KPI 제외 */}
                  {chartType !== 'KPI' && (
                    <>
                      <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-semibold">Top N</span>
                          <Checkbox className="ml-auto" checked={topNEnabled} onChange={(e) => setTopNEnabled(e.target.checked)}>
                            사용
                          </Checkbox>
                        </div>
                        {topNEnabled && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Select
                                size="small"
                                placeholder="정렬 기준 필드"
                                className="flex-1"
                                value={topNSortField || undefined}
                                onChange={setTopNSortField}
                                options={chartSortCandidates.map((f) => ({ value: f.fieldName, label: f.fieldName }))}
                                popupMatchSelectWidth={false}
                              />
                              <Button size="small" type={topNSortDir === 'DESC' ? 'primary' : 'default'} onClick={() => setTopNSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'))}>
                                {topNSortDir === 'ASC' ? '↑ ASC' : '↓ DESC'}
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {TOP_N_PRESETS.map((n) => (
                                <Button key={n} size="small" type={topNValue === n ? 'primary' : 'default'} onClick={() => setTopNValue(n)}>
                                  {n}
                                </Button>
                              ))}
                              <Input
                                size="small"
                                type="number"
                                min={1}
                                className="w-16"
                                value={topNValue}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v) && v > 0) setTopNValue(v);
                                }}
                              />
                            </div>
                            {chartType === 'PIE' && (
                              <Checkbox checked={otherGroupingEnabled} onChange={(e) => setOtherGroupingEnabled(e.target.checked)}>
                                기타 합산
                              </Checkbox>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Chart options */}
                      <div className="space-y-3">
                        {chartType === 'BAR' && (
                          <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
                            <span className="mb-2 block text-sm font-semibold">방향</span>
                            <div className="flex gap-2">
                              {(['vertical', 'horizontal'] as const).map((d) => (
                                <Button key={d} size="small" type={chartDirection === d ? 'primary' : 'default'} onClick={() => setChartDirection(d)}>
                                  {d === 'vertical' ? '수직' : '수평'}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
                          <span className="text-sm font-semibold">데이터 라벨</span>
                          <Checkbox className="ml-auto" checked={showDataLabel} onChange={(e) => setShowDataLabel(e.target.checked)}>
                            표시
                          </Checkbox>
                        </div>
                        <div className="flex items-center gap-2 rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
                          <span className="text-sm font-semibold">범례</span>
                          <Checkbox className="ml-auto" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)}>
                            표시
                          </Checkbox>
                        </div>
                        {chartType !== 'PIE' && (
                          <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-sm font-semibold">목표선</span>
                              <Checkbox className="ml-auto" checked={goalLineEnabled} onChange={(e) => setGoalLineEnabled(e.target.checked)}>
                                사용
                              </Checkbox>
                            </div>
                            {goalLineEnabled && (
                              <Input
                                size="small"
                                type="number"
                                placeholder="목표값 입력"
                                value={goalLineValue ?? ''}
                                onChange={(e) => setGoalLineValue(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
