import { useMemo, useState } from 'react';
import { Button, Checkbox, Drawer, Input, Select, Tag } from 'antd';
import { BarChart2, LineChart, PieChart, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetDataSourceFields, useGetDatasets } from '../../dataset/hooks/useDatasetQueries';
import type { FieldMetaItem } from '../../dataset/types';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useCreatePanel, useUpdatePanel } from '../../report/hooks/useReportQueries';
import type { AggFunc, ColumnFormat, PanelFieldMap, PanelLayout, PanelType, SlotType } from '../../report/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartSubType = 'BAR' | 'LINE' | 'PIE';
type ActiveSlot = SlotType | null;

interface PanelEditorSheetProps {
  reportId: number;
  panelType?: PanelType;
  panelId?: number;
  datasourceKey: string;
  onClose(): void;
  isDraft?: boolean;
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

function getChartSlots(chartType: ChartSubType): SlotDef[] {
  if (chartType === 'PIE') {
    return [
      { slotType: 'SLICE', badge: 'S', title: '슬라이스 (디멘션)', subtitle: '— 카테고리 1개', maxItems: 1, acceptsRole: 'DIM' },
      { slotType: 'VALUE', badge: 'V', title: '값 (측정값)', subtitle: '— 측정값 1개', maxItems: 1, acceptsRole: 'MSR' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFieldMapEntry(field: FieldMetaItem, slotType: SlotType, slotOrder: number): PanelFieldMap {
  const isMsr = field.fieldRole === 'MEASURE' || field.fieldRole === 'CALC';
  return {
    slotType,
    slotOrder,
    fieldName: field.fieldName,
    isCalcField: false,
    aggFunc: isMsr ? 'SUM' : undefined,
    columnFormat: isMsr ? 'Number' : undefined,
  };
}

function addToSlot(field: FieldMetaItem, setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>, slotType: SlotType, maxItems?: number): boolean {
  let added = false;
  setter((prev) => {
    if (prev.some((f) => f.fieldName === field.fieldName)) return prev;
    if (maxItems !== undefined && prev.length >= maxItems) return prev;
    added = true;
    return [...prev, makeFieldMapEntry(field, slotType, prev.length)];
  });
  return added;
}

function removeFromSlot(fieldName: string, setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) {
  setter((prev) => prev.filter((f) => f.fieldName !== fieldName));
}

function updateInSlot<K extends keyof PanelFieldMap>(fieldName: string, key: K, value: PanelFieldMap[K], setter: React.Dispatch<React.SetStateAction<PanelFieldMap[]>>) {
  setter((prev) => prev.map((f) => (f.fieldName === fieldName ? { ...f, [key]: value } : f)));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PanelEditorSheet({ reportId, panelType, panelId, datasourceKey: defaultDatasourceKey, onClose, isDraft }: PanelEditorSheetProps) {
  const { panels, addPanel, updatePanel: storeUpdatePanel } = useReportEditorStore();
  const existingPanel = panelId ? panels.find((p) => p.panelId === panelId) : undefined;
  const isEdit = !!existingPanel;

  const currentPanelType = panelType ?? existingPanel?.panelType ?? 'GRID';
  const isGrid = currentPanelType === 'GRID';

  // ─── Active slot state (which slot receives palette clicks) ───────────────
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);

  // ─── Common state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState(existingPanel?.title ?? '');
  const [layout] = useState<PanelLayout>(existingPanel?.layout ?? { x: 0, y: 0, w: 12, h: 6 });
  const [selectedDatasourceKey, setSelectedDatasourceKey] = useState(defaultDatasourceKey);

  // ─── GRID slot state ───────────────────────────────────────────────────────
  const existingFieldMap = existingPanel?.fieldMap ?? [];
  const [groupByFields, setGroupByFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'ROW'));
  const [valueFields, setValueFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'VALUE'));
  const [sortFields, setSortFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SORT'));
  const [showSumRow, setShowSumRow] = useState(true);

  // ─── CHART slot state ──────────────────────────────────────────────────────
  const [chartSubType, setChartSubType] = useState<ChartSubType>((['BAR', 'LINE', 'PIE'].includes(currentPanelType) ? currentPanelType : 'BAR') as ChartSubType);
  const [xAxisFields, setXAxisFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'X_AXIS'));
  const [yAxisFields, setYAxisFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'Y_AXIS'));
  const [seriesFields, setSeriesFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SERIES'));
  const [sliceFields, setSliceFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'SLICE'));
  const [pieValueFields, setPieValueFields] = useState<PanelFieldMap[]>(existingFieldMap.filter((f) => f.slotType === 'VALUE' && chartSubType === 'PIE'));

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
  const { data: datasets = [], isLoading: datasetsLoading } = useGetDatasets();
  const { data: fields = [], isLoading: fieldsLoading } = useGetDataSourceFields({
    params: { datasourceKey: selectedDatasourceKey },
    queryOptions: { enabled: !!selectedDatasourceKey },
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
    Y_AXIS: { fields: yAxisFields, setter: setYAxisFields },
    SERIES: { fields: seriesFields, setter: setSeriesFields },
    SLICE: { fields: sliceFields, setter: setSliceFields, maxItems: 1 },
  };

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: createPanel, isPending: creating } = useCreatePanel({
    mutationOptions: {
      onSuccess: (panel) => {
        addPanel(panel);
        toast.success('패널이 추가되었습니다.');
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
      ];
    }
    let slotFields: PanelFieldMap[];
    if (chartSubType === 'PIE') {
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
    if (topNEnabled && topNSortField) {
      slotFields.push({
        slotType: 'LIMIT',
        slotOrder: 0,
        fieldName: topNSortField,
        isCalcField: false,
        topN: topNValue,
        sortDirection: topNSortDir,
        otherGrouping: chartSubType === 'PIE' ? otherGroupingEnabled : false,
      });
    }
    return slotFields;
  };

  const buildChartOptions = () => {
    if (isGrid) return undefined;
    return { direction: chartDirection, dataLabel: showDataLabel, legend: showLegend, goalLine: { enabled: goalLineEnabled, value: goalLineValue } };
  };

  const handleSave = () => {
    const fieldMap = buildFieldMap();
    const chartOptions = buildChartOptions();
    const data = { panelType: (isGrid ? 'GRID' : chartSubType) as PanelType, title, layout, fieldMap, chartOptions };
    if (isDraft) {
      addPanel({ panelId: -Date.now(), reportId: 0, ...data });
      toast.success('패널이 추가되었습니다.');
      onClose();
      return;
    }
    if (isEdit && panelId) {
      updatePanelMutation({ reportId, panelId, data });
    } else {
      createPanel({ reportId, data });
    }
  };

  // ─── Palette click → active slot ──────────────────────────────────────────
  const handlePaletteClick = (field: FieldMetaItem) => {
    if (activeSlot) {
      const entry = slotMap[activeSlot];
      if (entry) {
        addToSlot(field, entry.setter, activeSlot, entry.maxItems);
        return;
      }
    }
    // fallback: auto-route by role
    const isMsr = field.fieldRole === 'MEASURE' || field.fieldRole === 'CALC';
    if (isGrid) {
      if (isMsr) addToSlot(field, setValueFields, 'VALUE');
      else addToSlot(field, setGroupByFields, 'ROW');
    } else if (chartSubType === 'PIE') {
      if (!isMsr) addToSlot(field, setSliceFields, 'SLICE', 1);
      else addToSlot(field, setPieValueFields, 'VALUE', 1);
    } else {
      if (!isMsr) addToSlot(field, setXAxisFields, 'X_AXIS', 1);
      else addToSlot(field, setYAxisFields, 'Y_AXIS');
    }
  };

  // ─── Hidden fields toggle ─────────────────────────────────────────────────
  const [showHiddenFields, setShowHiddenFields] = useState(false);

  // ─── Display name lookup ──────────────────────────────────────────────────
  const fieldDisplayMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  // ─── Active slot label (for palette hint) ─────────────────────────────────
  const activeSlotDef = activeSlot ? [...GRID_SLOTS, ...getChartSlots(chartSubType)].find((s) => s.slotType === activeSlot) : null;

  // check if active slot is full
  const activeSlotFull =
    activeSlot && slotMap[activeSlot] ? slotMap[activeSlot].maxItems !== undefined && slotMap[activeSlot].fields.length >= (slotMap[activeSlot].maxItems ?? Infinity) : false;

  // ─── Field palette ─────────────────────────────────────────────────────────
  const renderFieldPalette = () => {
    const allSlotFields = Object.values(slotMap).flatMap((s) => s.fields.map((f) => f.fieldName));
    const hiddenFields = fields.filter((f) => !f.isVisible && f.fieldRole !== 'CALC');

    const renderFieldBtn = (f: FieldMetaItem, isHidden = false) => {
      const alreadyInActiveSlot = activeSlot ? slotMap[activeSlot]?.fields.some((sf) => sf.fieldName === f.fieldName) : false;
      const alreadyMapped = allSlotFields.includes(f.fieldName);
      const isCalc = f.fieldRole === 'CALC';
      const isMsrLike = f.fieldRole === 'MEASURE' || isCalc;

      let cls = '';
      if (isHidden) {
        cls = alreadyInActiveSlot
          ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
          : 'border-dashed border-[var(--color-bt-border)] bg-white text-[var(--color-bt-fg-muted)] hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]';
      } else if (isCalc) {
        cls = alreadyInActiveSlot
          ? 'border-green-600 bg-green-600 text-white'
          : alreadyMapped
            ? 'border-green-200 bg-green-50 text-green-400 opacity-60'
            : activeSlot
              ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white'
              : 'border-green-300 bg-green-50 text-green-700 hover:border-green-500';
      } else if (isMsrLike) {
        cls = alreadyInActiveSlot
          ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
          : alreadyMapped
            ? 'border-[var(--color-bt-primary)]/20 bg-[var(--color-bt-primary-soft)]/30 text-[var(--color-bt-primary)] opacity-60'
            : activeSlot
              ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)] hover:text-white'
              : 'border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)] hover:border-[var(--color-bt-primary)]';
      } else {
        cls = alreadyInActiveSlot
          ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
          : alreadyMapped
            ? 'border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/60 text-[var(--color-bt-fg-muted)] opacity-60'
            : activeSlot
              ? 'border-[var(--color-bt-primary)]/60 bg-white font-semibold text-[var(--color-bt-primary)] hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]'
              : 'border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]';
      }

      return (
        <button
          key={f.fieldName}
          type="button"
          onClick={() => handlePaletteClick(f)}
          title={`${f.displayName}${isHidden ? ' (비활성)' : ''}`}
          disabled={activeSlotFull ? true : undefined}
          className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-xs transition-all ${isMsrLike ? 'font-semibold' : ''} ${cls}`}
        >
          {isCalc && <span className="text-[11px] font-bold italic leading-none">f</span>}
          {f.displayName}
        </button>
      );
    };

    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">데이터셋 필드</span>
          {activeSlotDef ? (
            <span
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${activeSlotFull ? 'bg-[var(--color-bt-danger-soft)] text-[var(--color-bt-danger)]' : 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]'}`}
            >
              {activeSlotFull ? '슬롯 가득 참' : `→ ${activeSlotDef.title}`}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-bt-fg-muted)]">슬롯 선택 후 클릭</span>
          )}
        </div>

