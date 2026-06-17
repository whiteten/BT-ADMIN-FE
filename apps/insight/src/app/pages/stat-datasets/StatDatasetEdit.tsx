import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Divider, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Columns3, Database, Layers } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
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
  Decimal: 'DECIMAL',
  Rate: 'PERCENT',
  String: 'NONE',
  Date: 'DATETIME',
  Time: 'DURATION',
};

function formatterTypeToColumnFormat(type: string | null): ColumnFormatValue {
  switch (type) {
    case 'NUMBER':
      return 'Number';
    case 'DECIMAL':
      return 'Decimal';
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
        columnFormat: f.formatterType ? formatterTypeToColumnFormat(f.formatterType) : 'Number',
        kpiDirection: (parsed.kpiDirection as LocalCalcFieldDraft['kpiDirection']) ?? 'NEUTRAL',
      };
    });
}

/** 계산필드 변경 감지용 직렬화 — 수식/표시명/서식/KPI방향이 하나라도 바뀌면 다른 문자열. */
function serializeCalcFields(calcs: LocalCalcFieldDraft[]): string {
  return JSON.stringify(
    calcs
      .map((c) => [c.fieldCode, c.displayName, c.rowExpression, c.aggExpression ?? null, c.columnFormat, c.kpiDirection])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
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
      formatterType: COLUMN_FORMAT_TO_FORMATTER[display?.columnFormat ?? c.columnFormat] ?? 'NUMBER',
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
  const { modal } = App.useApp();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [datasourceName, setDatasourceName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldDisplays, setFieldDisplays] = useState<LocalFieldDisplay[]>([]);
  const [calcFields, setCalcFields] = useState<LocalCalcFieldDraft[]>([]);
  const [isCalcEditing, setIsCalcEditing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unchecked');
  // 저장 시 계산필드 변경 감지용 — 초기 로드 시점 스냅샷
  const initialCalcRef = useRef<string>('');

  const { data: dataset, isLoading } = useGetDataset({
    params: { datasetId: datasetId! },
    queryOptions: { enabled: !!datasetId },
  });

  // 시스템 데이터셋은 일반 사용자에게 readonly — 시스템 관리자만 편집/승격 해제 가능
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const readOnly = !!dataset?.isSystem && !isSystemAdmin;

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
      setBreadcrumb([{ title: '통계', path: '/insight/statistics' }, { title: '데이터셋', path: '/insight/statistics/datasets' }, { title: dataset.datasourceName }]);
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
      setDescription(dataset.description ?? '');
      setFieldDisplays([...regularDisplays, ...calcDisplays]);
      setCalcFields(calcDrafts);
      initialCalcRef.current = serializeCalcFields(calcDrafts);
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

  const doSave = (applyToReports: boolean) => {
    if (!dataset || !datasetId) return;
    updateDataset({
      datasetId,
      data: {
        datasourceName: datasourceName.trim() || dataset.datasourceName,
        description: description.trim(),
        dbViewPrefix: dataset.dbViewPrefix,
        fields: buildFieldRequests(fieldDisplays, calcFields),
        ...(applyToReports ? { applyToReports: true } : {}),
      },
    });
  };

  // 계산필드가 변경됐으면 기존 보고서 동기화 여부를 묻고 저장 (opt-in — 보고서 계산필드는 생성 시점 스냅샷이 원칙)
  const confirmSyncAndSave = () => {
    const calcChanged = serializeCalcFields(calcFields) !== initialCalcRef.current;
    if (!calcChanged) {
      doSave(false);
      return;
    }
    modal.confirm({
      title: '기존 보고서에도 적용',
      content:
        '계산필드가 변경되었습니다. 이 데이터셋을 사용하는 기존 보고서들의 계산필드에도 변경을 적용하시겠습니까? (적용하지 않으면 기존 보고서는 생성 시점 정의를 유지합니다)',
      okText: '보고서까지 적용',
      cancelText: '데이터셋만 저장',
      keyboard: false,
      maskClosable: false,
      onOk: () => doSave(true),
      onCancel: () => doSave(false),
    });
  };

  // 검증은 필수 아님. 실패(invalid) 상태여도 확인 후 저장 허용
  // (예: 계산컬럼 식이 ORA-01476 등 데이터 의존 오류여도 정의 자체는 저장 가능해야 함)
  const handleSave = () => {
    if (!dataset || !datasetId) return;
    if (validationStatus === 'invalid') {
      modal.confirm({
        title: '검증 실패',
        content: '필드 검증에 실패했습니다. 그래도 저장하시겠습니까?',
        okText: '저장',
        cancelText: '취소',
        onOk: confirmSyncAndSave,
      });
      return;
    }
    confirmSyncAndSave();
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
      <div className="flex flex-col justify-center gap-1 w-full min-h-[58px] bg-white bt-shadow px-7 py-2">
        <div className="flex items-center gap-2.5">
          <Typography.Title
            level={4}
            className="!mb-0 !text-lg !font-semibold !leading-none"
            editable={readOnly ? false : { onChange: handleRename, triggerType: ['icon', 'text'], tooltip: '클릭하여 데이터셋 명 수정 (저장 시 반영)', maxLength: 100 }}
          >
            {datasourceName}
          </Typography.Title>
          <Tag color={DOMAIN_TAG_COLOR[dataset!.productCode]} className="!mb-0 !mr-0 font-bold">
            {dataset!.productCode}
          </Tag>
          {dataset!.isSystem && (
            <Tag color="blue" className="!mb-0 !mr-0">
              시스템
            </Tag>
          )}
          <span className="inline-flex h-5 items-center gap-1.5 rounded bg-bt-bg-muted px-2">
            <span className="text-[10px] font-bold text-bt-fg-muted">VIEW</span>
            <span className="text-xs font-mono text-bt-fg-muted">{dataset!.dbViewPrefix}</span>
          </span>
        </div>
        {/* 설명 인라인 편집 — 목록 카드에 노출되는 텍스트. 저장 버튼으로 함께 저장. */}
        <Typography.Text
          type="secondary"
          className="!text-xs"
          editable={
            readOnly
              ? false
              : {
                  text: description,
                  onChange: (v) => setDescription(v),
                  triggerType: ['icon', 'text'],
                  tooltip: '클릭하여 설명 수정 (저장 시 반영)',
                  maxLength: 500,
                }
          }
        >
          {description || (readOnly ? '' : '설명 추가…')}
        </Typography.Text>
        {readOnly && <Alert type="info" showIcon className="!mt-1 !py-1 !px-3" message="시스템 기본 데이터셋은 읽기 전용입니다. 수정은 시스템 관리자만 가능합니다." />}
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
              readOnly={readOnly}
            />
          </div>
          {!isCalcEditing && (
            <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
              <div className="flex items-center justify-center gap-5">
                {readOnly ? (
                  <Button onClick={() => navigate('/insight/statistics/datasets')}>목록</Button>
                ) : (
                  <>
                    <Button onClick={() => navigate('/insight/statistics/datasets')}>취소</Button>
                    <Button type="primary" onClick={handleSave} loading={isPending}>
                      저장
                    </Button>
                  </>
                )}
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
              {(dataset!.createdByName || dataset!.createdBy) && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-bt-fg-muted">생성자</span>
                  <span className="text-sm text-bt-fg truncate max-w-[170px]">{dataset!.createdByName || dataset!.createdBy}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
