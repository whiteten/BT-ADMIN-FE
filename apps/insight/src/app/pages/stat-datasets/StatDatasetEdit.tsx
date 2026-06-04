import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Divider, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Columns3, Database, Layers } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import WizardStepB from '../../features/dataset/components/WizardStepB';
import { useGetDataset, useUpdateDataset } from '../../features/dataset/hooks/useDatasetQueries';
import type { ColumnFormatValue, DataSourceFieldRequest, FieldMetaItem, LocalCalcFieldDraft, LocalFieldDisplay, ValidationStatus } from '../../features/dataset/types';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/report/constants/reportIconConstants';
import type { DomainCode } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const UNIT_LABEL: Record<string, string> = { MI: '10분', HH: '시간', DD: '일', MM: '월', YY: '연' };

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
  const { datasetId: datasetIdParam } = useParams<{ datasetId: string }>();
  const datasetId = datasetIdParam ? Number(datasetIdParam) : undefined;
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [datasourceName, setDatasourceName] = useState('');
  const [fieldDisplays, setFieldDisplays] = useState<LocalFieldDisplay[]>([]);
  const [calcFields, setCalcFields] = useState<LocalCalcFieldDraft[]>([]);
  const [isCalcEditing, setIsCalcEditing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unchecked');

  const { data: dataset, isLoading } = useGetDataset({
    params: { datasetId: datasetId! },
    queryOptions: { enabled: !!datasetId },
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

  // 데이터셋 명 인라인 편집 — 로컬 상태만 변경. 실제 저장은 [저장] 버튼에서 전체 payload로 전송.
  // (백엔드 update DTO는 dbViewPrefix @NotBlank 필수 → 이름만 부분 전송 시 400)
  const handleRename = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setDatasourceName(next);
  };

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
      setDatasourceName(dataset.datasourceName);
      setFieldDisplays([...regularDisplays, ...calcDisplays]);
      setCalcFields(calcDrafts);
      setInitialized(true);
    }
  }, [dataset, initialized]);

  // 요약 패널용 필드 카운트 (로컬 편집 상태 실시간 반영)
  const fieldCounts = useMemo(() => {
    const dim = fieldDisplays.filter((f) => !f.isCalcField && f.fieldType === 'DIM').length;
    const msr = fieldDisplays.filter((f) => !f.isCalcField && f.fieldType === 'MSR').length;
    const calc = calcFields.length;
    return { dim, msr, calc, total: dim + msr + calc };
  }, [fieldDisplays, calcFields]);

  const handleSave = () => {
    if (!dataset || !datasetId) return;
    updateDataset({
      datasetId,
      data: {
        datasourceName: datasourceName.trim() || dataset.datasourceName,
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
      <div className="flex items-center gap-2.5 w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7">
        <Typography.Title
          level={4}
          className="!mb-0 !text-lg !font-semibold !leading-none"
          editable={{ onChange: handleRename, triggerType: ['icon', 'text'], tooltip: '클릭하여 데이터셋 명 수정 (저장 시 반영)', maxLength: 100 }}
        >
          {datasourceName}
        </Typography.Title>
        <Tag color={DOMAIN_TAG_COLOR[dataset!.productCode]} className="!mb-0 !mr-0 font-bold">
          {dataset!.productCode}
        </Tag>
        <span className="inline-flex h-5 items-center gap-1.5 rounded bg-bt-bg-muted px-2">
          <span className="text-[10px] font-bold text-bt-fg-muted">VIEW</span>
          <span className="text-xs font-mono text-bt-fg-muted">{dataset!.dbViewPrefix}</span>
        </span>
      </div>

      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="flex-1 min-w-0 h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0">
            <WizardStepB
              datasetId={datasetId}
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

        {/* 우측 요약 패널 (xl 이상 표시) */}
        <aside className="hidden xl:flex w-[320px] min-w-[320px] h-full min-h-0 bg-white bt-shadow flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-bt-border">
            <div className="text-base font-semibold text-bt-fg">데이터셋 요약</div>
            <div className="text-xs text-bt-fg-muted mt-0.5">현재 구성 정보</div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {/* 기본 정보 */}
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-bt-fg-muted" />
              <span className="text-xs font-semibold text-bt-fg-muted uppercase tracking-wide">기본 정보</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">제품</span>
                <span className="text-sm font-medium text-bt-fg">
                  {dataset!.productCode}
                  {DOMAIN_LABELS[dataset!.productCode] && <span className="text-bt-fg-muted"> · {DOMAIN_LABELS[dataset!.productCode]}</span>}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">상태</span>
                <Tag color={dataset!.isActive ? 'success' : 'default'} className="!mb-0 !mr-0">
                  {dataset!.isActive ? '활성' : '비활성'}
                </Tag>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">유형</span>
                <span className="text-sm font-medium text-bt-fg">{dataset!.isSystem ? '시스템' : '사용자'}</span>
              </div>
            </div>

            <Divider className="!my-3" />

            {/* 데이터 소스 */}
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-bt-fg-muted" />
              <span className="text-xs font-semibold text-bt-fg-muted uppercase tracking-wide">데이터 소스</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">DB 뷰</span>
                <span className="text-sm font-mono text-bt-fg truncate max-w-[170px]" title={dataset!.dbViewPrefix}>
                  {dataset!.dbViewPrefix || '-'}
                </span>
              </div>
              <div className="flex items-start justify-between py-1.5 gap-2">
                <span className="text-sm text-bt-fg-muted shrink-0">가용 단위</span>
                <span className="flex flex-wrap justify-end gap-1">
                  {dataset!.availableUnits?.length ? (
                    dataset!.availableUnits.map((u) => (
                      <span key={u} className="rounded border border-bt-border bg-bt-bg-muted px-1.5 py-0.5 text-[10px] font-mono text-bt-fg-muted">
                        {UNIT_LABEL[u] ?? u}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-bt-fg-muted">-</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">테넌트 컬럼</span>
                <span className="text-sm font-mono text-bt-fg truncate max-w-[170px]" title={dataset!.tenantColumn}>
                  {dataset!.tenantColumn || '-'}
                </span>
              </div>
            </div>

            <Divider className="!my-3" />

            {/* 필드 구성 */}
            <div className="flex items-center gap-2 mb-2">
              <Columns3 className="w-4 h-4 text-bt-fg-muted" />
              <span className="text-xs font-semibold text-bt-fg-muted uppercase tracking-wide">필드 구성</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">총 필드</span>
                <span className="text-sm font-medium text-bt-fg">{fieldCounts.total}개</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">차원</span>
                <span className="text-sm font-medium text-bt-fg">{fieldCounts.dim}개</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">측정값</span>
                <span className="text-sm font-medium text-bt-fg">{fieldCounts.msr}개</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">계산 필드</span>
                <span className="text-sm font-medium text-bt-fg">{fieldCounts.calc}개</span>
              </div>
            </div>

            <Divider className="!my-3" />

            {/* 메타 정보 */}
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-bt-fg-muted" />
              <span className="text-xs font-semibold text-bt-fg-muted uppercase tracking-wide">메타 정보</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">생성일</span>
                <span className="text-sm text-bt-fg">{dataset!.createdAt ? dayjs(dataset!.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-bt-fg-muted">수정일</span>
                <span className="text-sm text-bt-fg">{dataset!.updatedAt ? dayjs(dataset!.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</span>
              </div>
              {dataset!.createdBy && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-bt-fg-muted">생성자</span>
                  <span className="text-sm text-bt-fg truncate max-w-[170px]">{dataset!.createdBy}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