        {fieldsLoading ? (
          <div className="rounded border border-[var(--color-bt-border)] p-3 text-center text-xs text-[var(--color-bt-fg-muted)]">필드 로딩 중…</div>
        ) : visibleFields.length === 0 && calcDatasetFields.length === 0 ? (
          <div className="rounded border border-[var(--color-bt-border)] p-3 text-center text-xs text-[var(--color-bt-fg-muted)]">데이터셋을 먼저 선택하세요</div>
        ) : (
          <div className="space-y-1.5 rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-2">
            {dimFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Tag className="!mb-0 font-mono text-[10px]">DIM</Tag>
                {dimFields.map((f) => renderFieldBtn(f))}
              </div>
            )}
            {msrFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Tag color="processing" className="!mb-0 font-mono text-[10px]">
                  MSR
                </Tag>
                {msrFields.map((f) => renderFieldBtn(f))}
              </div>
            )}
            {calcDatasetFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Tag color="success" className="!mb-0 font-mono text-[10px]">
                  CALC
                </Tag>
                {calcDatasetFields.map((f) => renderFieldBtn(f))}
              </div>
            )}
            {hiddenFields.length > 0 && (
              <div className="border-t border-dashed border-[var(--color-bt-border)] pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowHiddenFields((v) => !v)}
                  className="mb-1 flex items-center gap-1 text-[11px] text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-fg)] transition-colors"
                >
                  <span>{showHiddenFields ? '▲' : '▼'}</span>
                  <span>비활성 필드 {hiddenFields.length}개</span>
                </button>
                {showHiddenFields && <div className="flex flex-wrap items-center gap-1">{hiddenFields.map((f) => renderFieldBtn(f, true))}</div>}
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
            <span className="text-xs text-[var(--color-bt-primary)]">↑ 위 팔레트에서 필드를 클릭하세요</span>
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
                  value={f.aggFunc ?? 'SUM'}
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

  // ─── Top N sort candidates ────────────────────────────────────────────────
  const chartSortCandidates = [...(chartSubType === 'PIE' ? pieValueFields : yAxisFields), ...(chartSubType === 'PIE' ? sliceFields : xAxisFields)];

  // ─── Drawer title ──────────────────────────────────────────────────────────
  const drawerTitle = (
    <span className="flex items-center gap-1.5 text-sm">
      패널 편집 —{' '}
      <Tag color="processing" className="!mb-0 font-mono">
        {isGrid ? 'GRID' : chartSubType}
      </Tag>
    </span>
  );

  // ─── Drawer footer ─────────────────────────────────────────────────────────
  const drawerFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" onClick={handleSave} disabled={!title || creating || updating} loading={creating || updating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={drawerTitle} width={440} placement="right" footer={drawerFooter} styles={{ body: { padding: '16px' } }}>
      <div className="flex flex-col gap-4">
        {/* 패널 제목 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">패널 제목 *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="패널 제목 입력" />
        </div>

        {/* 데이터셋 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">데이터셋 *</label>
          <Select
            className="w-full"
            value={selectedDatasourceKey || undefined}
            placeholder="데이터셋 선택"
            loading={datasetsLoading}
            onChange={(val) => {
              setSelectedDatasourceKey(val);
              setGroupByFields([]);
              setValueFields([]);
              setSortFields([]);
              setXAxisFields([]);
              setYAxisFields([]);
              setSeriesFields([]);
              setSliceFields([]);
              setPieValueFields([]);
            }}
            options={datasets.map((d) => ({
              value: d.datasourceKey,
              label: `${d.datasourceName || d.datasourceKey}${d.productCode ? ` (${d.productCode})` : ''}`,
            }))}
            showSearch
            optionFilterProp="label"
          />
          {selectedDatasourceKey && !fieldsLoading && (visibleFields.length > 0 || calcDatasetFields.length > 0) && (
            <p className="text-xs text-[var(--color-bt-fg-muted)]">
              DIM {dimFields.length} · MSR {msrFields.length}
              {calcDatasetFields.length > 0 && <span className="text-green-600"> · CALC {calcDatasetFields.length}</span>}
            </p>
          )}
          <p className="text-xs text-[var(--color-bt-fg-muted)]">패널마다 다른 데이터셋 선택 가능</p>
        </div>

        {/* GRID layout */}
        {isGrid && (
          <>
            {renderFieldPalette()}
            {GRID_SLOTS.map(renderSlot)}
            <div className="flex items-center gap-2 rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
              <span className="text-sm font-semibold">합계 행</span>
              <span className="text-xs text-[var(--color-bt-fg-muted)]">— 하단 고정</span>
              <Checkbox className="ml-auto" checked={showSumRow} onChange={(e) => setShowSumRow(e.target.checked)}>
                표시
              </Checkbox>
            </div>
          </>
        )}

        {/* CHART layout */}
        {!isGrid && (
          <>
            {/* Chart type selector */}
            <div className="rounded border border-[var(--color-bt-border)] bg-white p-2.5">
              <span className="mb-2 block text-xs font-semibold">차트 종류</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'BAR' as ChartSubType, Icon: BarChart2, label: 'BAR' },
                  { type: 'LINE' as ChartSubType, Icon: LineChart, label: 'LINE' },
                  { type: 'PIE' as ChartSubType, Icon: PieChart, label: 'PIE' },
                ].map(({ type, Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setChartSubType(type);
                      setActiveSlot(null);
                    }}
                    className={`flex flex-col items-center gap-1 rounded border py-2 font-mono text-xs font-bold transition-colors ${
                      chartSubType === type
                        ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
                        : 'border-[var(--color-bt-border)] bg-white text-[var(--color-bt-fg-muted)] hover:border-[var(--color-bt-primary)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field palette */}
            {renderFieldPalette()}

            {/* Chart slots */}
            {getChartSlots(chartSubType).map(renderSlot)}

            {/* Top N */}
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
                  {chartSubType === 'PIE' && (
                    <Checkbox checked={otherGroupingEnabled} onChange={(e) => setOtherGroupingEnabled(e.target.checked)}>
                      기타 합산
                    </Checkbox>
                  )}
                </div>
              )}
            </div>

            {/* Chart options */}
            <div className="space-y-3">
              {chartSubType === 'BAR' && (
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
              {chartSubType !== 'PIE' && (
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
      </div>
    </Drawer>
  );
}
