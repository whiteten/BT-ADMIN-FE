import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import WizardStepB from '../../features/dataset/components/WizardStepB';
import { useGetDataset, useUpdateDataset } from '../../features/dataset/hooks/useDatasetQueries';
import type { ColumnFormatValue, DataSourceFieldRequest, FieldMetaItem, LocalCalcFieldDraft, LocalFieldDisplay, ValidationStatus } from '../../features/dataset/types';
import type { DomainCode } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const COLUMN_FORMAT_TO_FORMATTER: Record<ColumnFormatValue, string> = {
  Number: 'NUMBER',
  Decimal: 'NUMBER',
  Rate: 'PERCENT',
  String: 'NONE',
  Date: 'DATETIME',
  Time: 'DURATION',
};

function formatterTypeToColumnFormat(type: string | null): ColumnFormatValue {
  switch (type) {
    case 'NUMBER':
      return 'Number';
    case 'PERCENT':
      return 'Rate';
    case 'DATETIME':
      return 'Date';
    case 'DURATION':
      return 'Time';
    default:
      return 'String';
  }
}

function toLocalFieldDisplays(fields: FieldMetaItem[]): LocalFieldDisplay[] {
  return fields
    .filter((f) => f.fieldRole !== 'CALC')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => ({
      fieldName: f.fieldName,
      displayName: f.displayName,
      fieldType: f.fieldRole === 'MEASURE' ? 'MSR' : 'DIM',
      columnFormat: formatterTypeToColumnFormat(f.formatterType),
      isVisible: f.isVisible,
      sortOrder: f.sortOrder,
      rawFieldType: f.fieldType,
      rawFieldRole: f.fieldRole,
    }));
}

function toCalcFieldDrafts(fields: FieldMetaItem[]): LocalCalcFieldDraft[] {
  return fields
    .filter((f) => f.fieldRole === 'CALC')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => {
      let parsed: { rowExpression?: string; aggExpression?: string; kpiDirection?: string } = {};
      try {
        parsed = f.formatterOptions ? JSON.parse(f.formatterOptions) : {};
      } catch {
        /* ignore malformed JSON */
      }
      return {
        _localId: f.fieldName,
        fieldCode: f.fieldName,
        displayName: f.displayName,
        rowExpression: parsed.rowExpression ?? '',
        aggExpression: parsed.aggExpression ?? undefined,
        columnFormat: (f.formatterType as ColumnFormatValue) ?? 'Number',
        kpiDirection: (parsed.kpiDirection as LocalCalcFieldDraft['kpiDirection']) ?? 'NEUTRAL',
      };
    });
}

function buildFieldRequests(displays: LocalFieldDisplay[], calcs: LocalCalcFieldDraft[]): DataSourceFieldRequest[] {
  const regular = displays
    .filter((f) => !f.isCalcField)
    .map((f) => ({
      fieldName: f.fieldName,
      displayName: f.displayName,
      fieldType: f.rawFieldType ?? 'STRING',
      fieldRole: f.rawFieldRole ?? (f.fieldType === 'MSR' ? 'MEASURE' : 'DIMENSION'),
      formatterType: COLUMN_FORMAT_TO_FORMATTER[f.columnFormat] ?? 'NONE',
      isVisible: f.isVisible,
      sortOrder: f.sortOrder,
    }));
  const calcRows = calcs.map((c, i) => {
    const display = displays.find((f) => f.fieldName === c.fieldCode && f.isCalcField);
    return {
      fieldName: c.fieldCode,
      displayName: c.displayName,
      fieldType: 'NUMBER',
      fieldRole: 'CALC',
      formatterType: COLUMN_FORMAT_TO_FORMATTER[c.columnFormat] ?? 'NUMBER',
      formatterOptions: JSON.stringify({ rowExpression: c.rowExpression, aggExpression: c.aggExpression ?? null, kpiDirection: c.kpiDirection }),
      isVisible: true,
      sortOrder: display?.sortOrder ?? regular.length + i,
    };
  });
  return [...regular, ...calcRows];
}

