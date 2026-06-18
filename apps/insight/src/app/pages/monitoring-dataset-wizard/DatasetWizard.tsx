import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, Col, Divider, Drawer, Form, type FormInstance, type FormProps, Input, Row, Select, Steps, Tag, Tooltip, Upload } from 'antd';
import { Check, CheckCircle2, Edit2, Play, Plus, Trash2, Upload as UploadIcon, Wand2, X } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SourceValidationResultModal, { type SourceValidationResultModalRef } from './SourceValidationResultModal';
import CalcFieldEditor from '../../features/monitoring/components/calcfield/CalcFieldEditor';
import LookupEditDrawer, { type LookupEditDrawerRef } from '../../features/monitoring/components/lookup/LookupEditDrawer';
import { COLUMN_FORMAT_OPTIONS, DOMAIN_OPTIONS } from '../../features/monitoring/constants/monitoringConstants';
import {
  monitoringDatasetKeys,
  useCreateMonitoringDataset,
  useGetMonitoringDataset,
  useUpdateMonitoringDataset,
  useValidateMonitoringDatasetSource,
} from '../../features/monitoring/hooks/useDatasetQueries';
import type { CalcField, ColumnFormat, DatasetBaseType, DatasetCreateDatas, DatasetField, DatasetLookup, DomainCode, FieldDataType } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const SAMPLE_XML = `<DATA_SET ds_name="DS_GROUP_MON"
          tb_name="TB_RM_IC_GROUPMONITOR"
          rd_name="IC:GROUP:TENANT:NODE:#MEDIA_TYPE"
          rd_key_prefix="IC:GROUP:TENANT:NODE:"
          rd_key_value="MEDIA_TYPE"
          rd_field="TENANT_ID,NODE_ID,ORG_DNIS"
          rd_type="info"
          sqlite="true"
          process_method="sql"
          data_reset="false">
    <COL ds_col="CENTER_ID"      tb_col="CENTER_ID"      rd_col="CENTER_ID"      type="num"    len=10></COL>
    <COL ds_col="SLEE_TENANT_ID" tb_col="TENANT_ID"      rd_col="TENANT_ID"      type="num"    len=10 fill_zero="yes"></COL>
    <COL ds_col="NODE_ID"        tb_col="NODE_ID"        rd_col="NODE_ID"        type="num"    len=6  fill_zero="yes"></COL>
    <COL ds_col="ORG_DNIS"       tb_col="ORG_DNIS"       rd_col="ORG_DNIS"       type="str"    len=50></COL>
    <COL ds_col="CHNL_BUSY"      tb_col="CHNL_BUSY"      rd_col="CHNL_BUSY"      type="num"    len=10 option="bulk"></COL>
    <COL ds_col="DB_UPDATE_TIME" tb_col="DB_UPDATE_TIME" rd_col="DB_UPDATE_TIME" type="s_date" len=0></COL>
</DATA_SET>`;

interface DatasetWizardForm {
  datasetCode: string;
  datasetName: string;
  domainCode: DomainCode;
  description?: string;
  baseType: DatasetBaseType;
  schemaSnapshot: string;
  fields: DatasetField[];
  calcFields: CalcField[];
  lookups: DatasetLookup[];
}

