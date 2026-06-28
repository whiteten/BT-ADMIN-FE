import { InputNumber, Select, Switch, Tabs } from 'antd';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { Step2FieldOverride } from './Step2DatasetConfig';
import { KPI_DIRECTION_BADGE, KPI_DIRECTION_LABELS, VIZ_ICON, VIZ_LABELS } from '../../constants/monitoringConstants';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import type { DatasetDetail, KpiDirection, TemplateWidgetMapping, VizType } from '../../types';
import FieldPalette, { type PaletteField } from './mapping/FieldPalette';

interface Step3Props {
  datasetId: number;
  fieldOverrides: Record<string, Step2FieldOverride>;
  visualizations: VizType[];
  defaultViz: VizType;
  mapping: TemplateWidgetMapping;
  onChange: (next: TemplateWidgetMapping) => void;
}

export default function Step3FieldMapping({ datasetId, fieldOverrides, visualizations, defaultViz, mapping, onChange }: Step3Props) {
  const { data: detail } = useGetMonitoringDataset({ params: { datasetId }, queryOptions: { enabled: !!datasetId, retry: false } });

  if (!detail) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-[14px] text-[var(--color-bt-fg-muted)]">데이터셋을 먼저 선택해주세요. (이전 단계로 이동)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="px-7 py-3">
        <div className="text-[13px] font-semibold">필드 매핑 — 시각화 슬롯에 필드 배치</div>
        <div className="text-[10.5px] text-[var(--color-bt-fg-muted)] mt-0.5">좌측 팔레트에서 필드 클릭 → 우측 슬롯에 자동 추가. 시각화별로 슬롯 제약이 다릅니다.</div>
      </div>

      {/* 탭 */}
      <Tabs
        defaultActiveKey={defaultViz}
        className="!flex-1 !flex !flex-col px-7 [&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-content-holder]:!flex-1 [&_.ant-tabs-content]:!h-full [&_.ant-tabs-tabpane]:!h-full"
        items={visualizations.map((viz) => ({
          key: viz,
          label: (
            <span className="flex items-center gap-1.5">
              <span className="mono text-[14px]">{VIZ_ICON[viz]}</span>
              <span className="text-[12px] font-semibold">{viz}</span>
              <span className="text-[10px] text-[var(--color-bt-fg-muted)]">· {VIZ_LABELS[viz]}</span>
              {viz === defaultViz && <span className="rounded bg-[var(--color-bt-warn-soft)] px-1 text-[9px] font-bold text-[var(--color-bt-warn)]">★ 기본</span>}
            </span>
          ),
          children: (
            <div className="flex h-full overflow-hidden border border-[var(--color-bt-border)] rounded-b">
              {viz === 'GRID' && <GridMapping detail={detail} fieldOverrides={fieldOverrides} mapping={mapping} onChange={onChange} />}
              {viz === 'BAR' && <BarMapping detail={detail} fieldOverrides={fieldOverrides} mapping={mapping} onChange={onChange} />}
              {viz === 'LINE' && <LineMapping detail={detail} fieldOverrides={fieldOverrides} mapping={mapping} onChange={onChange} />}
              {viz === 'CARD' && <CardMapping detail={detail} fieldOverrides={fieldOverrides} mapping={mapping} onChange={onChange} />}
              {viz === 'PIE' && <PieMapping detail={detail} fieldOverrides={fieldOverrides} mapping={mapping} onChange={onChange} />}
            </div>
          ),
        }))}
      />
    </div>
  );
}

// ─── 공통 ─────────────────────────────────────────────────────────────────

interface MappingPanelProps {
  detail: DatasetDetail;
  fieldOverrides: Record<string, Step2FieldOverride>;
  mapping: TemplateWidgetMapping;
  onChange: (next: TemplateWidgetMapping) => void;
}

/** 필드 lookup — columnName으로 PaletteField 비슷한 정보 반환 */
function lookupField(detail: DatasetDetail, columnName: string): PaletteField | undefined {
  const base = detail.fields.find((f) => f.fieldName === columnName);
  if (base) {
    return {
      fieldName: base.fieldName,
      classification: base.classification,
      source: base.isVirtual ? 'VIRTUAL' : 'BASE',
      dataType: base.dataType,
      displayName: base.displayName,
      parentField: base.parentField,
    };
  }
  const calc = detail.calcFields.find((c) => c.fieldName === columnName);
  if (calc) {
    return {
      fieldName: calc.fieldName,
      classification: calc.classification,
      source: 'CALC',
      dataType: calc.dataType,
      displayName: calc.displayName,
    };
  }
  return undefined;
}

