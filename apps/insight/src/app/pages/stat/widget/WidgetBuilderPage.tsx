import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Radio, Select } from 'antd';
import { ChevronRight, X } from 'lucide-react';
import { toast } from '@/shared-util';
import StepCalcAndSearch, { type CalcField, type SearchBind } from './steps/StepCalcAndSearch';
import StepDataSource from './steps/StepDataSource';
import StepFieldMapping, { type FieldMapping } from './steps/StepFieldMapping';
import StepPreview from './steps/StepPreview';
import StepVisualization from './steps/StepVisualization';
import { useCreateWidget, useGetWidgetDetail, useUpdateWidget } from '../../../features/stat/hooks/useStatQueries';
import type { WidgetRequest } from '../../../features/stat/types/widget';

interface Section {
  id: string;
  title: string;
  datasourceKeys: string[];
  fieldMappings: FieldMapping[];
  calcFields: CalcField[];
  searchBindings: SearchBind[];
  visualization?: string;
}

const PANEL_STEPS = [{ title: '데이터소스' }, { title: '필드 매핑' }, { title: '계산 필드' }, { title: '시각화' }, { title: '미리보기' }];

const CATEGORY_OPTIONS = [
  { value: 'FCA', label: 'FCA (ForCus-AI)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'AI', label: 'AI (AIRS)' },
  { value: 'COMMON', label: '공통' },
];

const CANVAS_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, #e4e7ec 1px, transparent 1px), linear-gradient(to bottom, #e4e7ec 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  backgroundColor: '#f1f3f6',
};

const VIZ_LABELS: Record<string, string> = {
  LINE: 'LINE',
  BAR: 'BAR',
  PIE: 'PIE',
  DONUT: 'DONUT',
  GRID: 'GRID',
};