const initialForm: DatasetWizardForm = {
  datasetCode: '',
  datasetName: '',
  domainCode: 'IE',
  description: '',
  baseType: 'XML',
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
        columnName: lf.outputFieldName,
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

// 운영 <DATA_SET> XML 정렬 — well-formed가 아닌 운영 cfg(len=10 unquoted)도 그대로 정렬되도록 regex 기반
const formatXml = (text: string): string => {
  let xml = text.trim();
  if (!xml) return xml;
  // 1. 태그 내부 줄바꿈/연속공백을 단일 공백으로 정리해 한 줄로 모음
  xml = xml.replace(/<([^>]+)>/g, (_, inner) => `<${inner.replace(/\s+/g, ' ').trim()}>`);
  // 2. 태그 사이 공백/줄바꿈을 단일 줄바꿈으로
  xml = xml.replace(/>\s*</g, '>\n<');

  const INDENT = '    ';
  let depth = 0;
  return xml
    .split('\n')
    .map((raw) => {
      const line = raw.trim();
      if (!line) return '';
      if (line.startsWith('</')) {
        depth = Math.max(0, depth - 1);
        return INDENT.repeat(depth) + line;
      }
      const isSelfClosing = line.endsWith('/>');
      const hasInlineClose = /<\/[^>]+>$/.test(line);
      const isProlog = line.startsWith('<?') || line.startsWith('<!');
      const indented = INDENT.repeat(depth) + line;
      if (!isSelfClosing && !hasInlineClose && !isProlog) depth++;
      return indented;
    })
    .filter(Boolean)
    .join('\n');
};

// 운영 <DATA_SET> 파싱 — <COL>의 rd_col + type 으로 필드 추출 (ds_col/tb_col/len/fill_zero/option은 버림)
// 운영 XML은 well-formed가 아니므로(len=10 따옴표 없음) regex 기반 파싱
const parseXmlCols = (xml: string): DatasetField[] => {
  // <COL ... /> 또는 <COL ...></COL> 양쪽 형태 매칭
  const colRegex = /<COL\s+([^>]+?)\s*(?:\/>|><\/COL>)/g;
  const fields: DatasetField[] = [];
  let order = 0;
  let m: RegExpExecArray | null;
  while ((m = colRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const rdCol = attrs.match(/\brd_col\s*=\s*"([^"]+)"/)?.[1];
    const typeRaw = attrs.match(/\btype\s*=\s*"([^"]+)"/)?.[1];
    if (!rdCol || !typeRaw) continue;

    // type 매핑: num/float → NUMBER, str → STRING, s_date → DATETIME
    const dataType: DatasetField['dataType'] = typeRaw === 'num' || typeRaw === 'float' ? 'NUMBER' : typeRaw === 'str' ? 'STRING' : typeRaw === 's_date' ? 'DATETIME' : 'STRING';
    // columnFormat: float만 Decimal로 구분
    const columnFormat: ColumnFormat = typeRaw === 'float' ? 'Decimal' : typeRaw === 'num' ? 'Number' : typeRaw === 's_date' ? 'Date' : 'String';

    fields.push({
      columnName: rdCol,
      classification: 'DIM', // 모니터링 XML에 DIM/MSR 구분 없음 — 사용자가 Step 3에서 조정
      displayName: rdCol, // 운영 XML에 label 없음 — 사용자가 Step 3에서 한글명 입력
      dataType,
      columnFormat,
      isVisible: true, // 모니터링 기본 — 모든 컬럼 노출, 사용자가 빼고 싶은 것만 체크 해제
      orderNo: order++,
    });
  }
  return fields;
};