function SlotChip({ field, onRemove }: { field: PaletteField; onRemove: () => void }) {
  const isCalc = field.source === 'CALC';
  return (
    <div
      className={`group flex items-center gap-2 rounded border-2 px-2.5 py-1.5 text-[11.5px] ${isCalc ? 'border-[var(--color-bt-success)]/40 bg-[var(--color-bt-success-soft)]/40' : 'border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)]/40'}`}
    >
      {isCalc && <span className="inline-flex h-4 items-center rounded bg-[var(--color-bt-success)] px-1 mono text-[9px] font-bold text-white">ƒ</span>}
      <span
        className={`shrink-0 rounded px-1 mono text-[9px] font-bold ${
          field.classification === 'MSR' ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg-muted)]'
        }`}
      >
        {field.classification}
      </span>
      <span className={`mono font-semibold truncate ${isCalc ? 'text-[var(--color-bt-success)]' : ''}`}>{field.fieldName}</span>
      <span className="text-[10px] text-[var(--color-bt-fg-muted)] truncate">· {field.displayName}</span>
      <button type="button" onClick={onRemove} className="ml-auto text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-danger)] opacity-0 group-hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EmptySlot({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded border-2 border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] px-3 py-3 text-center">
      <div className="text-[11px] font-semibold text-[var(--color-bt-fg-muted)]">{label}</div>
      <div className="text-[10px] text-[var(--color-bt-fg-muted)] mt-0.5">{hint}</div>
    </div>
  );
}

// ─── GRID 매핑 ────────────────────────────────────────────────────────────