export default function WidgetBuilderPage() {
  const navigate = useNavigate();
  const { widgetId } = useParams<{ widgetId: string }>();
  const isEdit = !!widgetId;

  const [form] = Form.useForm();
  const [reportTitle, setReportTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const isSubmittingRef = useRef(false);

  // Panel / section state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelStep, setPanelStep] = useState(0);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // Current section editing state
  const [selectedDatasourceKeys, setSelectedDatasourceKeys] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [calcFields, setCalcFields] = useState<CalcField[]>([]);
  const [searchBindings, setSearchBindings] = useState<SearchBind[]>([]);

  const createMutation = useCreateWidget({});
  const updateMutation = useUpdateWidget({});

  const { data: widgetData } = useGetWidgetDetail({
    params: isEdit ? { widgetId: Number(widgetId) } : undefined,
    queryOptions: { enabled: isEdit },
  });

  useEffect(() => {
    if (widgetData) {
      setReportTitle(widgetData.widgetName);
      form.setFieldsValue({
        category: widgetData.category,
        icon: widgetData.icon,
        visualization: widgetData.visualization,
        refreshMode: widgetData.refreshMode,
        refreshInterval: widgetData.refreshInterval,
        defaultW: widgetData.defaultW,
        defaultH: widgetData.defaultH,
      });
      if (widgetData.dataSources?.length) {
        const section: Section = {
          id: 'main',
          title: widgetData.widgetName,
          datasourceKeys: widgetData.dataSources.map((d) => d.datasourceKey),
          fieldMappings: widgetData.fieldMappings as unknown as FieldMapping[],
          calcFields: widgetData.calculatedFields as unknown as CalcField[],
          searchBindings: widgetData.searchBindings as unknown as SearchBind[],
          visualization: widgetData.visualization,
        };
        setSections([section]);
      }
    }
  }, [widgetData, form]);

  const handleAddSection = () => {
    setEditingSectionId(null);
    setSelectedDatasourceKeys([]);
    setFieldMappings([]);
    setCalcFields([]);
    setSearchBindings([]);
    setPanelStep(0);
    setIsPanelOpen(true);
  };

  const handleEditSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    setEditingSectionId(sectionId);
    setSelectedDatasourceKeys(section.datasourceKeys);
    setFieldMappings(section.fieldMappings);
    setCalcFields(section.calcFields);
    setSearchBindings(section.searchBindings);
    setPanelStep(0);
    setIsPanelOpen(true);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (editingSectionId === sectionId) {
      setIsPanelOpen(false);
      setEditingSectionId(null);
    }
    setIsDirty(true);
  };

  const handleAddToCanvas = () => {
    const sectionTitle = selectedDatasourceKeys[0] ?? '새 섹션';
    if (editingSectionId) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSectionId
            ? { ...s, datasourceKeys: selectedDatasourceKeys, fieldMappings, calcFields, searchBindings, visualization: form.getFieldValue('visualization') }
            : s,
        ),
      );
    } else {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        title: sectionTitle,
        datasourceKeys: selectedDatasourceKeys,
        fieldMappings,
        calcFields,
        searchBindings,
        visualization: form.getFieldValue('visualization'),
      };
      setSections((prev) => [...prev, newSection]);
    }
    setIsPanelOpen(false);
    setEditingSectionId(null);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (!reportTitle.trim()) {
      toast.error('보고서명을 입력하세요.');
      isSubmittingRef.current = false;
      return;
    }
    form
      .validateFields(['category', 'refreshMode'])
      .then(() => {
        const values = form.getFieldsValue(true);
        const request: WidgetRequest = {
          widgetType: 'DATA',
          widgetName: reportTitle,
          description: values.description,
          category: values.category,
          icon: values.icon,
          visualization: values.visualization,
          refreshMode: values.refreshMode ?? 'MANUAL',
          refreshInterval: values.refreshInterval,
          defaultW: values.defaultW ?? 4,
          defaultH: values.defaultH ?? 3,
          dataSources: selectedDatasourceKeys.map((key, idx) => ({ datasourceKey: key, sortOrder: idx })),
          fieldMappings: fieldMappings
            .filter((f) => f.enabled)
            .map((f, idx) => ({
              datasourceKey: f.datasourceKey,
              fieldName: f.fieldName,
              alias: f.alias || undefined,
              showInGrid: f.showInGrid,
              chartRole: f.chartRole || undefined,
              sortOrder: idx,
              aggregation: f.aggregation || undefined,
              showRatio: f.showRatio || undefined,
            })),
          calculatedFields: calcFields
            .filter((c) => c.fieldName && c.formula)
            .map((c, idx) => ({
              fieldName: c.fieldName,
              displayName: c.displayName,
              formula: c.formula,
              fieldType: c.fieldType,
              showInGrid: c.showInGrid,
              chartRole: c.chartRole || undefined,
              showRatio: c.showRatio || undefined,
              sortOrder: idx,
            })),
          searchBindings: searchBindings
            .filter((s) => s.conditionId != null)
            .map((s, idx) => ({
              conditionId: s.conditionId as number,
              bindDatasourceKey: s.bindDatasourceKey,
              bindFieldName: s.bindFieldName,
              sortOrder: idx,
            })),
        };

        const onSuccess = () => {
          isSubmittingRef.current = false;
          toast.success(isEdit ? '보고서가 수정되었습니다.' : '보고서가 생성되었습니다.');
          setIsDirty(false);
          navigate('/insight/stat/widget');
        };
        const onError = () => {
          isSubmittingRef.current = false;
          toast.error(isEdit ? '보고서 수정에 실패했습니다.' : '보고서 생성에 실패했습니다.');
        };

        if (isEdit) {
          updateMutation.mutate({ params: { widgetId: Number(widgetId) }, data: request }, { onSuccess, onError });
        } else {
          createMutation.mutate(request, { onSuccess, onError });
        }
      })
      .catch(() => {
        isSubmittingRef.current = false;
      });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Report header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/insight/stat/widget')} className="text-[12px] text-gray-400 hover:text-gray-700">
            보고서 목록
          </button>
          <ChevronRight size={12} className="text-gray-300" />
          <input
            value={reportTitle}
            onChange={(e) => {
              setReportTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="제목 없음"
            className="border-b border-transparent bg-transparent px-1 text-[14px] font-semibold placeholder:text-gray-300 focus:border-blue-500 focus:outline-none"
          />
          {isDirty && (
            <span className="inline-flex items-center rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-700 border border-yellow-200">초안 · 미저장</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="small">미리보기</Button>
          <Button size="small" loading={isPending} disabled={isPending} onClick={handleSave}>
            저장
          </Button>
          <Button type="primary" size="small" loading={isPending} disabled={isPending} onClick={handleSave}>
            발행
          </Button>
        </div>
      </header>

      {/* Global filter bar - placeholder */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b bg-gray-50/50 px-5 py-3 text-[12px] text-gray-400">
        <span className="rounded bg-gray-100 px-2 py-1">기간</span>
        <span className="rounded bg-gray-100 px-2 py-1">단위</span>
        <span className="rounded bg-gray-100 px-2 py-1">비교 기간</span>
        <span className="ml-auto text-[11px]">글로벌 필터는 모든 섹션에 일괄 적용</span>
      </div>

      {/* Main content: canvas + side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto p-5" style={CANVAS_STYLE}>
          <Form form={form} layout="vertical" initialValues={{ widgetType: 'DATA', refreshMode: 'MANUAL', defaultW: 4, defaultH: 3 }}>
            {/* Report basic settings */}
            <div className="mb-4 rounded border bg-white shadow-sm">
              <div className="border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">보고서 기본 설정</div>
              <div className="grid grid-cols-2 gap-4 p-4">
                <Form.Item label="보고서명" required className="mb-0">
                  <Input
                    value={reportTitle}
                    onChange={(e) => {
                      setReportTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="보고서 이름을 입력하세요"
                    size="small"
                  />
                </Form.Item>
                <Form.Item name="category" label="카테고리" rules={[{ required: true, message: '카테고리를 선택하세요' }]} className="mb-0">
                  <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} size="small" />
                </Form.Item>
              </div>
            </div>

            {sections.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3">
                <div className="text-[14px] font-semibold text-gray-400">아직 섹션이 없습니다</div>
                <p className="max-w-md text-center text-[12px] text-gray-400">섹션을 추가하면 데이터소스를 선택하고 그리드 또는 차트로 시각화한 뒤 캔버스에 배치할 수 있습니다.</p>
                <Button type="primary" onClick={handleAddSection}>
                  + 섹션 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    isEditing={editingSectionId === section.id && isPanelOpen}
                    onEdit={() => handleEditSection(section.id)}
                    onDelete={() => handleDeleteSection(section.id)}
                  />
                ))}
                <div className="flex items-center justify-center rounded border-2 border-dashed border-gray-200 bg-white/40 p-4">
                  <button className="text-[12px] font-medium text-gray-400 hover:text-blue-500" onClick={handleAddSection}>
                    + 섹션 추가
                  </button>
                </div>
              </div>
            )}
          </Form>
        </div>

        {/* Side panel */}
        {isPanelOpen && (
          <aside className="flex w-[420px] flex-shrink-0 flex-col border-l bg-white">
            {/* Panel header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b px-5 py-3">
              <span className="text-[13px] font-semibold">섹션 편집</span>
              <button
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => {
                  setIsPanelOpen(false);
                  setEditingSectionId(null);
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Step progress */}
            <ol className="flex flex-shrink-0 items-center gap-1 border-b px-5 py-3 text-[11px]">
              {PANEL_STEPS.map((step, i) => (
                <li key={i} className="flex items-center gap-1">
                  <button
                    className={`flex items-center gap-1.5 transition ${
                      i < panelStep ? 'font-semibold text-green-600' : i === panelStep ? 'font-semibold text-blue-600' : 'text-gray-400'
                    }`}
                    onClick={() => setPanelStep(i)}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${
                        i < panelStep ? 'bg-green-600' : i === panelStep ? 'bg-blue-600' : 'border border-gray-300 text-gray-400'
                      }`}
                    >
                      {i < panelStep ? '✓' : i + 1}
                    </span>
                    {step.title}
                  </button>
                  {i < PANEL_STEPS.length - 1 && <span className="text-gray-200">—</span>}
                </li>
              ))}
            </ol>

            {/* Step content */}
            <div className="flex-1 overflow-auto p-5">
              <Form form={form} layout="vertical">
                {panelStep === 0 && <StepDataSource selectedKeys={selectedDatasourceKeys} onSelectedKeysChange={setSelectedDatasourceKeys} />}
                {panelStep === 1 && <StepFieldMapping selectedDatasourceKeys={selectedDatasourceKeys} fieldMappings={fieldMappings} onFieldMappingsChange={setFieldMappings} />}
                {panelStep === 2 && (
                  <StepCalcAndSearch
                    calcFields={calcFields}
                    onCalcFieldsChange={setCalcFields}
                    searchBindings={searchBindings}
                    onSearchBindingsChange={setSearchBindings}
                    selectedDatasourceKeys={selectedDatasourceKeys}
                    availableFields={fieldMappings.filter((f) => f.enabled).map((f) => f.fieldName)}
                  />
                )}
                {panelStep === 3 && <StepVisualization form={form} />}
                {panelStep === 4 && <StepPreview />}
              </Form>

              {/* Category/refresh settings only visible on step 0 */}
              {panelStep === 0 && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">보고서 설정</div>
                  <Form form={form} layout="vertical">
                    <Form.Item name="refreshMode" label="갱신 방식">
                      <Radio.Group buttonStyle="solid" size="small">
                        <Radio.Button value="AUTO">자동</Radio.Button>
                        <Radio.Button value="MANUAL">수동</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item name="defaultW" label="기본 너비 (칸)">
                        <InputNumber min={1} max={12} size="small" style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="defaultH" label="기본 높이 (칸)">
                        <InputNumber min={1} max={12} size="small" style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                  </Form>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="flex flex-shrink-0 items-center justify-between border-t bg-gray-50 px-5 py-3">
              <button
                onClick={() => setPanelStep((p) => Math.max(0, p - 1))}
                disabled={panelStep === 0}
                className="text-[12px] text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                ← 이전
              </button>
              <div className="flex items-center gap-2">
                {panelStep < PANEL_STEPS.length - 1 && (
                  <Button size="small" onClick={() => setPanelStep((p) => p + 1)}>
                    건너뛰기
                  </Button>
                )}
                {panelStep < PANEL_STEPS.length - 1 ? (
                  <Button size="small" type="primary" onClick={() => setPanelStep((p) => p + 1)}>
                    다음 →
                  </Button>
                ) : (
                  <Button size="small" type="primary" onClick={handleAddToCanvas}>
                    캔버스에 추가
                  </Button>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function SectionCard({ section, isEditing, onEdit, onDelete }: { section: Section; isEditing: boolean; onEdit: () => void; onDelete: () => void }) {
  const vizLabel = section.visualization ? VIZ_LABELS[section.visualization] : null;
  const datasourceKey = section.datasourceKeys[0] ?? '';

  return (
    <div className={`rounded border-2 bg-white shadow-sm transition ${isEditing ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'}`} onDoubleClick={onEdit}>
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{section.title}</span>
          {isEditing && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">편집 중</span>}
          {vizLabel && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{vizLabel}</span>}
          {datasourceKey && <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{datasourceKey}</span>}
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button className="rounded p-1 hover:bg-gray-100" title="검색조건">
            ⌕
          </button>
          <button className="rounded p-1 hover:bg-gray-100" title="편집" onClick={onEdit}>
            ⚙
          </button>
          <button className="rounded p-1 hover:bg-gray-100 hover:text-red-500" title="삭제" onClick={onDelete}>
            ×
          </button>
        </div>
      </div>

      {/* Section content placeholder */}
      <div className="px-4 py-6 text-center text-[11px] text-gray-400">
        {section.fieldMappings.filter((f) => f.enabled).length > 0 ? (
          <div className="space-y-1 text-left">
            {section.fieldMappings
              .filter((f) => f.enabled)
              .slice(0, 4)
              .map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-gray-100 px-2.5 py-1.5 text-[12px]">
                  <span className="font-mono text-gray-700">{f.fieldName}</span>
                  <span className="text-gray-400">{f.chartRole || (f.showInGrid ? '그리드' : '숨김')}</span>
                </div>
              ))}
            {section.fieldMappings.filter((f) => f.enabled).length > 4 && (
              <div className="text-[11px] text-gray-400">+ {section.fieldMappings.filter((f) => f.enabled).length - 4}개 더</div>
            )}
          </div>
        ) : (
          <span>섹션을 더블클릭하여 설정을 시작하세요</span>
        )}
      </div>
    </div>
  );
}