// 통계 WizardStepB의 SortableItem 헬퍼 — children에 useSortable 결과를 그대로 넘김
function SortableItem({ id, children }: { id: string; children: (s: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return <>{children(sortable)}</>;
}

// ────────── FieldConfigGrid — 필드 구성 그리드만 분리 ──────────
// 분리 목적:
//  1) useMemo로 columnDefs/unifiedRows 캐싱 → 사용 체크박스 토글 시 ag-grid 전체 재렌더 회피 (버벅임 제거)
//  2) Form.useWatch('fields'/'calcFields', form)로 정확히 watch → 계산필드 추가/삭제 즉시 반영
//  3) wizard 본체의 Form.useWatch([], form) 트리거에 영향받지 않음
interface UnifiedFieldRow {
  rowId: string;
  source: 'BASE' | 'CALC' | 'VIRTUAL';
  classification: 'DIM' | 'MSR';
  columnName: string;
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

  const visibleCount = useMemo(() => fields.filter((f) => f.isVisible).length, [fields]);

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
        rowId: isVirt ? `virtual:${f.columnName}` : `base:${f.columnName}`,
        source: isVirt ? 'VIRTUAL' : 'BASE',
        classification: f.classification,
        columnName: f.columnName,
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
      rowId: `calc:${c.fieldCode}`,
      source: 'CALC',
      classification: c.classification,
      columnName: c.fieldCode,
      displayName: c.displayName,
      dataType: c.dataType,
      columnFormat: c.columnFormat,
      isVisible: c.isVisible ?? true, // CALC도 BASE처럼 노출 토글 가능. 구버전 데이터는 기본 true
      rowExpression: c.rowExpression,
    }));
    // 표시 순서: BASE → VIRTUAL → CALC (룩업 결과는 원본 필드 그룹 옆에 보이도록)
    return [...base, ...virtual, ...calc];
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
      form.setFieldsValue({ fields: current.map((f) => (f.columnName === columnName ? { ...f, ...patch } : f)) });
    },
    [form],
  );
  const updateCalc = useCallback(
    (fieldCode: string, patch: Partial<CalcField>) => {
      const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
      form.setFieldsValue({ calcFields: current.map((c) => (c.fieldCode === fieldCode ? { ...c, ...patch } : c)) });
    },
    [form],
  );
  // cellRenderer에서 source 분기 → 적절한 updater 호출 헬퍼. patch는 양쪽 entity 공통 키만 노출
  const updateRow = useCallback(
    (row: UnifiedFieldRow, patch: { classification?: 'DIM' | 'MSR'; displayName?: string; columnFormat?: ColumnFormat; isVisible?: boolean }) => {
      if (row.source === 'BASE') updateBase(row.columnName, patch as Partial<DatasetField>);
      else updateCalc(row.columnName, patch as Partial<CalcField>);
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
        field: 'isVisible',
        headerName: '사용',
        width: 56,
        editable: false,
        sortable: false,
        suppressHeaderMenuButton: true,
        cellStyle: centerCellStyle,
        headerClass: 'ag-header-cell-center',
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          // VIRTUAL 행은 항상 노출 (룩업이 정의되어 있으면 결과는 보여야 함). BASE/CALC는 토글 가능
          if (data.source === 'VIRTUAL') return <Checkbox checked disabled />;
          return <Checkbox checked={!!params.value} onChange={(e) => updateRow(data, { isVisible: e.target.checked })} />;
        },
      },
      {
        headerName: '유형',
        width: 96,
        editable: false,
        sortable: false,
        suppressHeaderMenuButton: true,
        cellStyle: centerCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          if (data.source === 'CALC') {
            return (
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
                <Tag color="success" className="!m-0 cursor-help">
                  계산식
                </Tag>
              </Tooltip>
            );
          }
          if (data.source === 'VIRTUAL') {
            return (
              <Tooltip title={`코드 룩업 결과 — 소스 필드 ${data.parentField ?? '—'}`} placement="topLeft">
                <Tag color="processing" className="!m-0 cursor-help">
                  룩업
                </Tag>
              </Tooltip>
            );
          }
          return <Tag className="!m-0">일반</Tag>;
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
        field: 'columnName',
        headerName: '컬럼명',
        flex: 1,
        minWidth: 180,
        editable: false,
        cellStyle: startCellStyle,
        cellRenderer: (params: ICellRendererParams<UnifiedFieldRow>) => {
          const data = params.data;
          if (!data) return null;
          return <span className="font-mono font-semibold truncate">{data.columnName}</span>;
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
            <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold" style={{ background: 'var(--color-bt-bg-muted)', color: 'var(--color-bt-fg-muted)' }}>
              {v}
            </span>
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
            const calc = (form.getFieldValue('calcFields') as CalcField[])?.find((c) => c.fieldCode === data.columnName);
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
                  onClick={() => onCalcDelete(calc.fieldCode)}
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
    [form, updateRow, onCalcEdit, onCalcDelete, onLookupEdit, onLookupDelete],
  );

  const baseCount = fields.filter((f) => !f.isVirtual).length;
  const virtualCount = fields.filter((f) => f.isVirtual).length;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">필드 구성</span>
        <span className="text-xs text-[var(--color-bt-fg-muted)]">— 노출할 필드를 선택하고 분류·서식·표시명을 지정하세요</span>
        <span className="ml-auto inline-flex items-center gap-3">
          <span className="text-xs text-[var(--color-bt-fg-muted)]">
            노출 <span className="font-semibold text-[var(--color-bt-primary)]">{visibleCount}</span> / {baseCount}
            {virtualCount > 0 && (
              <>
                <span className="mx-1.5 text-[var(--color-bt-border)]">·</span>
                룩업 가상 <span className="font-semibold text-[var(--color-bt-primary)]">{virtualCount}</span>
              </>
            )}
            {calcFields.length > 0 && (
              <>
                <span className="mx-1.5 text-[var(--color-bt-border)]">·</span>
                계산필드 <span className="font-semibold text-[var(--color-bt-success)]">{calcFields.length}</span>
              </>
            )}
          </span>
          <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={onLookupAdd}>
            룩업 추가
          </Button>
          <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={onCalcAdd}>
            계산필드 추가
          </Button>
        </span>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <AgGridReact<UnifiedFieldRow>
          ref={gridRef}
          rowData={unifiedRows}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          // 공통 gridOptions는 페이지네이션(20) + statusBar(페이지네이션 패널) 기본.
          // 데이터셋 필드 구성은 전체 한눈에 + 스크롤로 보는 게 자연스러워 둘 다 끔.
          pagination={false}
          statusBar={{ statusPanels: [] }}
          getRowId={(p) => p.data.rowId}
          getRowClass={(p) => (p.data?.source === 'CALC' ? 'bg-[var(--color-bt-success-soft)]/30' : p.data?.source === 'VIRTUAL' ? 'bg-[var(--color-bt-primary-soft)]/20' : '')}
          overlayNoRowsTemplate="이전 단계에서 데이터 소스를 검증하면 컬럼이 자동으로 로드됩니다."
        />
      </div>
    </div>
  );
}