function GridMapping({ detail, fieldOverrides, mapping, onChange }: MappingPanelProps) {
  const columns = mapping.GRID?.columns ?? [];
  const usedFields = new Set(columns);

  const handleAdd = (f: PaletteField) => {
    if (usedFields.has(f.fieldName)) return;
    onChange({ ...mapping, GRID: { columns: [...columns, f.fieldName] } });
  };
  const handleRemove = (col: string) => {
    onChange({ ...mapping, GRID: { columns: columns.filter((c) => c !== col) } });
  };
  const handleMove = (idx: number, dir: -1 | 1) => {
    const next = [...columns];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...mapping, GRID: { columns: next } });
  };

  return (
    <>
      <FieldPalette detail={detail} fieldOverrides={fieldOverrides} usedFields={usedFields} onFieldClick={handleAdd} />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-semibold">컬럼 목록</div>
            <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">표시 순서대로 나열. ↑↓ 버튼으로 순서 변경.</div>
          </div>
          <span className="rounded bg-[var(--color-bt-primary-soft)] px-2 py-0.5 mono text-[10px] font-semibold text-[var(--color-bt-primary)]">{columns.length}개 컬럼</span>
        </div>

        {columns.length === 0 ? (
          <EmptySlot label="컬럼 없음" hint="좌측 팔레트에서 필드 클릭" />
        ) : (
          <div className="space-y-1.5">
            {columns.map((col, idx) => {
              const f = lookupField(detail, col);
              if (!f) return null;
              return (
                <div key={col} className="flex items-center gap-2">
                  <span className="w-6 text-center text-[10px] font-mono text-[var(--color-bt-fg-muted)]">{idx + 1}</span>
                  <div className="flex-1">
                    <SlotChip field={f} onRemove={() => handleRemove(col)} />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bt-bg-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === columns.length - 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bt-bg-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── BAR 매핑 ─────────────────────────────────────────────────────────────

function BarMapping({ detail, fieldOverrides, mapping, onChange }: MappingPanelProps) {
  const x = mapping.BAR?.x;
  const y = mapping.BAR?.y ?? [];
  const usedFields = new Set<string>();
  if (x) usedFields.add(x);
  y.forEach((c) => usedFields.add(c));

  const filterFn = (f: PaletteField) => {
    if (f.classification === 'DIM') {
      if (x) return { available: false, reason: 'X축 이미 사용 중 — 삭제 후 추가' };
      return { available: true };
    }
    if (f.classification === 'MSR') {
      if (y.length >= 2) return { available: false, reason: 'Y축은 최대 2개 (이중축)' };
      return { available: true };
    }
    return { available: false };
  };

  const handleAdd = (f: PaletteField) => {
    if (usedFields.has(f.fieldName)) return;
    if (f.classification === 'DIM') {
      if (x) return;
      onChange({ ...mapping, BAR: { x: f.fieldName, y } });
    } else if (f.classification === 'MSR') {
      if (y.length >= 2) return;
      onChange({ ...mapping, BAR: { x: x ?? '', y: [...y, f.fieldName] } });
    }
  };

  const handleRemoveX = () => onChange({ ...mapping, BAR: { x: '', y } });
  const handleRemoveY = (col: string) => onChange({ ...mapping, BAR: { x: x ?? '', y: y.filter((c) => c !== col) } });

  const xField = x ? lookupField(detail, x) : undefined;

  return (
    <>
      <FieldPalette detail={detail} fieldOverrides={fieldOverrides} filterFn={filterFn} usedFields={usedFields} onFieldClick={handleAdd} />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* X축 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">X축</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">DIM 1개 — 가로축 분류</div>
            </div>
            <span className="rounded bg-[var(--color-bt-bg-muted)] px-2 py-0.5 mono text-[10px] font-semibold">DIM</span>
          </div>
          {xField ? <SlotChip field={xField} onRemove={handleRemoveX} /> : <EmptySlot label="X축 없음" hint="DIM 필드 클릭" />}
        </div>

        {/* Y축 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">Y축 (이중축 가능)</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">MSR 1~2개 — 단위 다르면 좌·우 Y축 자동 분리</div>
            </div>
            <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 mono text-[10px] font-bold text-white">MSR {y.length}/2</span>
          </div>
          {y.length === 0 ? (
            <EmptySlot label="Y축 없음" hint="MSR 필드 클릭 (최대 2개)" />
          ) : (
            <div className="space-y-1.5">
              {y.map((col, idx) => {
                const f = lookupField(detail, col);
                if (!f) return null;
                return (
                  <div key={col} className="flex items-center gap-2">
                    <span className="w-12 text-center text-[10px] font-mono text-[var(--color-bt-fg-muted)]">{idx === 0 ? '좌 Y' : '우 Y'}</span>
                    <div className="flex-1">
                      <SlotChip field={f} onRemove={() => handleRemoveY(col)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── LINE 매핑 ────────────────────────────────────────────────────────────

function LineMapping({ detail, fieldOverrides, mapping, onChange }: MappingPanelProps) {
  const x = mapping.LINE?.x;
  const y = mapping.LINE?.y ?? [];
  const usedFields = new Set<string>();
  if (x) usedFields.add(x);
  y.forEach((c) => usedFields.add(c));

  const filterFn = (f: PaletteField) => {
    // LINE은 X축이 반드시 DATE/DATETIME
    const isDate = f.dataType === 'DATE' || f.dataType === 'DATETIME';
    if (isDate && f.classification === 'DIM') {
      if (x) return { available: false, reason: 'X축 이미 사용 중' };
      return { available: true };
    }
    if (f.classification === 'MSR') {
      return { available: true };
    }
    if (f.classification === 'DIM' && !isDate) {
      return { available: false, reason: 'LINE의 X축은 DATE/DATETIME 필수' };
    }
    return { available: false };
  };

  const handleAdd = (f: PaletteField) => {
    if (usedFields.has(f.fieldName)) return;
    const isDate = f.dataType === 'DATE' || f.dataType === 'DATETIME';
    if (isDate && f.classification === 'DIM' && !x) {
      onChange({ ...mapping, LINE: { x: f.fieldName, y } });
    } else if (f.classification === 'MSR') {
      onChange({ ...mapping, LINE: { x: x ?? '', y: [...y, f.fieldName] } });
    }
  };

  const handleRemoveX = () => onChange({ ...mapping, LINE: { x: '', y } });
  const handleRemoveY = (col: string) => onChange({ ...mapping, LINE: { x: x ?? '', y: y.filter((c) => c !== col) } });

  const xField = x ? lookupField(detail, x) : undefined;

  return (
    <>
      <FieldPalette detail={detail} fieldOverrides={fieldOverrides} filterFn={filterFn} usedFields={usedFields} onFieldClick={handleAdd} />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* X축 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">
                X축 <span className="text-[10px] text-[var(--color-bt-warn)] font-normal">⚠ DATE / DATETIME 필수</span>
              </div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">시계열 X축 (시간)</div>
            </div>
            <span className="rounded bg-[var(--color-bt-warn-soft)] px-2 py-0.5 mono text-[10px] font-bold text-[var(--color-bt-warn)]">시간</span>
          </div>
          {xField ? <SlotChip field={xField} onRemove={handleRemoveX} /> : <EmptySlot label="X축 없음" hint="DATE / DATETIME 필드 클릭" />}
        </div>

        {/* Y축 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">Y축</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">MSR 1~N개 — 여러 선 동시 표시</div>
            </div>
            <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 mono text-[10px] font-bold text-white">MSR {y.length}</span>
          </div>
          {y.length === 0 ? (
            <EmptySlot label="Y축 없음" hint="MSR 필드 클릭" />
          ) : (
            <div className="space-y-1.5">
              {y.map((col) => {
                const f = lookupField(detail, col);
                if (!f) return null;
                return <SlotChip key={col} field={f} onRemove={() => handleRemoveY(col)} />;
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── CARD 매핑 ────────────────────────────────────────────────────────────

function CardMapping({ detail, fieldOverrides, mapping, onChange }: MappingPanelProps) {
  const measure = mapping.CARD?.measure;
  const unit = mapping.CARD?.unit ?? '';
  const kpiDirection: KpiDirection = mapping.CARD?.kpiDirection ?? 'NEUTRAL';
  const threshold = mapping.CARD?.threshold ?? {};

  const usedFields = new Set<string>();
  if (measure) usedFields.add(measure);

  const filterFn = (f: PaletteField) => {
    if (f.classification === 'MSR') {
      if (measure) return { available: false, reason: '측정값은 1개만 — 삭제 후 추가' };
      return { available: true };
    }
    return { available: false, reason: 'CARD는 MSR 또는 ƒ MSR만' };
  };

  const handleAdd = (f: PaletteField) => {
    if (measure) return;
    if (f.classification !== 'MSR') return;
    // 위젯 CARD의 KPI 방향은 위젯에서 직접 선택. 신규 추가 시 NEUTRAL 기본값
    onChange({ ...mapping, CARD: { measure: f.fieldName, unit, kpiDirection: 'NEUTRAL', threshold } });
  };

  const handleRemove = () => onChange({ ...mapping, CARD: { measure: '', unit, kpiDirection, threshold } });

  const measureField = measure ? lookupField(detail, measure) : undefined;
  const isCalc = measure ? detail.calcFields.some((c) => c.fieldName === measure) : false;

  return (
    <>
      <FieldPalette detail={detail} fieldOverrides={fieldOverrides} filterFn={filterFn} usedFields={usedFields} onFieldClick={handleAdd} />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 측정값 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">측정값</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">MSR 1개 (현재값만 표시)</div>
            </div>
            <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 mono text-[10px] font-bold text-white">MSR 1</span>
          </div>
          {measureField ? <SlotChip field={measureField} onRemove={handleRemove} /> : <EmptySlot label="측정값 없음" hint="MSR 또는 ƒ 필드 클릭" />}
        </div>

        {/* 옵션 — 측정값 있을 때만 */}
        {measure && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">단위 (옵션)</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => onChange({ ...mapping, CARD: { measure, unit: e.target.value, kpiDirection, threshold } })}
                  placeholder="예: %, 건, 초"
                  className="w-full rounded border border-[var(--color-bt-border)] bg-white px-2 py-1.5 text-[12px] focus:border-[var(--color-bt-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                  KPI 방향 {isCalc && <span className="text-[9.5px] normal-case tracking-normal text-[var(--color-bt-fg-muted)]">(ƒ 자동)</span>}
                </label>
                <Select
                  value={kpiDirection}
                  disabled={isCalc}
                  onChange={(v) => onChange({ ...mapping, CARD: { measure, unit, kpiDirection: v as KpiDirection, threshold } })}
                  options={Object.entries(KPI_DIRECTION_LABELS).map(([value, label]) => ({ value, label }))}
                  size="middle"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* KPI 뱃지 미리보기 */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-bt-fg-muted)]">KPI 색상 미리보기:</span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${KPI_DIRECTION_BADGE[kpiDirection].className}`}>{KPI_DIRECTION_BADGE[kpiDirection].label}</span>
            </div>

            {/* 임계값 */}
            <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] p-3">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                임계값 (선택)
                <span className="ml-2 normal-case tracking-normal text-[10px] text-[var(--color-bt-fg-muted)]">— 값에 따라 색상 변경</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10.5px] text-[var(--color-bt-warn)]">⚠ 경고 임계값</label>
                  <InputNumber
                    value={threshold.warn}
                    onChange={(v) => onChange({ ...mapping, CARD: { measure, unit, kpiDirection, threshold: { ...threshold, warn: v ?? undefined } } })}
                    placeholder="예: 90"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] text-[var(--color-bt-danger)]">🚨 장애 임계값</label>
                  <InputNumber
                    value={threshold.danger}
                    onChange={(v) => onChange({ ...mapping, CARD: { measure, unit, kpiDirection, threshold: { ...threshold, danger: v ?? undefined } } })}
                    placeholder="예: 85"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-[var(--color-bt-fg-muted)] leading-snug">
                {kpiDirection === 'HIGHER_BETTER' && '값이 임계값 이상이면 정상, 이하면 경고/장애 색상으로 표시됩니다.'}
                {kpiDirection === 'LOWER_BETTER' && '값이 임계값 이하면 정상, 이상이면 경고/장애 색상으로 표시됩니다.'}
                {kpiDirection === 'NEUTRAL' && '중립 — 임계값은 안내용으로만 사용됩니다.'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── PIE(파이/도넛) 매핑 ───────────────────────────────────────────────────

function PieMapping({ detail, fieldOverrides, mapping, onChange }: MappingPanelProps) {
  const dimension = mapping.PIE?.dimension;
  const measure = mapping.PIE?.measure;
  const donut = mapping.PIE?.donut ?? false;

  const usedFields = new Set<string>();
  if (dimension) usedFields.add(dimension);
  if (measure) usedFields.add(measure);

  const filterFn = (f: PaletteField) => {
    if (f.classification === 'DIM') {
      if (dimension) return { available: false, reason: '슬라이스는 1개만 — 삭제 후 추가' };
      return { available: true };
    }
    if (f.classification === 'MSR') {
      if (measure) return { available: false, reason: '값은 1개만 — 삭제 후 추가' };
      return { available: true };
    }
    return { available: false };
  };

  const handleAdd = (f: PaletteField) => {
    if (usedFields.has(f.fieldName)) return;
    if (f.classification === 'DIM') {
      if (dimension) return;
      onChange({ ...mapping, PIE: { dimension: f.fieldName, measure: measure ?? '', donut } });
    } else if (f.classification === 'MSR') {
      if (measure) return;
      onChange({ ...mapping, PIE: { dimension: dimension ?? '', measure: f.fieldName, donut } });
    }
  };

  const handleRemoveDim = () => onChange({ ...mapping, PIE: { dimension: '', measure: measure ?? '', donut } });
  const handleRemoveMsr = () => onChange({ ...mapping, PIE: { dimension: dimension ?? '', measure: '', donut } });

  const dimField = dimension ? lookupField(detail, dimension) : undefined;
  const measureField = measure ? lookupField(detail, measure) : undefined;

  return (
    <>
      <FieldPalette detail={detail} fieldOverrides={fieldOverrides} filterFn={filterFn} usedFields={usedFields} onFieldClick={handleAdd} />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 슬라이스 (분류) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">슬라이스 (분류)</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">DIM 1개 — 비중을 나눌 카테고리</div>
            </div>
            <span className="rounded bg-[var(--color-bt-bg-muted)] px-2 py-0.5 mono text-[10px] font-semibold">DIM</span>
          </div>
          {dimField ? <SlotChip field={dimField} onRemove={handleRemoveDim} /> : <EmptySlot label="슬라이스 없음" hint="DIM 필드 클릭" />}
        </div>

        {/* 값 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold">값</div>
              <div className="text-[10.5px] text-[var(--color-bt-fg-muted)]">MSR 1개 — 슬라이스 크기</div>
            </div>
            <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 mono text-[10px] font-bold text-white">MSR 1</span>
          </div>
          {measureField ? <SlotChip field={measureField} onRemove={handleRemoveMsr} /> : <EmptySlot label="값 없음" hint="MSR 또는 ƒ 필드 클릭" />}
        </div>

        {/* 도넛 옵션 — 매핑 완료 시 노출 */}
        {dimension && measure && (
          <div className="flex items-center justify-between rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] px-3 py-2.5">
            <div>
              <div className="text-[11.5px] font-semibold">도넛형</div>
              <div className="text-[10px] text-[var(--color-bt-fg-muted)]">가운데를 비우고 합계를 표시합니다.</div>
            </div>
            <Switch checked={donut} onChange={(v) => onChange({ ...mapping, PIE: { dimension, measure, donut: v } })} />
          </div>
        )}
      </div>
    </>
  );
}
