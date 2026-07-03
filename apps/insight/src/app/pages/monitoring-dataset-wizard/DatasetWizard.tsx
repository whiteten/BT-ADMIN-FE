import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { sql } from '@codemirror/lang-sql';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import type { CellStyle, ColDef, ICellRendererParams, IHeaderParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, Col, Divider, Form, type FormInstance, type FormProps, Input, Row, Select, Steps, Tag, Tooltip } from 'antd';
import { AlertTriangle, CheckCircle2, Edit2, Info, Play, Plus, Trash2, Wand2 } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SourceValidationResultModal, { type SourceValidationResultModalRef } from './SourceValidationResultModal';
import TagInput from '../../components/TagInput';
import type { RedisKeySchema } from '../../features/monitoring/api/redisTreeApi';
import CalcFieldEditor from '../../features/monitoring/components/calcfield/CalcFieldEditor';
import FieldSchemaList, { type FieldSchemaColumn } from '../../features/monitoring/components/dataset/FieldSchemaList';
import RedisTreeExplorer from '../../features/monitoring/components/dataset/RedisTreeExplorer';
import LookupEditDrawer, { type LookupEditDrawerRef } from '../../features/monitoring/components/lookup/LookupEditDrawer';
import { COLUMN_FORMAT_OPTIONS } from '../../features/monitoring/constants/monitoringConstants';
import {
  monitoringDatasetKeys,
  useCreateMonitoringDataset,
  useGetMonitoringDataset,
  useUpdateMonitoringDataset,
  useValidateMonitoringDataset,
  useValidateMonitoringDatasetSource,
} from '../../features/monitoring/hooks/useDatasetQueries';
import type {
  CalcField,
  ColumnFormat,
  DatasetBaseType,
  DatasetCreateDatas,
  DatasetField,
  DatasetFieldSource,
  DatasetLookup,
  DatasetValueMode,
  FieldDataType,
} from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DatasetWizardForm {
  datasetCode: string;
  datasetName: string;
  tags: string[];
  description?: string;
  baseType: DatasetBaseType;
  schemaSnapshot: string;
  valueMode?: DatasetValueMode; // REDIS 전용 — 검증 시 자동 추정, 사용자 override 가능
  fields: DatasetField[];
  calcFields: CalcField[];
  lookups: DatasetLookup[];
}

// ────────── REDIS 키 변수 바인딩 ({name} 명명 변수 ↔ 런타임 옵션) ──────────
type KeyVarBind = 'FIELD' | 'DATE';
type KeyVarDateFormat = 'yyyy' | 'yyyymm' | 'yyyymmdd';

/**
 * 키 패턴의 '변수 슬롯' 1개(= `:`로 split 했을 때 `*` 또는 `{name}` 인 세그먼트)의 편집 상태.
 * name 이 비어 있으면 그 자리는 `*`(순수 와일드카드=전체 조회), name 이 있으면 `{name}`(명명 변수=런타임 치환, 필수).
 * name 은 곧 옵션 키 = (FIELD) 행 필터 필드명. 저장 시 BE keyVarBindings 는 name 을 key 로 하는 객체가 된다.
 */
interface KeyVarBinding {
  segmentIndex: number;
  name: string; // '' = 미매핑(*), 값 있으면 {name}
  bind: KeyVarBind;
  format?: KeyVarDateFormat; // DATE 전용
}

const KEY_VAR_DATE_FORMAT_OPTIONS: { value: KeyVarDateFormat; label: string }[] = [
  { value: 'yyyy', label: 'yyyy' },
  { value: 'yyyymm', label: 'yyyymm' },
  { value: 'yyyymmdd', label: 'yyyymmdd' },
];

/** 세그먼트가 정확히 `{name}` 인지 판정 + 이름 추출용. */
const KEY_VAR_TOKEN = /^\{([A-Za-z0-9_]+)\}$/;

/** 키 패턴의 `{...}`(명명 변수·비정상 입력 포함)를 전부 `*` 로 되돌린 스캔 기준 패턴 — 탐색기 스키마 조회·템플릿 하이라이트에 사용. */
function toScanBasePattern(pattern: string): string {
  return pattern ? pattern.replace(/\{[^}]*\}/g, '*') : pattern;
}

/** 키 패턴을 `:`로 split → 변수 슬롯(`*` 또는 `{name}`)의 위치·이름. `*` → name '', `{x}` → name 'x'. */
function parseKeyVarSlots(pattern: string): { segmentIndex: number; name: string }[] {
  if (!pattern) return [];
  return pattern.split(':').reduce<{ segmentIndex: number; name: string }[]>((acc, seg, idx) => {
    if (seg === '*') acc.push({ segmentIndex: idx, name: '' });
    else {
      const m = KEY_VAR_TOKEN.exec(seg);
      if (m) acc.push({ segmentIndex: idx, name: m[1] });
    }
    return acc;
  }, []);
}

/** 편집 진입 시 keyVarBindings(JSON 객체 `{ name: { bind, format } }`) → name별 속성 맵. 파싱 실패/빈값은 빈 맵. */
function parseKeyVarBindingAttrs(json?: string): Record<string, { bind: KeyVarBind; format?: KeyVarDateFormat }> {
  if (!json?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, { bind: KeyVarBind; format?: KeyVarDateFormat }> = {};
    for (const [name, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!name) continue;
      const attr = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
      const bind: KeyVarBind = attr.bind === 'DATE' ? 'DATE' : 'FIELD';
      const format = attr.format === 'yyyy' || attr.format === 'yyyymm' || attr.format === 'yyyymmdd' ? (attr.format as KeyVarDateFormat) : undefined;
      out[name] = { bind, format };
    }
    return out;
  } catch {
    return {};
  }
}

/** 편집 진입 시 저장된 패턴 + 바인딩 → keyVars 재구성. 슬롯 위치·이름은 패턴에서, bind/format 은 바인딩(name 매칭)에서. */
function buildKeyVarsFromDetail(pattern: string, bindingsJson?: string): KeyVarBinding[] {
  const attrs = parseKeyVarBindingAttrs(bindingsJson);
  return parseKeyVarSlots(pattern).map((s) => {
    const a = s.name ? attrs[s.name] : undefined;
    return { segmentIndex: s.segmentIndex, name: s.name, bind: a?.bind ?? 'FIELD', format: a?.format };
  });
}

/** 매핑한(name 있는) 슬롯만 name-key 객체로 직렬화. 미매핑(`*`)은 제외. DATE는 format(기본 yyyymmdd) 포함. */
function serializeKeyVarBindings(vars: KeyVarBinding[]): string {
  const out: Record<string, { bind: KeyVarBind; format?: KeyVarDateFormat }> = {};
  for (const v of vars) {
    const name = v.name?.trim();
    if (!name) continue; // 미매핑 * 는 바인딩에 넣지 않음
    out[name] = v.bind === 'DATE' ? { bind: 'DATE', format: v.format ?? 'yyyymmdd' } : { bind: 'FIELD' };
  }
  return JSON.stringify(out);
}

const initialForm: DatasetWizardForm = {
  datasetCode: '',
  datasetName: '',
  tags: [],
  description: '',
  baseType: 'REDIS',
  schemaSnapshot: '',
  fields: [],
  calcFields: [],
  lookups: [],
};

/**
 * 룩업 정의로부터 가상 필드 행을 합성 — 기존 기본 필드는 보존, 기존 가상 필드는 전부 제거 후 재생성.
 * 가상 필드의 order는 기본 필드들 다음으로 붙는다. classification은 DIM 고정 (룩업 결과는 차원).
 */
function rebuildFieldsWithVirtuals(currentFields: DatasetField[], lookups: DatasetLookup[]): DatasetField[] {
  const baseFields = currentFields.filter((f) => !f.isVirtual);
  const maxOrder = baseFields.reduce((max, f) => Math.max(max, f.orderNo ?? 0), -1);
  let order = maxOrder + 1;
  const virtualFields: DatasetField[] = lookups.flatMap((lookup) =>
    lookup.fields.map<DatasetField>((lf) => {
      const columnFormat: ColumnFormat =
        lf.dataType === 'NUMBER' ? 'Number' : lf.dataType === 'DATE' ? 'Date' : lf.dataType === 'DATETIME' ? 'Date' : lf.dataType === 'TIME' ? 'Time' : 'String';
      return {
        fieldName: lf.outputFieldName,
        classification: 'DIM',
        displayName: lf.displayName ?? lf.outputFieldName,
        dataType: lf.dataType,
        columnFormat,
        isVisible: true,
        orderNo: order++,
        isVirtual: true,
        parentField: lookup.sourceField,
      };
    }),
  );
  return [...baseFields, ...virtualFields];
}