// 요약 패널 헬퍼
const getOptionLabel = (options: { label: string; value: string }[], value: string | null | undefined) => {
  if (value === null || value === undefined) return null;
  return options.find((opt) => opt.value === value)?.label ?? value;
};
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [calcEditing, setCalcEditing] = useState<{ mode: 'add' | 'edit'; initial?: CalcField } | null>(null);
  /** 코드 룩업 Drawer ref — open/close 명령형 호출 */
  const lookupDrawerRef = useRef<LookupEditDrawerRef>(null);

  // Step 2 데이터 소스 검증 상태 — true가 되어야 다음 단계로 진행 가능
  // schemaSnapshot/baseType이 바뀌면 자동으로 false로 리셋
  // 편집 모드에서 첫 로드 시점에는 기존 schemaSnapshot이 이미 한 번 검증된 상태이므로 true로 시작
  const [sourceValidated, setSourceValidated] = useState(false);
  // 검증 결과 모달 — 실패·경고 시에만 노출 (통과+경고없음은 토스트만)
  const validationModalRef = useRef<SourceValidationResultModalRef>(null);

  // 편집 모드 — 기존 데이터셋 로드
  const { data: detail } = useGetMonitoringDataset({ params: { datasetId }, queryOptions: { enabled: isEdit, retry: false } });

  // 편집 진입 시 폼 초기화 + 기존 데이터 소스는 이미 검증된 상태로 간주 (사용자가 수정하면 handleSchemaChange에서 false로 무효화)
  useEffect(() => {
    if (detail) {
      form.setFieldsValue({
        datasetCode: detail.datasetCode,
        datasetName: detail.datasetName,
        domainCode: detail.domainCode,
        description: detail.description ?? '',
        baseType: detail.baseType,
        schemaSnapshot: detail.schemaSnapshot,
        fields: detail.fields,
        calcFields: detail.calcFields,
        lookups: detail.lookups ?? [],
      });
      setSourceValidated(true);
    }
  }, [detail, form]);

  // 폼 값 실시간 추적 (요약 패널 + step 검증)
  const formValues = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFieldErrors({}))
      .catch((errorInfo) => {
        const errors: Record<string, string[]> = {};
        errorInfo.errorFields?.forEach((f: { name: string[]; errors: string[] }) => {
          const fieldName = f.name[0];
          errors[fieldName] = f.errors;
        });
        setFieldErrors(errors);
      });
  }, [formValues, form]);

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

  // 스키마 변경 — XML이면 필드 자동 추출, SQL이면 필드는 사용자가 직접 입력(Phase 1)
  // 스키마가 바뀌면 검증 상태 무효화 (재검증 강제)
  const handleSchemaChange = (text: string) => {
    const baseType = form.getFieldValue('baseType') as DatasetBaseType;
    if (baseType === 'XML') {
      form.setFieldsValue({ schemaSnapshot: text, fields: parseXmlCols(text) });
    } else {
      form.setFieldsValue({ schemaSnapshot: text });
    }
    setSourceValidated(false);
  };

  const handleLoadSampleXml = () => {
    form.setFieldsValue({ schemaSnapshot: SAMPLE_XML, fields: parseXmlCols(SAMPLE_XML) });
    setSourceValidated(false);
    toast.success('샘플 XML이 로드되었습니다.');
  };

  // 정렬 — XML/SQL 양쪽 모두 지원. 성공 시 토스트 없이 조용히 적용. 정렬은 스키마 변경이므로 검증 상태 무효화
  const handleFormatSource = () => {
    const baseType = form.getFieldValue('baseType') as DatasetBaseType;
    const current = ((form.getFieldValue('schemaSnapshot') as string) ?? '').trim();
    if (!current) return;
    try {
      const formatted = baseType === 'SQL' ? formatSql(current, { language: 'plsql', keywordCase: 'upper', tabWidth: 2 }) : formatXml(current);
      form.setFieldsValue({ schemaSnapshot: formatted });
      setSourceValidated(false);
    } catch (e) {
      Log.warn('format failed', e);
      toast.error(`${baseType} 정렬 실패 — 구문을 확인하세요.`);
    }
  };

  // 베이스 카드 선택 — 전환 시 입력된 스키마/필드 + 검증 상태 초기화. 편집 모드에서는 변경 불가
  const handleBaseTypeChange = (next: DatasetBaseType) => {
    if (isEdit) return; // 기존 데이터셋의 베이스 타입은 변경 불가
    const current = form.getFieldValue('baseType') as DatasetBaseType;
    if (current === next) return;
    form.setFieldsValue({ baseType: next, schemaSnapshot: '', fields: [] });
    setSourceValidated(false);
  };

  // 데이터 소스 검증 mutation — BE 호출 결과로 sourceValidated 결정 + SQL 베이스는 detectedColumns로 fields 자동 세팅
  const { mutate: runValidateSource, isPending: isValidating } = useValidateMonitoringDatasetSource({
    mutationOptions: {
      onSuccess: (result) => {
        const baseType = form.getFieldValue('baseType') as DatasetBaseType;
        if (result.ok) {
          setSourceValidated(true);
          // SQL dry-run으로 추출된 컬럼이 있으면 fields에 자동 세팅 (XML은 클라이언트 측 parseXmlCols로 이미 채움)
          if (baseType === 'SQL' && result.detectedColumns && result.detectedColumns.length > 0) {
            const fields: DatasetField[] = result.detectedColumns.map((c, idx) => ({
              columnName: c.columnName,
              displayName: c.columnName,
              classification: 'DIM',
              dataType: c.dataType as FieldDataType,
              columnFormat: c.columnFormat as ColumnFormat,
              isVisible: true, // 모니터링 기본 — 모든 컬럼 노출
              orderNo: idx,
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
    const oldIdx = groupItems.findIndex((f) => f.columnName === active.id);
    const newIdx = groupItems.findIndex((f) => f.columnName === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(groupItems, oldIdx, newIdx);
    const groupMin = Math.min(...groupItems.map((f) => f.orderNo));
    form.setFieldsValue({
      fields: current.map((f) => {
        if (f.classification !== group) return f;
        const pos = reordered.findIndex((r) => r.columnName === f.columnName);
        return { ...f, orderNo: groupMin + pos };
      }),
    });
  };

  // 계산필드 DnD — calcFields 배열 자체를 arrayMove
  const handleCalcDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    const oldIdx = current.findIndex((c) => c.fieldCode === active.id);
    const newIdx = current.findIndex((c) => c.fieldCode === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    form.setFieldsValue({ calcFields: arrayMove(current, oldIdx, newIdx) });
  };

  // 계산필드
  const handleCalcSave = (calc: CalcField) => {
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    if (calcEditing?.mode === 'edit' && calcEditing.initial) {
      form.setFieldsValue({ calcFields: current.map((c) => (c.fieldCode === calcEditing.initial!.fieldCode ? calc : c)) });
    } else {
      form.setFieldsValue({ calcFields: [...current, calc] });
    }
    setCalcEditing(null);
  };
  const handleCalcDelete = (fieldCode: string) => {
    const current = (form.getFieldValue('calcFields') as CalcField[]) ?? [];
    form.setFieldsValue({ calcFields: current.filter((c) => c.fieldCode !== fieldCode) });
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

  // Step 정의
  const steps = [
    { title: '기본 정보', requiredFieldNames: ['datasetCode', 'datasetName', 'domainCode'], content: renderStep1 },
    { title: '데이터셋', requiredFieldNames: ['baseType', 'schemaSnapshot'], content: renderStep2 },
    { title: '필드 구성', requiredFieldNames: [], content: renderStep3 },
  ];

  const handleNext = async () => {
    try {
      await form.validateFields(steps[currentStep].requiredFieldNames);
      // Step 2 → 3 전환: BE 검증 통과 강제 + 베이스별 필드 추출 확인
      if (currentStep === 1) {
        if (!sourceValidated) {
          toast.warning('먼저 "데이터 소스 검증" 버튼을 눌러 검증을 통과해야 다음 단계로 진행할 수 있습니다.', { position: 'bottom-right' });
          return;
        }
        const fields = (form.getFieldValue('fields') as DatasetField[]) ?? [];
        const baseType = form.getFieldValue('baseType') as DatasetBaseType;
        if (fields.length === 0) {
          toast.error(
            baseType === 'XML' ? 'XML에서 <COL>을 추출하지 못했습니다. rd_col/type 속성을 확인하세요.' : 'SQL dry-run에서 컬럼을 추출하지 못했습니다. SELECT 절을 확인하세요.',
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
      domainCode: values.domainCode,
      description: values.description,
      baseType: values.baseType,
      schemaSnapshot: values.schemaSnapshot,
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
    return (
      <>
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
              <Input placeholder="예: dept_call_status" className="font-mono" disabled={isEdit} />
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
              <Input placeholder="예: 부서별 통화 현황" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={8}>
            <Form.Item name="domainCode" label="도메인" required hasFeedback rules={[{ required: true, message: '도메인을 선택해 주세요.' }]}>
              <Select options={DOMAIN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} placeholder="도메인 선택" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자까지 입력 가능합니다.' }]}>
              <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} placeholder="이 데이터셋의 용도·범위를 간단히" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // ────────── Step 2: 데이터 소스 — 베이스 선택 + 입력 ──────────
  function renderStep2() {
    const text = (formValues?.schemaSnapshot ?? '') as string;
    const baseType = (formValues?.baseType ?? 'XML') as DatasetBaseType;

    // 카드 활성/비활성 시각 분리. 편집 모드에서는 비선택 카드를 클릭 불가(disabled)로 명시
    const cardClass = (selected: boolean) => {
      if (selected)
        return 'block w-full text-left rounded-lg border-2 p-4 transition-all cursor-pointer border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/40 ring-2 ring-[var(--color-bt-primary)]/30 shadow-md';
      if (isEdit) return 'block w-full text-left rounded-lg border-2 p-4 border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 opacity-50 cursor-not-allowed';
      return 'block w-full text-left rounded-lg border-2 p-4 transition-all cursor-pointer border-[var(--color-bt-border)] bg-white opacity-60 hover:opacity-100 hover:border-[var(--color-bt-primary)]/60';
    };

    return (
      <>
        {/* baseType / schemaSnapshot은 hidden Form.Item으로 form에 저장. CodeMirror가 별도로 onChange */}
        <Form.Item name="baseType" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="schemaSnapshot"
          hidden
          rules={[
            { required: true, message: `${baseType === 'XML' ? 'XML 스키마' : 'SQL 쿼리'}를 입력해 주세요.` },
            { whitespace: true, message: '내용을 입력해 주세요.' },
          ]}
        >
          <Input />
        </Form.Item>

        {/* 베이스 유형 선택 카드 (시안 §1-A). 편집 모드에서는 변경 불가 */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-gray-700">데이터 소스</span>
          {isEdit && <span className="text-[11px] text-[var(--color-bt-fg-muted)]">기존 데이터셋의 베이스 타입은 변경할 수 없습니다 — 필드 추가/수정만 가능</span>}
        </div>
        <Row gutter={16} className="!mb-5">
          <Col span={12}>
            <button type="button" disabled={isEdit && baseType !== 'XML'} onClick={() => handleBaseTypeChange('XML')} className={cardClass(baseType === 'XML')}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">XML</span>
                  <span className="text-[13px] font-semibold">XML 임포트 (Redis)</span>
                </div>
                {baseType === 'XML' && (
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <CheckCircle2 className="h-3 w-3" /> 선택됨
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug text-gray-500">Redis 키 패턴 정의 XML을 임포트. 실시간 모니터링용. 파일 업로드 또는 직접 붙여넣기.</p>
            </button>
          </Col>
          <Col span={12}>
            <button type="button" disabled={isEdit && baseType !== 'SQL'} onClick={() => handleBaseTypeChange('SQL')} className={cardClass(baseType === 'SQL')}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">SQL</span>
                  <span className="text-[13px] font-semibold">직접 쿼리 (DB)</span>
                </div>
                {baseType === 'SQL' && (
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <CheckCircle2 className="h-3 w-3" /> 선택됨
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug text-gray-500">DB 테이블/뷰에 직접 SELECT. SELECT-only · 키워드 안전 검증. 다음 단계에서 컬럼을 수동 정의.</p>
            </button>
          </Col>
        </Row>

        {/* 입력 영역 헤더 — 라벨 + 베이스 뱃지 + 우측 액션 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-700">{baseType === 'XML' ? 'XML 스키마' : 'SQL 쿼리'}</span>
            <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{baseType}</span>
            <span className="text-[11px] text-gray-500">
              {baseType === 'XML' ? '운영 redis_table.cfg 의 <DATA_SET> 1개를 붙여넣거나 업로드 — <COL> 의 rd_col/type 이 자동 추출됩니다' : 'SELECT-only · 다중 문장 금지'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {baseType === 'XML' && (
              <>
                <Upload
                  accept=".xml,text/xml"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => handleSchemaChange(String(e.target?.result ?? ''));
                    reader.readAsText(file);
                    return false;
                  }}
                >
                  <Button icon={<UploadIcon className="w-4 h-4" />} className="!h-9">
                    파일 선택
                  </Button>
                </Upload>
                <Button onClick={handleLoadSampleXml} className="!h-9">
                  샘플 XML 로드
                </Button>
              </>
            )}
            <Button icon={<Wand2 className="w-4 h-4" />} onClick={handleFormatSource} className="!h-9">
              정렬
            </Button>
            {/* 검증 액션 — 동일 스타일 단일 버튼. 통과 시 아이콘/텍스트만 변경, 클릭하면 재검증. 너비 고정으로 텍스트 길이 차이 흡수 */}
            {/* 통과 표시 아이콘 size-6은 결과 모달(BotVersionPublishResultModal, ExcelImportResultModal)의 성공 헤더 패턴 채용 */}
            <Button
              type="primary"
              icon={sourceValidated ? <CheckCircle2 className="size-6" /> : <Play className="w-4 h-4 fill-current" />}
              loading={isValidating}
              onClick={handleValidateSource}
              className="!h-9 !w-[170px] !font-semibold shadow-md ring-2 ring-[var(--color-bt-primary)]/25 hover:ring-[var(--color-bt-primary)]/40"
            >
              {sourceValidated ? '검증 완료' : '데이터 소스 검증'}
            </Button>
          </div>
        </div>

        {/* 입력 본문 — CodeMirror 신택스 하이라이팅 */}
        <div className="overflow-hidden rounded border border-[var(--color-bt-border)]">
          <CodeMirror
            value={text}
            onChange={handleSchemaChange}
            extensions={[baseType === 'XML' ? (xml() as Extension) : (sql() as Extension)]}
            height="400px"
            placeholder={
              baseType === 'XML'
                ? '<DATA_SET ds_name="..." rd_name="...:#변수" rd_key_value="변수" rd_field="COL_A,COL_B" ...>\n    <COL rd_col="..." type="num|str|s_date|float" len=10></COL>\n</DATA_SET>'
                : 'SELECT col1, col2 FROM ... WHERE ...'
            }
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true }}
          />
        </div>
        <div className="mt-2 flex items-center justify-end text-[11px]">
          <span className="font-mono text-[var(--color-bt-fg-muted)]">
            {text.split('\n').length} lines · {(text.length / 1024).toFixed(1)} KB
          </span>
        </div>
      </>
    );
  }

  // ────────── Step 3: 필드 구성 + 계산필드 (통계 WizardStepB 패턴) ──────────
  function renderStep3() {
    const fields = (formValues?.fields as DatasetField[]) ?? [];
    const calcFields = (formValues?.calcFields as CalcField[]) ?? [];
    const baseType = (formValues?.baseType ?? 'XML') as DatasetBaseType;
    const datasetCode = (formValues?.datasetCode ?? '') as string;

    // DnD 정렬 결과 반영용 — 그룹별 분리 정렬
    const dimFields = [...fields.filter((f) => f.classification === 'DIM')].sort((a, b) => a.orderNo - b.orderNo);
    const msrFields = [...fields.filter((f) => f.classification === 'MSR')].sort((a, b) => a.orderNo - b.orderNo);

    // 좌측 팔레트 — 노출(isVisible) 필드만 표시 + 검색 필터
    const matchesSearch = (f: DatasetField) =>
      !paletteSearch || f.columnName.toLowerCase().includes(paletteSearch.toLowerCase()) || (f.displayName ?? '').toLowerCase().includes(paletteSearch.toLowerCase());
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

        {/* 통계 WizardStepB 골격 — 좌측 팔레트 + 우측 메인 그리드. flex-1 + min-h-0으로 본문 가용 공간 전체 채움 */}
        <div className="flex flex-1 min-h-0">
          {/* ── 좌측: 노출 필드 팔레트 ── */}
          <aside className="w-64 shrink-0 bg-[var(--color-bt-bg-muted)]/20 p-4 overflow-y-auto">
            {/* 헤더 — border 없이 텍스트만으로 정보 위계 */}
            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">데이터 소스</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 text-xs font-semibold font-mono text-white">{baseType}</span>
                <span className="font-mono text-sm font-semibold truncate">{datasetCode || '—'}</span>
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-bt-fg-muted)]">
                <span>컬럼 {fields.filter((f) => !f.isVirtual).length}</span>
                {lookups.length > 0 && <span> · 룩업 {lookups.length}</span>}
                {calcFields.length > 0 && <span> · 계산식 {calcFields.length}</span>}
              </div>
            </div>

            <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-4" />

            {/* 디멘션 */}
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>디멘션</span>
                <span className="ml-auto font-mono text-[10px]">{paletteDim.length}</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd('DIM')}>
                <SortableContext items={paletteDim.map((f) => f.columnName)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-0.5">
                    {paletteDim.map((f) => (
                      <SortableItem key={f.columnName} id={f.columnName}>
                        {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                          <div
                            ref={setNodeRef}
                            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                            className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-slate-100/60 rounded cursor-default"
                          >
                            <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                              ⋮⋮
                            </span>
                            <span className="font-mono font-medium flex-1 truncate">{f.columnName}</span>
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
              <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-bt-primary)]" />
                <span>측정값</span>
                <span className="ml-auto font-mono text-[10px]">{paletteMsr.length}</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd('MSR')}>
                <SortableContext items={paletteMsr.map((f) => f.columnName)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-0.5">
                    {paletteMsr.map((f) => (
                      <SortableItem key={f.columnName} id={f.columnName}>
                        {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                          <div
                            ref={setNodeRef}
                            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                            className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-[var(--color-bt-primary-soft)]/40 rounded cursor-default"
                          >
                            <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                              ⋮⋮
                            </span>
                            <span className="font-mono font-medium flex-1 truncate">{f.columnName}</span>
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
                <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
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
                              <div key={vf.columnName} className="flex items-center gap-1.5 px-2 py-0.5 text-[12.5px] rounded hover:bg-sky-50/70">
                                <span className="text-sky-300 text-[10px]">↳</span>
                                <span className="font-mono flex-1 truncate">{vf.columnName}</span>
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
                <div className="mb-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-bt-success)]" />
                  <span>계산식</span>
                  <span className="ml-auto font-mono text-[10px]">{calcFields.length}</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleCalcDragEnd}>
                  <SortableContext items={calcFields.map((c) => c.fieldCode)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {calcFields.map((c) => (
                        <SortableItem key={c.fieldCode} id={c.fieldCode}>
                          {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                            <div
                              ref={setNodeRef}
                              style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                              className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-emerald-50 cursor-default"
                            >
                              <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)]/50 select-none touch-none font-mono text-xs">
                                ⋮⋮
                              </span>
                              <span className="font-mono font-medium flex-1 truncate text-emerald-700">{c.fieldCode}</span>
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

          {/* ── 우측: 필드 구성 그리드 (전체 차지) ── */}
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
        {/* /flex 외곽 */}
      </>
    );
  }

  // ────────── 요약 패널 ──────────
  const renderValidationIcon = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
    return hasError ? <X className="w-4 h-4 text-red-500 ml-2 shrink-0" /> : <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" />;
  };

  function renderFormSummary() {
    const values = formValues ?? initialForm;
    const { datasetCode, datasetName, domainCode, baseType, description, schemaSnapshot, fields, calcFields } = values;
    const usedFields = (fields as DatasetField[] | undefined)?.filter((f) => f.isVisible) ?? [];
    const domainOpts = DOMAIN_OPTIONS.map((o) => ({ label: o.label, value: o.value as string }));
    const baseTypeLabel = baseType === 'XML' ? 'XML (Redis)' : baseType === 'SQL' ? 'SQL (DB 직접 쿼리)' : null;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">코드</span>
            <span className="text-gray-800 font-medium flex-1 font-mono text-[12px]">{displayValue(datasetCode)}</span>
            {renderValidationIcon('datasetCode')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">이름</span>
            <span className="text-gray-800 flex-1">{displayValue(datasetName)}</span>
            {renderValidationIcon('datasetName')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">도메인</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(domainOpts, domainCode))}</span>
            {renderValidationIcon('domainCode')}
          </div>
          <div className="flex items-start gap-1">
            <span className="text-gray-500 w-24 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 whitespace-pre-wrap">{displayValue(description)}</span>
          </div>
        </div>
        <Divider className="!my-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">베이스</span>
            <span className="text-gray-800 flex-1">{displayValue(baseTypeLabel)}</span>
            {renderValidationIcon('baseType')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">{baseType === 'SQL' ? 'SQL' : 'XML'}</span>
            <span className="text-gray-800 flex-1 font-mono text-[11px]">
              {schemaSnapshot ? `${schemaSnapshot.split('\n').length} lines · ${(schemaSnapshot.length / 1024).toFixed(1)} KB` : displayValue(null)}
            </span>
            {renderValidationIcon('schemaSnapshot')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">필드 (사용/전체)</span>
            <span className="text-gray-800 flex-1">
              <span className="font-semibold text-[var(--color-bt-primary)]">{usedFields.length}</span>
              <span className="mx-1 text-gray-400">/</span>
              <span>{(fields as DatasetField[] | undefined)?.length ?? 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">계산필드</span>
            <span className="text-gray-800 flex-1">
              <span className="font-semibold text-[var(--color-bt-success)]">{(calcFields as CalcField[] | undefined)?.length ?? 0}</span>
              <span className="ml-1 text-gray-400">개</span>
            </span>
          </div>
        </div>
        {usedFields.length > 0 && (
          <>
            <Divider className="!my-3" />
            <div>
              <div className="text-[11px] text-gray-500 mb-1.5">사용 필드</div>
              <div className="flex flex-wrap gap-1">
                {usedFields.slice(0, 12).map((f) => (
                  <Tag key={f.columnName} className="!m-0 !text-[10.5px] !leading-tight !py-0.5 !px-1.5 font-mono">
                    {f.columnName}
                  </Tag>
                ))}
                {usedFields.length > 12 && <span className="text-[10.5px] text-gray-400 self-center">+{usedFields.length - 12}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ────────── Footer ──────────
  function renderFooter() {
    const isLast = currentStep === steps.length - 1;
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/insight/monitoring/datasets')}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={handlePrev}>
              이전
            </Button>
          </Col>
        )}
        {!isLast && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {isLast && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={isCreating || isUpdating}>
              {isEdit ? '수정 저장' : '저장'}
            </Button>
          </Col>
        )}
      </Row>
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

        <div className="flex w-full flex-1 min-h-0 gap-4">
          <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
            <div className="w-full flex-1 min-h-0 overflow-y-auto px-7 pt-7 pb-3">
              <Form form={form} initialValues={initialForm} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical" className="h-full">
                {steps.map((step, index) => (
                  <div key={index} className="h-full" style={{ display: currentStep === index ? 'flex' : 'none', flexDirection: 'column' }}>
                    {step.content()}
                  </div>
                ))}
              </Form>
            </div>
            <div className="w-full px-7 py-3">{renderFooter()}</div>
          </div>
          <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
            <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
          </div>
        </div>
      </div>

      {/* 계산필드 추가/편집 Drawer — wizard를 가리지 않고 우측에서 슬라이드 */}
      <Drawer
        open={!!calcEditing}
        onClose={() => setCalcEditing(null)}
        placement="right"
        width="min(1280px, 95vw)"
        destroyOnHidden
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--color-bt-success)] font-mono text-[11px] font-bold text-white">ƒ</span>
            <span className="text-[13px] font-semibold">{calcEditing?.mode === 'add' ? '새 계산필드' : `편집: ${calcEditing?.initial?.fieldCode ?? ''}`}</span>
          </div>
        }
        closable={{ placement: 'end' }}
        styles={{ body: { padding: 0 } }}
      >
        {calcEditing && (
          <CalcFieldEditor
            baseFields={(form.getFieldValue('fields') as DatasetField[]) ?? []}
            existingCalcFields={(form.getFieldValue('calcFields') as CalcField[]) ?? []}
            initialValue={calcEditing.initial}
            onSave={handleCalcSave}
            onCancel={() => setCalcEditing(null)}
          />
        )}
      </Drawer>

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
