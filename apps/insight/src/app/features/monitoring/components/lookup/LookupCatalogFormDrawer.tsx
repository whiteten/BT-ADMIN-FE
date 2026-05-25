import { useEffect, useState } from 'react';
import { Button, Checkbox, Col, Drawer, Form, type FormProps, Input, Row, Select, Space } from 'antd';
import { CheckCircle2, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateMonitoringLookupCatalog, useFetchLookupCatalogSchemaPreview, useUpdateMonitoringLookupCatalog } from '../../hooks/useLookupCatalogQueries';
import type { LookupCatalogItem, LookupWhereCondition, LookupWhereOperator, SchemaPreview } from '../../types';
import { IconTrash } from '@/components/custom/Icons';

const { TextArea } = Input;

const CATEGORY_OPTIONS = [
  { value: '일반', label: '일반' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
];

const WHERE_OPERATOR_OPTIONS: Array<{ value: LookupWhereOperator; label: string }> = [
  { value: '=', label: '= (같음)' },
  { value: '!=', label: '!= (다름)' },
  { value: '>', label: '> (초과)' },
  { value: '<', label: '< (미만)' },
  { value: '>=', label: '>= (이상)' },
  { value: '<=', label: '<= (이하)' },
  { value: 'LIKE', label: 'LIKE (와일드카드, 예: A%)' },
  { value: 'IN', label: 'IN (목록 포함)' },
  { value: 'NOT IN', label: 'NOT IN (목록 제외)' },
  { value: 'IS NULL', label: 'IS NULL (값 없음)' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL (값 있음)' },
];

interface LookupCatalogFormDrawerProps {
  open: boolean;
  /** null이면 신규 등록, 값이 있으면 편집 모드 */
  initial: LookupCatalogItem | null;
  onClose: () => void;
  onSaved: (item: LookupCatalogItem) => void;
}

interface FormValues {
  tableName: string;
  displayName: string;
  category: string;
  description?: string;
  recommendedKey: string;
  recommendedValues: string[];
  whereConditions: LookupWhereCondition[];
}

const DEFAULT_VALUES: FormValues = {
  tableName: '',
  displayName: '',
  category: '일반',
  description: '',
  recommendedKey: '',
  recommendedValues: [],
  whereConditions: [],
};

const NO_VALUE_OPERATORS = new Set<LookupWhereOperator>(['IS NULL', 'IS NOT NULL']);
const MULTI_VALUE_OPERATORS = new Set<LookupWhereOperator>(['IN', 'NOT IN']);

/**
 * 코드 룩업 카탈로그 등록/편집 Drawer.
 * <p>
 * FCA EntityDrawer 표준 패턴: antd Drawer + footer prop + Form layout="vertical".
 * 등록 모드: 테이블명 → 스키마 로드 → 메타 입력 → (선택) WHERE 조건 → 저장.
 * 편집 모드: 테이블명 변경 불가.
 */
export default function LookupCatalogFormDrawer({ open, initial, onClose, onSaved }: LookupCatalogFormDrawerProps) {
  const isEdit = !!initial;
  const [form] = Form.useForm<FormValues>();
  const [preview, setPreview] = useState<SchemaPreview | null>(null);

  const watchRecommendedKey = Form.useWatch('recommendedKey', form);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      return;
    }
    if (initial) {
      form.setFieldsValue({
        tableName: initial.tableName,
        displayName: initial.displayName,
        category: initial.category ?? '일반',
        description: initial.description ?? '',
        recommendedKey: initial.recommendedKey,
        recommendedValues: initial.recommendedValues,
        whereConditions: initial.whereConditions ?? [],
      });
      // 편집 모드 — 기존 스키마 자동 로드 (옵션 노출용)
      fetchPreviewSilent(initial.tableName);
    } else {
      form.resetFields();
      form.setFieldsValue(DEFAULT_VALUES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { mutate: runFetchPreview, isPending: isLoadingPreview } = useFetchLookupCatalogSchemaPreview({
    mutationOptions: {
      onSuccess: (result) => setPreview(result),
      onError: (e) => {
        setPreview(null);
        toast.error('스키마 로드 실패 — 테이블명을 확인하세요.');
        Log.error('schema preview failed', e);
      },
    },
  });

  const fetchPreviewSilent = (name: string) => runFetchPreview(name);

  const handleLoadSchema = () => {
    const t = (form.getFieldValue('tableName') as string)?.trim();
    if (!t) return;
    runFetchPreview(t, {
      onSuccess: (result) => {
        setPreview(result);
        // 신규 등록 시 권장 키/값 자동 선택
        if (!isEdit) {
          const pk = result.columns.find((c) => c.isPrimaryKey)?.name ?? result.columns[0]?.name ?? '';
          const defaultValues = result.columns
            .filter((c) => !c.isPrimaryKey)
            .slice(0, 2)
            .map((c) => c.name);
          form.setFieldsValue({ recommendedKey: pk, recommendedValues: defaultValues });
        }
        toast.success(`스키마 로드 완료 — 컬럼 ${result.columns.length}개`);
      },
    });
  };

  const { mutate: runCreate, isPending: isCreating } = useCreateMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: (item) => {
        toast.success(`"${item.displayName}"이(가) 등록되었습니다.`);
        onSaved(item);
        onClose();
      },
      onError: () => toast.error('등록 실패'),
    },
  });
  const { mutate: runUpdate, isPending: isUpdating } = useUpdateMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: (item) => {
        toast.success(`"${item.displayName}"이(가) 수정되었습니다.`);
        onSaved(item);
        onClose();
      },
      onError: () => toast.error('수정 실패'),
    },
  });

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    if (!preview) {
      toast.error('먼저 스키마를 로드해 주세요.');
      return;
    }
    // WHERE 조건 정규화 — 연산자별 values 사용 규칙 적용
    const normalizedWhere: LookupWhereCondition[] = (values.whereConditions ?? [])
      .filter((c) => c.column && c.operator)
      .map((c) => {
        if (NO_VALUE_OPERATORS.has(c.operator)) return { column: c.column, operator: c.operator };
        if (MULTI_VALUE_OPERATORS.has(c.operator)) {
          return { column: c.column, operator: c.operator, values: (c.values ?? []).filter((v) => v?.trim().length > 0) };
        }
        // 단일값 연산자 — 첫 값만 사용
        const first = (c.values ?? [])[0];
        return { column: c.column, operator: c.operator, values: first?.trim() ? [first.trim()] : [] };
      });

    const payload = {
      displayName: values.displayName.trim(),
      tableName: preview.tableName,
      category: values.category,
      description: values.description?.trim() || undefined,
      recommendedKey: values.recommendedKey,
      recommendedValues: values.recommendedValues,
      whereConditions: normalizedWhere.length > 0 ? normalizedWhere : undefined,
    };
    if (isEdit && initial) runUpdate({ lookupCatalogId: initial.lookupCatalogId, data: payload });
    else runCreate(payload);
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('LookupCatalog onFinishFailed', errorInfo);
  };

  /** 컬럼명 + 한글 코멘트 + 타입을 사용자 친화적으로 한 줄에 표시 */
  const formatColumnLabel = (col: SchemaPreview['columns'][number]) => {
    const commentText = col.comment ? ` (${col.comment})` : '';
    const pkText = col.isPrimaryKey ? ' · PK' : '';
    return `${col.name}${commentText} · ${col.type}${pkText}`;
  };

  const columnOptions = (preview?.columns ?? []).map((c) => ({ value: c.name, label: formatColumnLabel(c) }));

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={onClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isCreating || isUpdating} disabled={!preview}>
        {isEdit ? '수정' : '등록'}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? '코드 룩업 편집' : '코드 룩업 추가'} closable={{ placement: 'end' }} size="large" footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={DEFAULT_VALUES} onFinish={onFinish} onFinishFailed={onFinishFailed}>
        {/* 1) 마스터 테이블 입력 + 스키마 로드 */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={isEdit ? '마스터 테이블 (변경 불가)' : '마스터 테이블'}
              name="tableName"
              rules={[
                { required: true, message: '마스터 테이블명을 입력하세요.' },
                { pattern: /^[A-Z][A-Z0-9_$#]*$/, message: '영문 대문자·숫자·언더스코어(_)만 가능합니다.' },
              ]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="예: TB_BT_CM_SKILL_GRP_MST"
                  className="font-mono"
                  disabled={isEdit}
                  onPressEnter={handleLoadSchema}
                  onChange={(e) => form.setFieldValue('tableName', e.target.value.toUpperCase())}
                />
                {!isEdit && (
                  <Button type="primary" onClick={handleLoadSchema} loading={isLoadingPreview}>
                    스키마 로드
                  </Button>
                )}
              </Space.Compact>
            </Form.Item>
          </Col>
        </Row>

        {preview && (
          <div className="mb-4 flex items-center gap-2 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">유효 · SELECT 권한 확인됨</span>
            <span className="text-emerald-600/80">
              컬럼 {preview.columns.length}개{preview.rowCount != null ? ` · 샘플 ${preview.rowCount} 행` : ''}
            </span>
          </div>
        )}

        {preview && (
          <>
            {/* 2) 메타 입력 */}
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  label="표시명"
                  name="displayName"
                  rules={[
                    { required: true, message: '표시명을 입력하세요.' },
                    { whitespace: true, message: '표시명을 입력하세요.' },
                    { max: 120, message: '120자까지 입력 가능합니다.' },
                  ]}
                >
                  <Input placeholder="예: 스킬 그룹 마스터" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="카테고리" name="category">
                  <Select options={CATEGORY_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="설명" name="description" rules={[{ max: 500, message: '500자까지 입력 가능합니다.' }]}>
              <TextArea rows={2} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="예: 스킬 그룹 코드 / 명칭 / 우선순위" />
            </Form.Item>

            <Form.Item label="권장 키 컬럼 (룩업 시 기본 채워질 키)" name="recommendedKey" rules={[{ required: true, message: '권장 키 컬럼을 선택하세요.' }]}>
              <Select options={columnOptions} placeholder="키 컬럼 선택" showSearch optionFilterProp="label" />
            </Form.Item>

            <Form.Item
              label="권장 값 컬럼 (룩업 시 자동 체크되어 표시될 컬럼)"
              name="recommendedValues"
              rules={[{ validator: (_r, v: string[]) => (v && v.length > 0 ? Promise.resolve() : Promise.reject(new Error('값 컬럼을 1개 이상 선택하세요.'))) }]}
            >
              <Checkbox.Group className="flex flex-col gap-1">
                {preview.columns
                  .filter((c) => c.name !== watchRecommendedKey)
                  .map((c) => (
                    <Checkbox key={c.name} value={c.name}>
                      <span className="font-mono">{c.name}</span>
                      {c.comment && <span className="ml-1 text-[var(--color-bt-fg-muted)]">({c.comment})</span>}
                      <span className="ml-1 text-xs text-[var(--color-bt-fg-muted)]">· {c.type}</span>
                    </Checkbox>
                  ))}
              </Checkbox.Group>
            </Form.Item>

            {/* 3) WHERE 조건 (선택) — 런타임 조회 시 추가 필터 */}
            <Form.Item label="WHERE 조건" extra="선택 사항입니다. 지정하면 마스터 테이블 조회 시 추가 필터로 적용됩니다.">
              <Form.List name="whereConditions">
                {(fields, { add, remove }) => (
                  <div className="space-y-2">
                    {fields.map(({ key, name }) => {
                      const op = (form.getFieldValue(['whereConditions', name, 'operator']) as LookupWhereOperator) ?? '=';
                      const noValue = NO_VALUE_OPERATORS.has(op);
                      const multiValue = MULTI_VALUE_OPERATORS.has(op);
                      return (
                        <Row key={key} gutter={8} align="middle">
                          <Col span={9}>
                            <Form.Item name={[name, 'column']} rules={[{ required: true, message: '컬럼 선택' }]} className="!mb-0">
                              <Select options={columnOptions} placeholder="컬럼" showSearch optionFilterProp="label" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name={[name, 'operator']} rules={[{ required: true }]} className="!mb-0">
                              <Select options={WHERE_OPERATOR_OPTIONS} placeholder="연산자" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            {noValue ? (
                              <Input value="값 불필요" disabled />
                            ) : multiValue ? (
                              <Form.Item name={[name, 'values']} className="!mb-0">
                                <Select mode="tags" placeholder="값 입력 후 Enter" tokenSeparators={[',']} />
                              </Form.Item>
                            ) : (
                              <Form.Item name={[name, 'values', 0]} className="!mb-0">
                                <Input placeholder="값" />
                              </Form.Item>
                            )}
                          </Col>
                          <Col span={1} className="flex justify-center">
                            <button type="button" onClick={() => remove(name)} title="조건 삭제">
                              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
                            </button>
                          </Col>
                        </Row>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => add({ column: '', operator: '=', values: [] })}
                      className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-[#d9d9d9] rounded text-sm text-[#595959] hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)] transition-colors"
                    >
                      <Plus className="size-4" />
                      추가
                    </button>
                  </div>
                )}
              </Form.List>
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
}