// 통계 WizardStepB의 SortableItem 헬퍼 — children에 useSortable 결과를 그대로 넘김
function SortableItem({ id, children }: { id: string; children: (s: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return <>{children(sortable)}</>;
}

// ────────── 검증 상태 칩 (통계 WizardStepB 패턴) ──────────
type ValidationStatus = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'stale';

function formatTimeAgo(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전 검증';
  if (diffMin < 60) return `${diffMin}분 전 검증`;
  return `${Math.floor(diffMin / 60)}시간 전 검증`;
}

function ValidationChip({ status, checkedAt, errors }: { status: ValidationStatus; checkedAt?: Date; errors?: string[] }) {
  if (status === 'unchecked') return <Tag className="select-none">미검증</Tag>;
  if (status === 'checking')
    return (
      <Tag color="processing" className="select-none">
        검증 중…
      </Tag>
    );
  if (status === 'valid') {
    return (
      <Tooltip title={checkedAt ? formatTimeAgo(checkedAt) : undefined}>
        <Tag color="success" className="select-none cursor-default">
          유효 ✓
        </Tag>
      </Tooltip>
    );
  }
  if (status === 'stale') {
    return (
      <Tooltip title="필드가 변경되어 재검증이 필요합니다">
        <Tag color="warning" className="select-none cursor-default">
          재검증 필요
        </Tag>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={errors?.length ? errors.join(' / ') : '검증 실패'}>
      <Tag color="error" className="select-none cursor-default">
        무효 ✕
      </Tag>
    </Tooltip>
  );
}

// 데이터타입 → 태그 색 (FieldSchemaList와 동일 — 프로젝트 공통 표기). antd Tag로 통일.
const DATA_TYPE_TAG_COLOR: Record<string, string> = {
  NUMBER: 'blue',
  DATE: 'purple',
  DATETIME: 'purple',
  TIME: 'purple',
  BOOLEAN: 'orange',
  STRING: 'default',
};

// 전체 선택 체크박스 헤더 (통계 WizardStepB 패턴)
interface CheckboxHeaderParams extends IHeaderParams {
  allVisible: boolean;
  someVisible: boolean;
  toggleAll: (checked: boolean) => void;
}
function CheckboxHeader({ allVisible, someVisible, toggleAll }: CheckboxHeaderParams) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Checkbox checked={allVisible} indeterminate={someVisible} onChange={(e) => toggleAll(e.target.checked)} />
    </div>
  );
}

// ────────── FieldConfigGrid — 컬럼 구성 그리드만 분리 ──────────
// 분리 목적:
//  1) useMemo로 columnDefs/unifiedRows 캐싱 → 사용 체크박스 토글 시 ag-grid 전체 재렌더 회피 (버벅임 제거)
//  2) Form.useWatch('fields'/'calcFields', form)로 정확히 watch → 계산필드 추가/삭제 즉시 반영
//  3) wizard 본체의 Form.useWatch([], form) 트리거에 영향받지 않음
interface UnifiedFieldRow {
  rowId: string;
  source: 'BASE' | 'CALC' | 'VIRTUAL';
  classification: 'DIM' | 'MSR';
  fieldName: string;
  displayName: string;
  dataType: FieldDataType;
  columnFormat: ColumnFormat;
  isVisible: boolean;
  rowExpression?: string;
  /** VIRTUAL 행 전용 — 부모 룩업 인덱스 (편집/삭제 시 참조) */
  lookupIndex?: number;
  /** VIRTUAL 행 전용 — 부모 룩업의 소스 필드 */
  parentField?: string;
}

interface FieldConfigGridProps {
  form: FormInstance<DatasetWizardForm>;
  /** wizard 본체의 Form.useWatch([], form)에서 추출한 값. props로 직접 받아 즉시 반영 보장 */
  fields: DatasetField[];
  calcFields: CalcField[];
  lookups: DatasetLookup[];
  gridOptions: ReturnType<typeof useAggridOptions>['gridOptions'];
  onCalcAdd: () => void;
  onCalcEdit: (calc: CalcField) => void;
  onCalcDelete: (fieldCode: string) => void;
  onLookupAdd: () => void;
  onLookupEdit: (lookupIndex: number) => void;
  onLookupDelete: (lookupIndex: number) => void;
}

function FieldConfigGrid({ form, fields, calcFields, lookups, gridOptions, onCalcAdd, onCalcEdit, onCalcDelete, onLookupAdd, onLookupEdit, onLookupDelete }: FieldConfigGridProps) {
  const gridRef = useRef<AgGridReact<UnifiedFieldRow>>(null);

  // 노출 토글 가능 행 = BASE + CALC (VIRTUAL은 항상 노출). 통계 WizardStepB의 노출 카운트/전체 선택 패턴.
  const baseCount = fields.filter((f) => !f.isVirtual).length;
  const visibleBase = fields.filter((f) => !f.isVirtual && f.isVisible).length;
  const visibleCalc = calcFields.filter((c) => c.isVisible ?? true).length;
  const toggleTotal = baseCount + calcFields.length;
  const visibleTotal = visibleBase + visibleCalc;
  const allVisible = toggleTotal > 0 && visibleTotal === toggleTotal;
  const someVisible = visibleTotal > 0 && !allVisible;
  const toggleAll = useCallback(
    (checked: boolean) => {
      const curFields = (form.getFieldValue('fields') as DatasetField[]) ?? [];
      form.setFieldsValue({ fields: curFields.map((f) => (f.isVirtual ? f : { ...f, isVisible: checked })) });
      const curCalc = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
      form.setFieldsValue({ calcFields: curCalc.map((c) => ({ ...c, isVisible: checked })) });
    },
    [form],
  );

  // ─── 검증 실행 (통계 WizardStepB 패턴) ──────────────────────────────────────
  const { mutateAsync: runValidate, isPending: isChecking } = useValidateMonitoringDataset();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unchecked');
  const [validationCheckedAt, setValidationCheckedAt] = useState<Date | undefined>();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // fingerprint — 검증 후 필드/계산식/룩업이 바뀌면 stale 처리
  const fieldFingerprint = useMemo(() => {
    const fStr = fields.map((f) => `${f.fieldName}:${f.classification}:${f.displayName}:${f.columnFormat}:${f.isVisible}`).join('|');
    const cStr = calcFields.map((c) => `${c.fieldName}:${c.rowExpression}:${c.displayName}:${c.columnFormat}`).join('|');
    const lStr = lookups.map((l) => `${l.sourceField}:${l.lookupCatalogId}:${l.fields.map((x) => x.outputFieldName).join(',')}`).join('|');
    return `${fStr}__${cStr}__${lStr}`;
  }, [fields, calcFields, lookups]);

  const validationStatusRef = useRef<ValidationStatus>('unchecked');
  useEffect(() => {
    validationStatusRef.current = validationStatus;
  }, [validationStatus]);

  const prevFingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = fieldFingerprint;
    if (prev === null || prev === fieldFingerprint) return;
    const s = validationStatusRef.current;
    if (s === 'valid' || s === 'invalid') setValidationStatus('stale');
  }, [fieldFingerprint]);

  const handleValidate = async () => {
    setValidationStatus('checking');
    try {
      // 저장 시점(onFinish)과 동일하게 가상 필드 합성 + 노출 필드만 전송
      const allFields = rebuildFieldsWithVirtuals(fields, lookups);
      const visibleFields = allFields.filter((f) => f.isVisible !== false);
      const payload: DatasetCreateDatas = {
        datasetCode: (form.getFieldValue('datasetCode') as string) ?? '',
        datasetName: (form.getFieldValue('datasetName') as string) ?? '',
        tags: (form.getFieldValue('tags') as string[]) ?? [],
        description: form.getFieldValue('description') as string | undefined,
        baseType: form.getFieldValue('baseType') as DatasetBaseType,
        schemaSnapshot: (form.getFieldValue('schemaSnapshot') as string) ?? '',
        fields: visibleFields,
        calcFields,
        lookups,
      };
      const result = await runValidate(payload);
      setValidationWarnings(result.warnings ?? []);
      if (result.ok) {
        setValidationErrors([]);
        setValidationCheckedAt(new Date());
        setValidationStatus('valid');
        if (result.warnings?.length) toast.warning(`검증을 통과했습니다. (경고 ${result.warnings.length}건)`);
        else toast.success('모든 필드가 유효합니다.');
      } else {
        const errors = result.errors?.length ? result.errors : ['검증 실패'];
        setValidationErrors(errors);
        setValidationStatus('invalid');
        errors.forEach((e) => toast.error(e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '검증 실행 중 오류가 발생했습니다.';
      setValidationErrors([msg]);
      setValidationWarnings([]);
      setValidationStatus('invalid');
      toast.error(msg);
    }
  };

  // BASE + VIRTUAL + CALC 통합 행 — fields(base+virtual)/calcFields/lookups 변경 시 재계산
  const unifiedRows = useMemo<UnifiedFieldRow[]>(() => {
    const sourceToLookupIndex = new Map<string, number>();
    lookups.forEach((l, i) => sourceToLookupIndex.set(l.sourceField, i));

    const ordered = [...fields].sort((a, b) => a.orderNo - b.orderNo);
    const base: UnifiedFieldRow[] = [];
    const virtual: UnifiedFieldRow[] = [];
    for (const f of ordered) {
      const isVirt = f.isVirtual === true;
      const row: UnifiedFieldRow = {
        rowId: isVirt ? `virtual:${f.fieldName}` : `base:${f.fieldName}`,
        source: isVirt ? 'VIRTUAL' : 'BASE',
        classification: f.classification,
        fieldName: f.fieldName,
        displayName: f.displayName,
        dataType: f.dataType,
        columnFormat: f.columnFormat,
        isVisible: f.isVisible,
      };
      if (isVirt) {
        row.parentField = f.parentField;
        row.lookupIndex = f.parentField !== undefined ? sourceToLookupIndex.get(f.parentField) : undefined;
        virtual.push(row);
      } else {
        base.push(row);
      }
    }
    const calc: UnifiedFieldRow[] = calcFields.map((c) => ({
      rowId: `calc:${c.fieldName}`,
      source: 'CALC',
      classification: c.classification,
      fieldName: c.fieldName,
      displayName: c.displayName,
      dataType: c.dataType,
      columnFormat: c.columnFormat,
      isVisible: c.isVisible ?? true, // CALC도 BASE처럼 노출 토글 가능. 구버전 데이터는 기본 true
      rowExpression: c.rowExpression,
    }));
    // 통계 WizardStepB와 동일 — 노출(체크) 행을 위로, 그 외엔 BASE→VIRTUAL→CALC 순서 유지(안정 정렬)
    const allRows = [...base, ...virtual, ...calc];
    allRows.sort((a, b) => (a.isVisible === b.isVisible ? 0 : a.isVisible ? -1 : 1));
    return allRows;
  }, [fields, calcFields, lookups]);

  // unifiedRows 변경 시 ag-grid에 강제 setGridOption — props 흐름이 ag-grid 내부에서 immutable 비교에
  // 걸려서 calc 행이 추가되지 않는 케이스를 우회. setGridOption은 ag-grid v32+ 공식 API.
  useEffect(() => {
    const api = gridRef.current?.api;
    if (api) {
      api.setGridOption('rowData', unifiedRows);
    }
  }, [unifiedRows]);

  // source별 분리된 업데이트 — patch 타입을 좁혀 BASE/CALC 각각 form 분리 업데이트.
  // 단일 updateRow에 Partial<UnifiedFieldRow>를 받으면 BASE에 없는 rowId/source/rowExpression이
  // 섞여 setFieldsValue({ fields }) 타입 검사가 깨짐 → source별로 분리하여 TypeScript 호환 확보.
  const updateBase = useCallback(
    (columnName: string, patch: Partial<DatasetField>) => {
      const current = (form.getFieldValue('fields') as DatasetField[]) ?? [];
      form.setFieldsValue({ fields: current.map((f) => (f.fieldName === columnName ? { ...f, ...patch } : f)) });
    },
    [form],
  );
  const updateCalc = useCallback(
    (fieldCode: string, patch: Partial<CalcField>) => {
      const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
      form.setFieldsValue({ calcFields: current.map((c) => (c.fieldName === fieldCode ? { ...c, ...patch } : c)) });
    },
    [form],
  );
  // cellRenderer에서 source 분기 → 적절한 updater 호출 헬퍼. patch는 양쪽 entity 공통 키만 노출
  const updateRow = useCallback(
    (row: UnifiedFieldRow, patch: { classification?: 'DIM' | 'MSR'; displayName?: string; columnFormat?: ColumnFormat; isVisible?: boolean }) => {
      if (row.source === 'BASE') updateBase(row.fieldName, patch as Partial<DatasetField>);
      else updateCalc(row.fieldName, patch as Partial<CalcField>);
    },
    [updateBase, updateCalc],
  );

  // cellStyle — CellStyle 타입으로 상수화. 같은 reference 재사용으로 union 추론 시 키 누락(undefined) 회피
  const centerCellStyle: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const startCellStyle: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' };

  // columnDefs — form/updateRow/콜백이 stable이므로 한 번만 생성
  const columnDefs = useMemo<ColDef<UnifiedFieldRow>[]>(
    () => [
      {
        headerComponent: CheckboxHeader,
        headerComponentParams: { allVisible, someVisible, toggleAll },
        maxWidth: 52,
        editable: false,
        sortable: false,
        suppressHeaderMenuButton: true,
        cellStyle: centerCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          // VIRTUAL 행은 항상 노출 (룩업이 정의되어 있으면 결과는 보여야 함). BASE/CALC는 토글 가능
          if (data.source === 'VIRTUAL') return <Checkbox checked disabled />;
          return <Checkbox checked={!!data.isVisible} onChange={(e) => updateRow(data, { isVisible: e.target.checked })} />;
        },
      },
      {
        headerName: '컬럼',
        field: 'fieldName',
        flex: 2,
        minWidth: 180,
        editable: false,
        sortable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          // 계산식/룩업 구분은 통계 WizardStepB처럼 컬럼 셀의 배지로 표기 (별도 '유형' 열 제거)
          return (
            <div className="flex items-center gap-1.5 h-full">
              {data.source === 'CALC' && (
                <Tooltip
                  title={
                    <div className="space-y-1">
                      <div className="text-[10.5px] uppercase tracking-wider text-white/70">계산식</div>
                      <div className="font-mono text-[12px] whitespace-pre-wrap break-all">{data.rowExpression ?? '—'}</div>
                    </div>
                  }
                  placement="topLeft"
                  overlayStyle={{ maxWidth: 480 }}
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white cursor-help">ƒ</span>
                </Tooltip>
              )}
              {data.source === 'VIRTUAL' && (
                <Tooltip title={`코드 룩업 결과 — 소스 필드 ${data.parentField ?? '—'}`} placement="topLeft">
                  <Tag color="processing" className="!m-0 !text-[10px] !px-1 !py-0 !leading-4 cursor-help">
                    룩업
                  </Tag>
                </Tooltip>
              )}
              <span className={`font-mono font-semibold truncate ${data.source === 'CALC' ? 'text-green-700' : ''}`}>{data.fieldName}</span>
            </div>
          );
        },
      },
      {
        field: 'classification',
        headerName: '구분',
        width: 96,
        editable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          if (data.source === 'VIRTUAL') return <span className="font-mono text-[11px] text-[var(--color-bt-fg-muted)]">DIM</span>;
          return (
            <Select
              size="small"
              value={params.value as 'DIM' | 'MSR'}
              onChange={(v) => updateRow(data, { classification: v as 'DIM' | 'MSR' })}
              options={[
                { value: 'DIM', label: 'DIM' },
                { value: 'MSR', label: 'MSR' },
              ]}
              style={{ width: '100%' }}
            />
          );
        },
      },
      {
        field: 'dataType',
        headerName: '데이터 타입',
        width: 116,
        editable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const v = params.value as string | undefined;
          if (!v) return null;
          return (
            <Tag color={DATA_TYPE_TAG_COLOR[v] ?? 'default'} className="!mr-0 font-mono text-[10px]">
              {v}
            </Tag>
          );
        },
      },
      {
        field: 'columnFormat',
        headerName: '서식',
        width: 132,
        editable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          if (data.source === 'VIRTUAL') return <span className="text-[11px] text-[var(--color-bt-fg-muted)]">{data.columnFormat}</span>;
          return (
            <Select
              size="small"
              value={data.columnFormat}
              onChange={(v) => updateRow(data, { columnFormat: v as ColumnFormat })}
              options={COLUMN_FORMAT_OPTIONS}
              style={{ width: '100%' }}
            />
          );
        },
      },
      {
        field: 'displayName',
        headerName: '표시명',
        flex: 1,
        minWidth: 160,
        editable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          if (data.source === 'VIRTUAL') return <span className="truncate text-[12px] text-[var(--color-bt-fg-muted)]">{data.displayName}</span>;
          return <Input size="small" value={data.displayName} onChange={(e) => updateRow(data, { displayName: e.target.value })} />;
        },
      },
      {
        headerName: '',
        width: 80,
        editable: false,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: centerCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          if (data.source === 'CALC') {
            const calc = (form.getFieldValue('calcFields') as CalcField[])?.find((c) => c.fieldName === data.fieldName);
            if (!calc) return null;
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onCalcEdit(calc)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-primary)]"
                  title="계산필드 편집"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onCalcDelete(calc.fieldName)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-danger-soft)] hover:text-[var(--color-bt-danger)]"
                  title="계산필드 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }
          if (data.source === 'VIRTUAL' && data.lookupIndex !== undefined) {
            const idx = data.lookupIndex;
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLookupEdit(idx)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-primary)]"
                  title="룩업 편집"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onLookupDelete(idx)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-danger-soft)] hover:text-[var(--color-bt-danger)]"
                  title="이 룩업 전체 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }
          return null;
        },
      },
    ],
    [form, updateRow, onCalcEdit, onCalcDelete, onLookupEdit, onLookupDelete, allVisible, someVisible, toggleAll],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">필드 구성</span>
        <span className="text-xs text-[var(--color-bt-fg-muted)]">— 노출할 필드를 선택하고 분류·서식·표시명을 지정하세요</span>
        <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">
          노출 <span className="font-semibold text-[var(--color-bt-primary)]">{visibleTotal}</span> / {toggleTotal}
        </span>
        <ValidationChip status={validationStatus} checkedAt={validationCheckedAt} errors={validationErrors} />
        <Button size="small" icon={<Play className="w-3 h-3" />} loading={isChecking} onClick={handleValidate} disabled={visibleTotal === 0}>
          검증 실행
        </Button>
        <Divider orientation="vertical" className="mx-0" />
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={onLookupAdd}>
          룩업 추가
        </Button>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={onCalcAdd}>
          계산필드 추가
        </Button>
      </div>

      {/* 검증 결과 인라인 박스 — invalid 시 오류, valid+경고 시 경고 노출 */}
      {validationStatus === 'invalid' && validationErrors.length > 0 && (
        <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-red-600">검증 실패 — 서버에서 반환된 오류</div>
          {validationErrors.map((e, i) => (
            <div key={i} className="font-mono text-xs text-red-700 break-all">
              {e}
            </div>
          ))}
        </div>
      )}
      {validationStatus === 'valid' && validationWarnings.length > 0 && (
        <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-amber-600">검증 경고</div>
          {validationWarnings.map((w, i) => (
            <div key={i} className="font-mono text-xs text-amber-700 break-all">
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 w-full">
        {/* 통계 WizardStepB와 동일 — 행 번호 + 고정 행 높이(40). 전체 한눈에 보도록 페이지네이션/상태바 끔 */}
        <AgGridReact<UnifiedFieldRow>
          ref={gridRef}
          rowData={unifiedRows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, rowNumbers: true, pagination: false, statusBar: undefined, sideBar: false }}
          rowHeight={40}
          getRowId={(p) => p.data.rowId}
          getRowClass={(p) => (p.data?.source === 'CALC' ? 'ag-row-calc' : p.data && !p.data.isVisible ? 'ag-row-hidden' : '')}
          overlayNoRowsTemplate="데이터 소스를 검증하면 컬럼이 자동으로 로드됩니다."
        />
      </div>
    </div>
  );
}

export default function DatasetWizard() {
  const { datasetId: param } = useParams<{ datasetId: string }>();
  const isEdit = !!param;
  const datasetId = isEdit ? Number(param) : 0;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [form] = Form.useForm<DatasetWizardForm>();
  const [currentStep, setCurrentStep] = useState(0);
  const [calcEditing, setCalcEditing] = useState<{ mode: 'add' | 'edit'; initial?: CalcField } | null>(null);
  /** 코드 룩업 Drawer ref — open/close 명령형 호출 */
  const lookupDrawerRef = useRef<LookupEditDrawerRef>(null);

  // Step 2 데이터 소스 검증 상태 — true가 되어야 다음 단계로 진행 가능
  // schemaSnapshot/baseType이 바뀌면 자동으로 false로 리셋
  // 편집 모드에서 첫 로드 시점에는 기존 schemaSnapshot이 이미 한 번 검증된 상태이므로 true로 시작
  const [sourceValidated, setSourceValidated] = useState(false);
  // QUERY 검증 결과 컬럼(필드명/타입/코멘트) — 우측 필드 스키마 패널 표시용
  const [queryColumns, setQueryColumns] = useState<FieldSchemaColumn[]>([]);
  // 사용자가 직접 소스(REDIS 키 등)를 골랐는지 — 편집 첫 로드 시 자동 채움이 기존 필드를 덮지 않게 가드
  const keyUserPickedRef = useRef(false);
  // 검증 결과 모달 — 실패·경고 시에만 노출 (통과+경고없음은 토스트만)
  const validationModalRef = useRef<SourceValidationResultModalRef>(null);
  // REDIS 키 변수 — 슬롯(`*`/`{name}`)을 로컬 상태로 관리. 이름 지정 시 {name}(런타임 치환), 비우면 * (전체). 저장 시 name-key JSON 직렬화
  const [keyVars, setKeyVars] = useState<KeyVarBinding[]>([]);
  // 선택한 Redis 키의 사전 표시명/설명 — 기본 정보 화면 안내용 (스키마 로드 시 반영)
  const [keyInfo, setKeyInfo] = useState<{ name: string | null; desc: string | null }>({ name: null, desc: null });

  // 편집 모드 — 기존 데이터셋 로드
  const { data: detail } = useGetMonitoringDataset({ params: { datasetId }, queryOptions: { enabled: isEdit, retry: false } });

  // 편집 진입 시 폼 초기화 + 기존 데이터 소스는 이미 검증된 상태로 간주 (사용자가 수정하면 handleSchemaChange에서 false로 무효화)
  useEffect(() => {
    if (detail) {
      form.setFieldsValue({
        datasetCode: detail.datasetCode,
        datasetName: detail.datasetName,
        tags: detail.tags ?? [],
        description: detail.description ?? '',
        baseType: detail.baseType,
        schemaSnapshot: detail.schemaSnapshot,
        valueMode: detail.valueMode,
        fields: detail.fields,
        calcFields: detail.calcFields,
        lookups: detail.lookups ?? [],
      });
      setSourceValidated(true);
      // 키 변수 초기값 — 저장된 패턴({name} 포함) + 바인딩(name별 속성)으로 재구성 (이후 reconcile 이 패턴과 정합 유지)
      setKeyVars(buildKeyVarsFromDetail(detail.schemaSnapshot ?? '', detail.keyVarBindings));
    }
  }, [detail, form]);

  // 폼 값 실시간 추적 (스텝 렌더링용)
  const formValues = Form.useWatch([], form);

  // 키 변수 reconcile — REDIS 키 패턴의 슬롯(`*`/`{name}`)과 keyVars 정합.
  // 슬롯 위치·name 은 패턴에서 취하고, bind/format 은 기존 설정을 index로 보존. 사라진 슬롯 제거, 새 슬롯 추가. REDIS가 아니면 비움.
  const schemaSnapshotWatch = (formValues?.schemaSnapshot ?? '') as string;
  const baseTypeWatch = (formValues?.baseType ?? 'REDIS') as DatasetBaseType;
  useEffect(() => {
    if (baseTypeWatch !== 'REDIS') {
      setKeyVars((prev) => (prev.length ? [] : prev));
      return;
    }
    const slots = parseKeyVarSlots(schemaSnapshotWatch);
    setKeyVars((prev) => {
      const byIndex = new Map(prev.map((v) => [v.segmentIndex, v]));
      const next: KeyVarBinding[] = slots.map((s) => {
        const ex = byIndex.get(s.segmentIndex);
        return ex ? { ...ex, name: s.name } : { segmentIndex: s.segmentIndex, name: s.name, bind: 'FIELD' };
      });
      const same =
        next.length === prev.length &&
        next.every((v, idx) => {
          const p = prev[idx];
          return p && p.segmentIndex === v.segmentIndex && p.name === v.name && p.bind === v.bind && p.format === v.format;
        });
      return same ? prev : next;
    });
  }, [schemaSnapshotWatch, baseTypeWatch]);

  const updateKeyVar = useCallback((segmentIndex: number, patch: Partial<KeyVarBinding>) => {
    setKeyVars((prev) => prev.map((v) => (v.segmentIndex === segmentIndex ? { ...v, ...patch } : v)));
  }, []);

  // 슬롯에 이름(field) 매핑 — keyVars.name 즉시 반영 + 패턴 세그먼트를 `{name}`(빈값이면 `*`)으로 재작성.
  // 이름을 지우면 그 자리는 `*`(순수 와일드카드=전체 조회)로 되돌아간다.
  const updateKeyVarName = useCallback(
    (segmentIndex: number, name: string) => {
      const trimmed = name.trim();
      setKeyVars((prev) => prev.map((v) => (v.segmentIndex === segmentIndex ? { ...v, name: trimmed } : v)));
      const cur = (form.getFieldValue('schemaSnapshot') as string) ?? '';
      const segs = cur.split(':');
      if (segmentIndex >= 0 && segmentIndex < segs.length) {
        segs[segmentIndex] = trimmed ? `{${trimmed}}` : '*';
        form.setFieldsValue({ schemaSnapshot: segs.join(':') });
      }
    },
    [form],
  );

  // Breadcrumb
  const datasetNameWatch = Form.useWatch('datasetName', form);
  useEffect(() => {
    const items: BreadcrumbProps['items'] = [
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '데이터셋', path: '/insight/monitoring/datasets' },
      {
        title: isEdit ? `${datasetNameWatch ?? '편집'}` : '새 데이터셋',
        path: isEdit ? `/insight/monitoring/datasets/${param}/edit` : '/insight/monitoring/datasets/create',
      },
    ];
    setBreadcrumb(items);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb, isEdit, param, datasetNameWatch]);

  // Mutations
  const { mutate: createDataset, isPending: isCreating } = useCreateMonitoringDataset({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: monitoringDatasetKeys.list().queryKey });
        toast.success('데이터셋이 생성되었습니다.');
        navigate('/insight/monitoring/datasets');
      },
    },
  });
  const { mutate: updateDataset, isPending: isUpdating } = useUpdateMonitoringDataset({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: monitoringDatasetKeys.list().queryKey });
        queryClient.invalidateQueries({ queryKey: monitoringDatasetKeys.detail(datasetId).queryKey });
        toast.success('데이터셋이 수정되었습니다.');
        navigate('/insight/monitoring/datasets');
      },
    },
  });

  // 소스 변경 — REDIS=키 패턴 / QUERY=SQL. 컬럼은 "데이터 소스 검증"으로 채운다.
  // 소스가 바뀌면 검증 상태 무효화 (재검증 강제)
  const handleSchemaChange = (text: string) => {
    form.setFieldsValue({ schemaSnapshot: text });
    setSourceValidated(false);
    setQueryColumns([]); // 소스 변경 → 이전 검증 컬럼 무효화
    keyUserPickedRef.current = true; // 사용자가 직접 소스를 바꿈 → REDIS 스키마 자동 채움 허용
  };

  // REDIS 키 선택 → 스키마 로드 시 데이터셋 필드/값모드 자동 채움 (검증 버튼 대체).
  // 편집 첫 로드처럼 사용자가 직접 고르지 않은 경우엔 기존 저장 필드를 덮지 않는다.
  const handleRedisSchemaLoaded = (schema: RedisKeySchema) => {
    // 키 사전 표시명/설명은 항상 반영 (편집 첫 로드 포함) — 기본 정보 안내용
    setKeyInfo({ name: schema.keyDisplayName ?? null, desc: schema.keyDescription ?? null });
    if (!keyUserPickedRef.current) return;
    if (schema.valueMode) form.setFieldsValue({ valueMode: schema.valueMode });
    if (schema.columns.length > 0) {
      const fields: DatasetField[] = schema.columns.map((c, idx) => ({
        fieldName: c.columnName,
        // 필드 사전(comment=한글명)이 있으면 표시명 기본값으로 사용, 없으면 영문 컬럼명
        displayName: c.comment?.trim() ?? c.columnName,
        // 필드 사전 분류(DIM/MSR) 우선, 없으면 데이터타입 폴백 — NUMBER는 측정값(MSR), 그 외는 차원(DIM)
        classification: c.classification ?? (c.dataType === 'NUMBER' ? 'MSR' : 'DIM'),
        dataType: c.dataType as FieldDataType,
        columnFormat: c.columnFormat as ColumnFormat,
        isVisible: true,
        orderNo: idx,
        source: (c.source ?? undefined) as DatasetFieldSource | undefined,
      }));
      form.setFieldsValue({ fields });
      setSourceValidated(true);
    }
  };

  // QUERY 전용 — SQL 정렬. (REDIS/EXTERNAL은 정렬 버튼 미노출). 정렬은 소스 변경이므로 검증 상태 무효화
  const handleFormatSource = () => {
    const current = ((form.getFieldValue('schemaSnapshot') as string) ?? '').trim();
    if (!current) return;
    try {
      const formatted = formatSql(current, { language: 'plsql', keywordCase: 'upper', tabWidth: 2 });
      form.setFieldsValue({ schemaSnapshot: formatted });
      setSourceValidated(false);
    } catch (e) {
      Log.warn('format failed', e);
      toast.error('SQL 정렬 실패 — 구문을 확인하세요.');
    }
  };

  // 베이스 카드 선택 — 전환 시 입력된 스키마/필드 + 검증 상태 초기화. 편집 모드에서는 변경 불가
  const handleBaseTypeChange = (next: DatasetBaseType) => {
    if (isEdit) return; // 기존 데이터셋의 베이스 타입은 변경 불가
    const current = form.getFieldValue('baseType') as DatasetBaseType;
    if (current === next) return;
    form.setFieldsValue({ baseType: next, schemaSnapshot: '', fields: [] });
    setSourceValidated(false);
    setQueryColumns([]);
  };

  // 데이터 소스 검증 mutation — BE 호출 결과로 sourceValidated 결정 + SQL 베이스는 detectedColumns로 fields 자동 세팅
  const { mutate: runValidateSource, isPending: isValidating } = useValidateMonitoringDatasetSource({
    mutationOptions: {
      onSuccess: (result) => {
        const baseType = form.getFieldValue('baseType') as DatasetBaseType;
        if (result.ok) {
          setSourceValidated(true);
          // QUERY 우측 필드 스키마 패널용 — 감지된 컬럼(코멘트 포함) 보관
          setQueryColumns(result.detectedColumns ?? []);
          // REDIS 검증 시 자동 추정한 값 모드 반영 (사용자가 Step2에서 override 가능)
          if (result.valueMode) {
            form.setFieldsValue({ valueMode: result.valueMode });
          }
          // 검증 dry-run/probe로 추출된 컬럼이 있으면 fields에 자동 세팅 (REDIS/QUERY 공통)
          if (baseType !== 'EXTERNAL' && result.detectedColumns && result.detectedColumns.length > 0) {
            const fields: DatasetField[] = result.detectedColumns.map((c, idx) => ({
              fieldName: c.columnName,
              displayName: c.columnName,
              // 필드 사전 분류(DIM/MSR) 우선, 없으면 데이터타입 폴백 — NUMBER는 측정값(MSR), 그 외는 차원(DIM)
              classification: c.classification ?? (c.dataType === 'NUMBER' ? 'MSR' : 'DIM'),
              dataType: c.dataType as FieldDataType,
              columnFormat: c.columnFormat as ColumnFormat,
              isVisible: true, // 모니터링 기본 — 모든 컬럼 노출
              orderNo: idx,
              source: c.source as DatasetFieldSource | undefined,
            }));
            form.setFieldsValue({ fields });
          }
          const hasWarnings = result.warnings && result.warnings.length > 0;
          if (hasWarnings) {
            // 통과 + 경고 → 모달
            validationModalRef.current?.open(result);
          } else {
            // 통과 + 경고 없음 → 토스트만 (간단히 알리고 진행)
            toast.success('데이터 소스 검증을 통과했습니다.');
          }
        } else {
          // 실패 → 모달 (메시지가 길 수 있으므로)
          setSourceValidated(false);
          validationModalRef.current?.open(result);
        }
      },
      onError: (e) => {
        setSourceValidated(false);
        validationModalRef.current?.open({
          ok: false,
          errors: ['서버 검증 요청 실패 — 네트워크 또는 서버 상태를 확인한 후 다시 시도하세요.'],
          warnings: [],
          detectedColumns: [],
        });
        Log.error('validateSource error', e);
      },
    },
  });

  const handleValidateSource = () => {
    const baseType = form.getFieldValue('baseType') as DatasetBaseType;
    const schemaSnapshot = (form.getFieldValue('schemaSnapshot') as string) ?? '';
    if (!schemaSnapshot.trim()) {
      toast.warning('스키마를 먼저 입력하세요.');
      return;
    }
    runValidateSource({ baseType, schemaSnapshot });
  };

  // 통계 WizardStepB 패턴 — DnD 센서, 필드 단위 부분 업데이트
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [paletteSearch, setPaletteSearch] = useState('');

  // ag-grid 옵션 — DatasetCatalog와 동일
  const { gridOptions } = useAggridOptions();

  // 그룹 단위 DnD 재정렬 — DIM 또는 MSR 그룹 안의 orderNo만 갱신, 다른 그룹은 그대로
  const handleGroupDragEnd = (group: 'DIM' | 'MSR') => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = (form.getFieldValue('fields') as DatasetField[]) ?? [];
    const groupItems = current.filter((f) => f.classification === group).sort((a, b) => a.orderNo - b.orderNo);
    const oldIdx = groupItems.findIndex((f) => f.fieldName === active.id);
    const newIdx = groupItems.findIndex((f) => f.fieldName === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(groupItems, oldIdx, newIdx);
    const groupMin = Math.min(...groupItems.map((f) => f.orderNo));
    form.setFieldsValue({
      fields: current.map((f) => {
        if (f.classification !== group) return f;
        const pos = reordered.findIndex((r) => r.fieldName === f.fieldName);
        return { ...f, orderNo: groupMin + pos };
      }),
    });
  };

  // 계산필드 DnD — calcFields 배열 자체를 arrayMove
  const handleCalcDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    const oldIdx = current.findIndex((c) => c.fieldName === active.id);
    const newIdx = current.findIndex((c) => c.fieldName === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    form.setFieldsValue({ calcFields: arrayMove(current, oldIdx, newIdx) });
  };

  // 계산필드
  const handleCalcSave = (calc: CalcField) => {
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    if (calcEditing?.mode === 'edit' && calcEditing.initial) {
      form.setFieldsValue({ calcFields: current.map((c) => (c.fieldName === calcEditing.initial!.fieldName ? calc : c)) });
    } else {
      form.setFieldsValue({ calcFields: [...current, calc] });
    }
    setCalcEditing(null);
  };
  const handleCalcDelete = (fieldCode: string) => {
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    form.setFieldsValue({ calcFields: current.filter((c) => c.fieldName !== fieldCode) });
  };

  // 코드 룩업 — 변경 시 가상 필드도 자동 재합성
  const applyLookups = (nextLookups: DatasetLookup[]) => {
    const rebuiltFields = rebuildFieldsWithVirtuals((form.getFieldValue('fields') as DatasetField[]) ?? [], nextLookups);
    form.setFieldsValue({ lookups: nextLookups, fields: rebuiltFields });
  };
  const handleLookupOk = (lookup: DatasetLookup, editingIndex?: number) => {
    const current = (form.getFieldValue('lookups') as DatasetLookup[]) ?? [];
    if (editingIndex !== undefined) {
      applyLookups(current.map((l, i) => (i === editingIndex ? lookup : l)));
    } else {
      applyLookups([...current, lookup]);
    }
  };
  const handleLookupAdd = () => lookupDrawerRef.current?.open();
  const handleLookupEdit = (lookupIndex: number) => {
    const current = (form.getFieldValue('lookups') as DatasetLookup[]) ?? [];
    const target = current[lookupIndex];
    if (!target) return;
    lookupDrawerRef.current?.open({ initial: target, editingIndex: lookupIndex });
  };
  const handleLookupDelete = (lookupIndex: number) => {
    const current = (form.getFieldValue('lookups') as DatasetLookup[]) ?? [];
    applyLookups(current.filter((_, i) => i !== lookupIndex));
  };

  // Step 정의 — 기본 정보(기본 필드 + 데이터셋 소스 통합) → 필드 구성
  const steps = [
    { title: '기본 정보', requiredFieldNames: ['datasetCode', 'datasetName', 'baseType', 'schemaSnapshot'], content: renderStep1 },
    { title: '필드 구성', requiredFieldNames: [], content: renderStep3 },
  ];

  const handleNext = async () => {
    try {
      await form.validateFields(steps[currentStep].requiredFieldNames);
      // 기본 정보 → 필드 구성 전환: BE 검증 통과 강제 + 베이스별 필드 추출 확인
      if (currentStep === 0) {
        if (!sourceValidated) {
          const bt = form.getFieldValue('baseType') as DatasetBaseType;
          toast.warning(
            bt === 'REDIS'
              ? 'Redis 키를 선택해 주세요. (선택하면 필드가 자동으로 채워집니다)'
              : '먼저 "데이터 소스 검증" 버튼을 눌러 검증을 통과해야 다음 단계로 진행할 수 있습니다.',
            { position: 'bottom-right' },
          );
          return;
        }
        const fields = (form.getFieldValue('fields') as DatasetField[]) ?? [];
        const baseType = form.getFieldValue('baseType') as DatasetBaseType;
        if (baseType === 'EXTERNAL') {
          toast.error('외부 API 연동은 아직 지원되지 않습니다. (고도화 시 제공)');
          return;
        }
        if (fields.length === 0) {
          toast.error(
            baseType === 'REDIS' ? 'Redis 키에서 컬럼을 추출하지 못했습니다. 키 패턴을 확인하세요.' : 'SQL dry-run에서 컬럼을 추출하지 못했습니다. SELECT 절을 확인하세요.',
          );
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      Log.warn(`Step ${currentStep + 1} validation failed`, error);
    }
  };
  const handlePrev = () => setCurrentStep(currentStep - 1);
  const handleSubmitBtn = () => form.submit();

  const onFinish: FormProps<DatasetWizardForm>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (values.baseType === 'EXTERNAL') {
      toast.error('외부 API 연동 데이터셋은 아직 저장할 수 없습니다. (고도화 시 제공)');
      return;
    }
    const lookups = values.lookups ?? [];
    // 룩업 카탈로그 미선택 차단 — 가상 필드가 생성되지 않은 카드가 있으면 저장 거부
    const invalidLookup = lookups.find((l) => !l.lookupCatalogId || l.fields.length === 0);
    if (invalidLookup) {
      toast.error('마스터 테이블·값 컬럼이 모두 채워지지 않은 룩업이 있습니다.');
      return;
    }
    // 가상 필드는 룩업에서 항상 합성 — 저장 시점에 fields 배열 재구성
    const allFields = rebuildFieldsWithVirtuals(values.fields ?? [], lookups);
    const visibleFields = allFields.filter((f) => f.isVisible !== false);
    const visibleBase = visibleFields.filter((f) => !f.isVirtual);
    if (visibleBase.length === 0) {
      toast.error('사용 체크된 기본 필드가 1개 이상 필요합니다.');
      return;
    }
    const payload: DatasetCreateDatas = {
      datasetCode: values.datasetCode,
      datasetName: values.datasetName,
      tags: values.tags ?? [],
      description: values.description,
      baseType: values.baseType,
      schemaSnapshot: values.schemaSnapshot,
      valueMode: values.baseType === 'REDIS' ? values.valueMode : undefined,
      // REDIS만 키 변수 바인딩 저장 (그 외 baseType은 BE가 null 강제)
      keyVarBindings: values.baseType === 'REDIS' ? serializeKeyVarBindings(keyVars) : undefined,
      fields: visibleFields,
      calcFields: values.calcFields ?? [],
      lookups,
    };
    if (isEdit) updateDataset({ datasetId, data: payload });
    else createDataset(payload);
  };
  const onFinishFailed: FormProps<DatasetWizardForm>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  if (isEdit && !detail) return <FallbackSpinner />;

  // ────────── Step 1: 기본 정보 ──────────
  function renderStep1() {
    // 기본 정보 + 데이터셋 소스 통합 단계 (통계 WizardStepA 패턴 — 이름·설명·태그 + 소스 선택)
    const text = (formValues?.schemaSnapshot ?? '') as string;
    const baseType = (formValues?.baseType ?? 'REDIS') as DatasetBaseType;
    // 키 변수 FIELD 후보 — 추출된 데이터셋(우측 스키마) 필드명
    const keyVarFieldOptions = ((formValues?.fields as DatasetField[]) ?? []).map((f) => ({ value: f.fieldName, label: f.fieldName }));
    // 매핑된(=이름 있는 {name}) 슬롯 개수. 나머지는 * (전체 조회).
    const mappedCount = keyVars.filter((v) => v.name?.trim()).length;
    const wildcardCount = keyVars.length - mappedCount;
    // 키 패턴 세그먼트 — 슬롯 위치 라벨 렌더용
    const keySegments = text.split(':');

    // ── 키 변수 매핑 — 탐색기의 3번째 열. 이름을 지정하면 {name}(필수 치환), 비우면 * (전체 조회) ──
    const keyVarSlotNode =
      keyVars.length > 0 ? (
        <>
          {/* 헤더 바 — 필드 스키마 열과 동일 톤 */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <AlertTriangle className="size-3.5 shrink-0 text-[var(--color-bt-primary)]" />키 변수 — 매핑 {mappedCount} / 슬롯 {keyVars.length}
              </div>
              <div className="mt-0.5 text-[10.5px] text-gray-400">
                이름을 지정하면 <span className="font-mono">{'{name}'}</span> 로 런타임 치환(필수), 비우면 <span className="font-mono">*</span> 전체 조회
              </div>
            </div>
            {wildcardCount > 0 && <Tag className="!mr-0 shrink-0 !text-[10px]">전체 * {wildcardCount}</Tag>}
          </div>
          {/* 본문 — 카드 세로 스택, 자체 스크롤 */}
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
            {keyVars.map((v) => {
              const mapped = !!v.name?.trim();
              return (
                <div key={v.segmentIndex} className="rounded border border-[var(--color-bt-border)] bg-white px-2.5 py-2">
                  {/* 위치 라벨 — 현재 슬롯을 강조({name} 또는 *) + 세그먼트 N + 상태 칩 */}
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] leading-tight">
                      {keySegments.map((seg, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-gray-400">:</span>}
                          {i === v.segmentIndex ? (
                            <span className="rounded bg-[var(--color-bt-primary-soft)] px-1 font-semibold text-[var(--color-bt-primary)]">{mapped ? `{${v.name}}` : '*'}</span>
                          ) : (
                            <span className={seg === '*' ? 'text-gray-400' : 'text-gray-700'}>{seg}</span>
                          )}
                        </span>
                      ))}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] text-[var(--color-bt-fg-muted)]">세그먼트 {v.segmentIndex}</span>
                      {mapped ? (
                        <Tag color="blue" className="!mr-0 !text-[10px]">
                          매핑
                        </Tag>
                      ) : (
                        <Tag className="!mr-0 !text-[10px]">전체 *</Tag>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      size="small"
                      value={v.bind}
                      style={{ width: 88 }}
                      onChange={(b) => updateKeyVar(v.segmentIndex, { bind: b as KeyVarBind })}
                      options={[
                        { value: 'FIELD', label: '필드' },
                        { value: 'DATE', label: '날짜' },
                      ]}
                    />
                    {v.bind === 'FIELD' ? (
                      // 검색어(타이핑)는 옵션 필터에만 쓰이고 값이 아니다 — 항목을 실제로 고르거나 비울 때만 onChange 발생.
                      // (AutoComplete는 타이핑마다 onChange가 값으로 반영돼, '*' 검색 입력이 패턴을 {*}로 바꿔 스키마 요청을 유발했음)
                      <Select
                        size="small"
                        style={{ flex: 1, minWidth: 160 }}
                        value={v.name || undefined}
                        onChange={(val) => updateKeyVarName(v.segmentIndex, (val as string) ?? '')}
                        options={keyVarFieldOptions}
                        showSearch
                        optionFilterProp="label"
                        placeholder="필드 선택 → {name} (미선택 시 * 전체)"
                        allowClear
                        notFoundContent="추출된 필드 없음"
                      />
                    ) : (
                      <>
                        <Select
                          size="small"
                          style={{ width: 120 }}
                          value={v.format ?? 'yyyymmdd'}
                          onChange={(f) => updateKeyVar(v.segmentIndex, { format: f as KeyVarDateFormat })}
                          options={KEY_VAR_DATE_FORMAT_OPTIONS}
                        />
                        <Input
                          size="small"
                          style={{ flex: 1, minWidth: 140 }}
                          value={v.name}
                          onChange={(e) => updateKeyVarName(v.segmentIndex, e.target.value)}
                          allowClear
                          placeholder="파라미터 이름 → {name} (예: baseDate)"
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null;

    // 카드 활성/비활성 시각 분리. 편집 모드에서는 비선택 카드를 클릭 불가(disabled)로 명시
    const cardClass = (selected: boolean) => {
      if (selected)
        return 'block w-full text-left rounded-lg border-2 p-4 transition-all cursor-pointer border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/40 ring-2 ring-[var(--color-bt-primary)]/30 shadow-md';
      if (isEdit) return 'block w-full text-left rounded-lg border-2 p-4 border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 opacity-50 cursor-not-allowed';
      return 'block w-full text-left rounded-lg border-2 p-4 transition-all cursor-pointer border-[var(--color-bt-border)] bg-white opacity-60 hover:opacity-100 hover:border-[var(--color-bt-primary)]/60';
    };

    const selectedBadge = (
      <span className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
        <CheckCircle2 className="h-3 w-3" /> 선택됨
      </span>
    );

    // REDIS/QUERY 공통 검증 버튼
    const validateButton = (
      <Button
        type="primary"
        icon={sourceValidated ? <CheckCircle2 className="size-6" /> : <Play className="w-4 h-4 fill-current" />}
        loading={isValidating}
        onClick={handleValidateSource}
        className="!h-9 !w-[170px] !font-semibold shadow-md ring-2 ring-[var(--color-bt-primary)]/25 hover:ring-[var(--color-bt-primary)]/40"
      >
        {sourceValidated ? '검증 완료' : '데이터 소스 검증'}
      </Button>
    );

    // 본문은 자연 높이로 흐르고 넘치면 외곽 컨테이너가 스크롤 (shrink-0으로 입력 영역 압축 방지)
    return (
      <div className="shrink-0 px-7 pt-7 pb-3">
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="datasetCode"
              label="데이터셋 코드"
              required
              hasFeedback
              rules={[
                { required: true, message: '데이터셋 코드를 입력해 주세요.' },
                { whitespace: true, message: '데이터셋 코드를 입력해 주세요.' },
                { pattern: /^[a-z0-9_]+$/, message: '영문 소문자·숫자·언더스코어(_)만 입력 가능합니다.' },
                { max: 60, message: '60자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="예: dept_call_status" className="font-mono" size="large" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="datasetName"
              label="데이터셋 이름"
              required
              hasFeedback
              rules={[
                { required: true, message: '데이터셋 이름을 입력해 주세요.' },
                { whitespace: true, message: '데이터셋 이름을 입력해 주세요.' },
                { max: 120, message: '120자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="예: 부서별 통화 현황" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자까지 입력 가능합니다.' }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} showCount placeholder="이 데이터셋의 용도·범위를 간단히 (목록 카드에 표시됩니다)" />
        </Form.Item>

        <Divider />

        {/* 태그 — 도메인 대체. 검증/요약 연동 위해 값은 hidden Form.Item에 보관 (도메인 카드 패턴 계승) */}
        <Form.Item name="tags" hidden>
          <Input />
        </Form.Item>
        <div className="mb-2 text-sm font-medium">태그</div>
        <TagInput value={(formValues?.tags as string[]) ?? []} onChange={(tags) => form.setFieldsValue({ tags })} maxTags={5} />
        <div className="mt-1.5 text-xs text-[var(--color-bt-fg-muted)]">분류·검색에 사용됩니다. Enter 또는 쉼표로 여러 개 추가 — 최대 5개</div>

        <Divider>데이터 소스</Divider>

        {/* ── 데이터 소스 (REDIS / QUERY / EXTERNAL) — 기존 데이터셋 스텝 통합 ── */}
        {/* baseType / schemaSnapshot은 hidden Form.Item으로 form에 저장. 입력 컴포넌트가 별도로 onChange */}
        <Form.Item name="baseType" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="schemaSnapshot"
          hidden
          rules={[
            { required: baseType !== 'EXTERNAL', message: `${baseType === 'REDIS' ? 'Redis 키 패턴' : 'SQL 쿼리'}를 입력해 주세요.` },
            { whitespace: baseType !== 'EXTERNAL', message: '내용을 입력해 주세요.' },
          ]}
        >
          <Input />
        </Form.Item>
        {/* 값 모드 — 입력 UI는 없애고, REDIS 키 선택 시 자동 감지값을 저장만 한다 */}
        <Form.Item name="valueMode" hidden>
          <Input />
        </Form.Item>

        {/* 소스 유형 선택 카드. 편집 모드에서만 안내 노출(헤더 라벨 제거로 영역 확보) */}
        {isEdit && <div className="mb-2 text-[11px] text-[var(--color-bt-fg-muted)]">기존 데이터셋의 소스 타입은 변경할 수 없습니다 — 필드 추가/수정만 가능</div>}
        <Row gutter={16} className="!mb-3">
          <Col span={8}>
            <button type="button" disabled={isEdit && baseType !== 'REDIS'} onClick={() => handleBaseTypeChange('REDIS')} className={cardClass(baseType === 'REDIS')}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">REDIS</span>
                  <span className="text-[13px] font-semibold">실시간 데이터</span>
                </div>
                {baseType === 'REDIS' && selectedBadge}
              </div>
              <p className="text-[11px] leading-snug text-gray-500">실시간 모니터링 데이터(Redis). 키를 선택하면 필드가 자동으로 채워집니다.</p>
            </button>
          </Col>
          <Col span={8}>
            <button type="button" disabled={isEdit && baseType !== 'QUERY'} onClick={() => handleBaseTypeChange('QUERY')} className={cardClass(baseType === 'QUERY')}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">QUERY</span>
                  <span className="text-[13px] font-semibold">데이터베이스 조회</span>
                </div>
                {baseType === 'QUERY' && selectedBadge}
              </div>
              <p className="text-[11px] leading-snug text-gray-500">DB 테이블·뷰를 SQL로 조회해 구성합니다. 조회(SELECT)만 가능하며, 검증하면 컬럼이 자동으로 채워집니다.</p>
            </button>
          </Col>
          <Col span={8}>
            {/* EXTERNAL — 고도화 예정(미구현). 항상 비활성 */}
            <div className="block w-full cursor-not-allowed rounded-lg border-2 border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-4 opacity-70">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-bt-fg-muted)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">EXTERNAL</span>
                  <span className="text-[13px] font-semibold text-[var(--color-bt-fg-muted)]">외부 API 연동</span>
                </div>
                <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-fg-muted)]">고도화 예정</span>
              </div>
              <p className="text-[11px] leading-snug text-[var(--color-bt-fg-muted)]">외부 API 응답으로 데이터셋 구성. 현재는 미구현 — 추후 고도화 시 제공됩니다.</p>
            </div>
          </Col>
        </Row>

        {/* ── REDIS 입력 — 키 선택 시 필드 자동 채움(검증 버튼 없음) ──
            소스 타입 카드(REDIS↔QUERY) 전환 시 언마운트→재마운트로 키가 재조회되는 것을 막기 위해
            항상 마운트하고 CSS(hidden)로만 숨긴다. 숨겨진 동안에는 value=''로 두어 키 스키마 조회도 막는다. */}
        <div className={baseType === 'REDIS' ? '' : 'hidden'}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-700">Redis 키</span>
            <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">REDIS</span>
            <span className="text-[11px] text-gray-500">키 선택 → 우측에서 필드 확인 → 변수가 있으면 맨 우측 열에서 할당합니다.</span>
          </div>
          {/* 선택한 키의 사전 표시명/설명 — 사전에 등록된 키일 때만 노출 */}
          {(keyInfo.name || keyInfo.desc) && (
            <div className="mb-2 flex items-start gap-2 rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--color-bt-primary)]" />
              <div className="min-w-0 text-[11.5px] leading-snug">
                {keyInfo.name && <span className="font-semibold text-gray-700">{keyInfo.name}</span>}
                {keyInfo.name && keyInfo.desc && <span className="mx-1 text-gray-300">·</span>}
                {keyInfo.desc && <span className="text-gray-500">{keyInfo.desc}</span>}
              </div>
            </div>
          )}
          {/* 좌→우 3열: 키 목록 | 필드 스키마 | 키 변수(변수 있을 때). QUERY(560)와 동일한 고정 높이 — 넘치면 스텝 본문이 스크롤된다. */}
          <div className="h-[560px]">
            <RedisTreeExplorer
              value={baseType === 'REDIS' ? toScanBasePattern(text) : ''}
              onChange={handleSchemaChange}
              onSchemaLoaded={handleRedisSchemaLoaded}
              keyVarSlot={keyVarSlotNode}
            />
          </div>
        </div>

        {/* ── QUERY 입력 — 좌: SQL 쿼리 / 우: 필드 스키마(검증 시 표시) ── 스크롤 컨텍스트라 고정 높이 사용 */}
        {baseType === 'QUERY' && (
          <div className="flex h-[560px] gap-3 overflow-hidden">
            {/* 좌측: SQL 쿼리 */}
            <div className="flex w-1/2 min-w-0 flex-col">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-gray-700">SQL 쿼리</span>
                  <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">QUERY</span>
                  <span className="text-[11px] text-gray-500">SELECT-only · 다중 문장 금지</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button icon={<Wand2 className="w-4 h-4" />} onClick={handleFormatSource} className="!h-9">
                    정렬
                  </Button>
                  {validateButton}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded border border-[var(--color-bt-border)]">
                <CodeMirror
                  value={text}
                  onChange={handleSchemaChange}
                  extensions={[sql() as Extension]}
                  height="100%"
                  className="h-full"
                  placeholder="SELECT col1, col2 FROM ... WHERE ..."
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true }}
                />
              </div>
              <div className="mt-1 flex items-center justify-end text-[11px]">
                <span className="font-mono text-[var(--color-bt-fg-muted)]">
                  {text.split('\n').length} lines · {(text.length / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
            {/* 우측: 필드 스키마 */}
            <div className="flex w-1/2 min-w-0 flex-col overflow-hidden rounded border border-[var(--color-bt-border)]">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 px-3 py-2">
                <span className="text-[11px] font-semibold text-gray-500">필드 스키마</span>
                {queryColumns.length > 0 && <span className="text-[11px] text-gray-400">{queryColumns.length}개 컬럼</span>}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {isValidating ? (
                  <p className="p-3 text-[11.5px] text-gray-400">검증 중…</p>
                ) : queryColumns.length === 0 ? (
                  <p className="p-3 text-[11.5px] text-gray-400">“데이터 소스 검증”을 실행하면 필드명·데이터타입·코멘트가 표시됩니다.</p>
                ) : (
                  <FieldSchemaList columns={queryColumns} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EXTERNAL — 미구현 안내 ── */}
        {baseType === 'EXTERNAL' && (
          <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-8 text-center">
            <p className="text-[13px] font-semibold text-[var(--color-bt-fg-muted)]">외부 API 연동은 아직 지원되지 않습니다.</p>
            <p className="mt-1 text-[11.5px] text-[var(--color-bt-fg-muted)]/80">추후 고도화 단계에서 제공될 예정입니다. REDIS 또는 QUERY 소스를 선택하세요.</p>
          </div>
        )}
      </div>
    );
  }

  // ────────── Step 3: 컬럼 구성 + 계산필드 (통계 WizardStepB 패턴) ──────────
  function renderStep3() {
    const fields = (formValues?.fields as DatasetField[]) ?? [];
    const calcFields = (formValues?.calcFields as CalcField[]) ?? [];

    // DnD 정렬 결과 반영용 — 그룹별 분리 정렬
    const dimFields = [...fields.filter((f) => f.classification === 'DIM')].sort((a, b) => a.orderNo - b.orderNo);
    const msrFields = [...fields.filter((f) => f.classification === 'MSR')].sort((a, b) => a.orderNo - b.orderNo);

    // 좌측 팔레트 — 노출(isVisible) 필드만 표시 + 검색 필터
    const matchesSearch = (f: DatasetField) =>
      !paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || (f.displayName ?? '').toLowerCase().includes(paletteSearch.toLowerCase());
    const paletteDim = dimFields.filter((f) => f.isVisible && matchesSearch(f));
    const paletteMsr = msrFields.filter((f) => f.isVisible && matchesSearch(f));

    const lookups = (formValues?.lookups as DatasetLookup[]) ?? [];

    return (
      <>
        <Form.Item name="fields" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="calcFields" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="lookups" hidden>
          <Input />
        </Form.Item>

        {calcEditing ? (
          /* 계산필드 편집 — 통계 WizardStepB처럼 패널을 대체하는 인라인 풀스크린(드로어 아님) */
          <div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-5">
            <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-bt-fg-muted)]">
              <button type="button" className="text-[var(--color-bt-primary)] hover:underline" onClick={() => setCalcEditing(null)}>
                ← 필드 구성
              </button>
              <span>/</span>
              <span>{calcEditing.mode === 'add' ? '새 계산필드' : `편집: ${calcEditing.initial?.fieldName ?? ''}`}</span>
            </div>
            <CalcFieldEditor
              baseFields={(form.getFieldValue('fields') as DatasetField[]) ?? []}
              existingCalcFields={(form.getFieldValue('calcFields') as CalcField[]) ?? []}
              initialValue={calcEditing.initial}
              onSave={handleCalcSave}
              onCancel={() => setCalcEditing(null)}
            />
          </div>
        ) : (
          /* 통계 WizardStepB 골격 — 좌측 팔레트 + 우측 메인 그리드. flex-1 + min-h-0으로 본문 가용 공간 전체 채움 */
          <div className="flex flex-1 min-h-0">
            {/* ── 좌측: 노출 필드 팔레트 ── */}
            <aside className="w-64 shrink-0 border-r border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/20 p-4 overflow-y-auto">
              <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-4" />

              {/* 디멘션 */}
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                  <span>디멘션</span>
                  <span className="ml-auto font-mono text-[10px]">{paletteDim.length}</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd('DIM')}>
                  <SortableContext items={paletteDim.map((f) => f.fieldName)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {paletteDim.map((f) => (
                        <SortableItem key={f.fieldName} id={f.fieldName}>
                          {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                            <div
                              ref={setNodeRef}
                              style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-bt-bg-muted)]/50 rounded cursor-default"
                            >
                              <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                                ⋮⋮
                              </span>
                              <span className="font-mono font-medium flex-1 truncate">{f.fieldName}</span>
                            </div>
                          )}
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {paletteDim.length === 0 && <div className="px-2 py-1 text-[11px] text-[var(--color-bt-fg-muted)]/60">노출된 디멘션 없음</div>}
              </div>

              {/* 측정값 */}
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                  <span>측정값</span>
                  <span className="ml-auto font-mono text-[10px]">{paletteMsr.length}</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd('MSR')}>
                  <SortableContext items={paletteMsr.map((f) => f.fieldName)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {paletteMsr.map((f) => (
                        <SortableItem key={f.fieldName} id={f.fieldName}>
                          {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                            <div
                              ref={setNodeRef}
                              style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                              className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-bt-primary-soft)]/30 hover:bg-[var(--color-bt-primary-soft)]/50 rounded cursor-default"
                            >
                              <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                                ⋮⋮
                              </span>
                              <span className="font-mono font-medium flex-1 truncate">{f.fieldName}</span>
                            </div>
                          )}
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {paletteMsr.length === 0 && <div className="px-2 py-1 text-[11px] text-[var(--color-bt-fg-muted)]/60">노출된 측정값 없음</div>}
              </div>

              {/* 룩업 (가상) — 소스 필드별 그룹, 자식은 들여쓰기로 표현. border 없이 색상·여백만 사용 */}
              {lookups.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                    <span>룩업 (가상)</span>
                    <span className="ml-auto font-mono text-[10px]">{lookups.reduce((sum, l) => sum + l.fields.length, 0)}</span>
                  </div>
                  <div className="space-y-2">
                    {lookups.map((lookup, idx) => {
                      const virtualForLookup = fields.filter((f) => f.isVirtual && f.parentField === lookup.sourceField);
                      return (
                        <div key={idx}>
                          {/* 부모 — 소스 필드 → 마스터 */}
                          <div className="flex items-center gap-1.5 px-2 py-1 text-sm rounded hover:bg-sky-50">
                            <span className="font-mono font-semibold text-sky-700 truncate">{lookup.sourceField}</span>
                            <span className="text-sky-400 text-[10px]">↗</span>
                            <Tooltip title={lookup.catalogTableName ?? lookup.catalogDisplayName ?? ''} placement="top">
                              <span className="ml-auto truncate text-[10px] text-[var(--color-bt-fg-muted)]">{lookup.catalogDisplayName ?? '—'}</span>
                            </Tooltip>
                          </div>
                          {/* 자식 — 들여쓰기로 표시 */}
                          {virtualForLookup.length > 0 && (
                            <div className="mt-0.5 pl-4 space-y-0.5">
                              {virtualForLookup.map((vf) => (
                                <div key={vf.fieldName} className="flex items-center gap-1.5 px-2 py-0.5 text-[12.5px] rounded hover:bg-sky-50/70">
                                  <span className="text-sky-300 text-[10px]">↳</span>
                                  <span className="font-mono flex-1 truncate">{vf.fieldName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 계산식 */}
              {calcFields.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                    <span>계산식</span>
                    <span className="ml-auto font-mono text-[10px]">{calcFields.length}</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleCalcDragEnd}>
                    <SortableContext items={calcFields.map((c) => c.fieldName)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-0.5">
                        {calcFields.map((c) => (
                          <SortableItem key={c.fieldName} id={c.fieldName}>
                            {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                              <div
                                ref={setNodeRef}
                                style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded bg-green-50 hover:bg-green-100/60 cursor-default"
                              >
                                <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                                  ⋮⋮
                                </span>
                                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white">ƒ</span>
                                <span className="font-mono font-medium flex-1 truncate text-green-700">{c.fieldName}</span>
                              </div>
                            )}
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </aside>

            {/* ── 우측: 컬럼 구성 그리드 (전체 차지) ── */}
            <div className="flex-1 bg-white min-w-0 flex flex-col p-5">
              <FieldConfigGrid
                form={form}
                fields={fields}
                calcFields={calcFields}
                lookups={lookups}
                gridOptions={gridOptions}
                onCalcAdd={() => setCalcEditing({ mode: 'add' })}
                onCalcEdit={(calc) => setCalcEditing({ mode: 'edit', initial: calc })}
                onCalcDelete={handleCalcDelete}
                onLookupAdd={handleLookupAdd}
                onLookupEdit={handleLookupEdit}
                onLookupDelete={handleLookupDelete}
              />
            </div>
            {/* /우측 메인 */}
          </div>
        )}
      </>
    );
  }

  // ────────── Footer ──────────
  function renderFooter() {
    const isLast = currentStep === steps.length - 1;
    return (
      <div className="flex items-center justify-center gap-3">
        <Button onClick={currentStep === 0 ? () => navigate('/insight/monitoring/datasets') : handlePrev}>{currentStep === 0 ? '취소' : '이전'}</Button>
        {isLast ? (
          <Button type="primary" onClick={handleSubmitBtn} loading={isCreating || isUpdating}>
            {isEdit ? '수정 저장' : '저장'}
          </Button>
        ) : (
          <Button type="primary" onClick={handleNext}>
            다음
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
          <Steps
            current={currentStep}
            items={steps.map((step) => ({ title: step.title }))}
            size="small"
            className="max-w-10/12 min-w-1/3"
            style={{ width: `${steps.length * 250}px` }}
            responsive={false}
          />
        </div>

        <div className="flex w-full flex-1 min-h-0">
          <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
            <div className="w-full flex-1 min-h-0 overflow-y-auto">
              <Form form={form} initialValues={initialForm} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical" className="h-full">
                {steps.map((step, index) => (
                  <div key={index} className="h-full" style={{ display: currentStep === index ? 'flex' : 'none', flexDirection: 'column' }}>
                    {step.content()}
                  </div>
                ))}
              </Form>
            </div>
            {/* 계산필드 인라인 편집 중에는 위저드 푸터 숨김 (에디터가 자체 취소/저장 제공) */}
            {!calcEditing && <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">{renderFooter()}</div>}
          </div>
        </div>
      </div>

      {/* 코드 룩업 추가/편집 Drawer — manager MenuCreateDrawer 패턴 (ref 기반) */}
      <LookupEditDrawer
        ref={lookupDrawerRef}
        baseFields={(formValues?.fields as DatasetField[]) ?? []}
        existingLookups={(formValues?.lookups as DatasetLookup[]) ?? []}
        onOk={handleLookupOk}
      />

      {/* 데이터 소스 검증 결과 모달 — 실패·경고 시에만 노출 */}
      <SourceValidationResultModal ref={validationModalRef} />
    </>
  );
}