export default function StatDatasetEdit() {
  const { datasourceKey } = useParams<{ datasourceKey: string }>();
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [fieldDisplays, setFieldDisplays] = useState<LocalFieldDisplay[]>([]);
  const [calcFields, setCalcFields] = useState<LocalCalcFieldDraft[]>([]);
  const [isCalcEditing, setIsCalcEditing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unchecked');

  const { data: dataset, isLoading } = useGetDataset({
    params: { datasourceKey: datasourceKey! },
    queryOptions: { enabled: !!datasourceKey },
  });

  const { mutate: updateDataset, isPending } = useUpdateDataset({
    mutationOptions: {
      onSuccess: () => {
        toast.success('데이터셋이 수정되었습니다.');
        navigate('/insight/statistics/datasets');
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  useEffect(() => {
    if (dataset) {
      setBreadcrumb([{ title: '인사이트' }, { title: '데이터셋', path: '/insight/statistics/datasets' }, { title: dataset.datasourceName }]);
    }
    return () => clearBreadcrumb();
  }, [dataset, setBreadcrumb, clearBreadcrumb]);

  useEffect(() => {
    if (dataset && !initialized) {
      const regularDisplays = toLocalFieldDisplays(dataset.fields ?? []);
      const calcDrafts = toCalcFieldDrafts(dataset.fields ?? []);
      const calcDisplays: LocalFieldDisplay[] = calcDrafts.map((c, i) => {
        const saved = (dataset.fields ?? []).find((f) => f.fieldName === c.fieldCode && f.fieldRole === 'CALC');
        return {
          fieldName: c.fieldCode,
          displayName: c.displayName,
          fieldType: 'MSR',
          columnFormat: c.columnFormat,
          isVisible: true,
          sortOrder: saved?.sortOrder ?? regularDisplays.length + i,
          isCalcField: true,
        };
      });
      setFieldDisplays([...regularDisplays, ...calcDisplays]);
      setCalcFields(calcDrafts);
      setInitialized(true);
    }
  }, [dataset, initialized]);

  const handleSave = () => {
    if (!dataset || !datasourceKey) return;
    updateDataset({
      datasourceKey,
      data: {
        datasourceName: dataset.datasourceName,
        dbViewPrefix: dataset.dbViewPrefix,
        fields: buildFieldRequests(fieldDisplays, calcFields),
      },
    });
  };

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center gap-3 w-full bg-white bt-shadow px-7 py-4">
        <div>
          <div className="text-base font-semibold">{dataset!.datasourceName}</div>
          <div className="text-xs text-bt-fg-muted font-mono">{dataset!.datasourceKey}</div>
        </div>
        <span className="ml-2 inline-flex h-5 items-center rounded bg-primary px-2 text-xs font-bold text-white">{dataset!.productCode}</span>
        <span className="text-xs text-bt-fg-muted">·</span>
        <span className="text-xs text-bt-fg-muted font-mono">{dataset!.dbViewPrefix}</span>
      </div>

      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0">
            <WizardStepB
              datasourceKey={datasourceKey}
              domain={dataset!.productCode as DomainCode}
              fieldDisplays={fieldDisplays}
              onFieldDisplaysChange={setFieldDisplays}
              calcFields={calcFields}
              onCalcFieldsChange={setCalcFields}
              onEditingChange={setIsCalcEditing}
              onValidationStatusChange={setValidationStatus}
            />
          </div>
          {!isCalcEditing && (
            <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
              <div className="flex items-center justify-between">
                <Button onClick={() => navigate('/insight/statistics/datasets')}>취소</Button>
                <Tooltip title={validationStatus === 'invalid' ? '검증 실행 후 저장하세요' : undefined}>
                  <Button type="primary" onClick={handleSave} loading={isPending} disabled={validationStatus === 'invalid'}>
                    저장
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
