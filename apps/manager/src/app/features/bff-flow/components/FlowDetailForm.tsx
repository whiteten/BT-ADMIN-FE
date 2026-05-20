/**
 * Flow 상세/편집/생성 폼
 *
 * [생성 모드] flow === null
 *   - 기본정보(flowId, description, stopOnError)만 입력 후 생성
 *   - Step 탭은 생성 완료 후 편집 모드 전환 시 사용 가능
 *
 * [편집 모드] flow !== null
 *   - 기본정보 탭 / Steps 탭으로 분리 (shadcn Tabs — RoleDetailPage 동일 패턴)
 *   - 기본정보 탭: 저장 버튼으로 기본정보만 저장
 *   - Steps 탭: Step 추가/수정/삭제 시 즉시 API 저장 (BFF 리프레시 포함)
 */

import { useEffect, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Col, Form, Input, Row, Switch, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import StepEditDrawer from './StepEditDrawer';
import { useSaveFlow } from '../hooks/useBffFlowQueries';
import type { BffFlow, FlowSpec, FlowStep } from '../types/bffFlow.types';
import { IconDocument, IconLayer, IconTrash } from '@/components/custom/Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/libs/shared-ui/src/components/shadcn/tabs';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FlowDetailFormProps {
  flow: BffFlow | null;
  onSave: (flowId: string, spec: FlowSpec) => void;
  onSaved?: (flow: BffFlow) => void;
  onDelete?: (flowId: string) => void;
  saving?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
};

/** TabsTrigger 공통 스타일 (RoleDetailPage/PageTabs 동일) */
const TAB_TRIGGER_CLASS =
  'w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]';

export default function FlowDetailForm({ flow, onSave, onSaved, onDelete, saving }: FlowDetailFormProps) {
  const [form] = Form.useForm<{ flowId: string; description: string; stopOnError: boolean }>();
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
  const [isStepDrawerOpen, setIsStepDrawerOpen] = useState(false);
  const prevFlowIdRef = useRef<string | null>(null);
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const { mutate: saveStep, isPending: isSavingStep } = useSaveFlow({
    mutationOptions: {
      onSuccess: (saved) => {
        toast.success('저장되었습니다');
        setIsStepDrawerOpen(false);
        setEditingStep(null);
        onSaved?.(saved);
      },
    },
  });

  const { mutate: deleteStep, isPending: isDeletingStep } = useSaveFlow({
    mutationOptions: {
      onSuccess: (saved) => {
        toast.success('삭제되었습니다');
        setIsStepDrawerOpen(false);
        setEditingStep(null);
        onSaved?.(saved);
      },
    },
  });

  const isCreateMode = flow === null;

  // flow가 교체될 때만 폼 초기화
  // - 같은 flow에서 step만 변경되어 re-render 될 경우 사용자의 미저장 기본정보 편집 내용 유지
  useEffect(() => {
    const currentFlowId = flow?.flowId ?? null;
    if (currentFlowId === prevFlowIdRef.current) return;
    prevFlowIdRef.current = currentFlowId;

    if (flow) {
      form.setFieldsValue({
        flowId: flow.flowId,
        description: flow.spec.description ?? flow.description,
        stopOnError: flow.spec.stopOnError,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ stopOnError: true });
    }
  }, [flow, form]);

  // ── 생성 모드 ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      onSave(values.flowId, {
        description: values.description,
        stopOnError: values.stopOnError,
        steps: [],
      });
    } catch {
      // validation error
    }
  };

  // ── 편집 모드: 기본정보 ────────────────────────────────────────────────────

  const handleMetaSave = async () => {
    if (!flow) return;
    try {
      const values = await form.validateFields();
      onSave(flow.flowId, {
        description: values.description,
        stopOnError: values.stopOnError,
        steps: flow.spec.steps ?? [],
        compensation: flow.spec.compensation,
        compose: flow.spec.compose,
      });
    } catch {
      // validation error
    }
  };

  const handleFlowDelete = () => {
    if (!flow || !onDelete) return;
    modal.confirm.delete({
      options: { content: `"${flow.flowId}" Flow를 삭제하시겠습니까?` },
      onOk: () => onDelete(flow.flowId),
    });
  };

  // ── 편집 모드: Steps ───────────────────────────────────────────────────────

  const handleStepSave = (step: FlowStep) => {
    if (!flow) return;
    const currentSteps = flow.spec.steps ?? [];
    const updatedSteps = editingStep ? currentSteps.map((s) => (s.id === editingStep.id ? step : s)) : [...currentSteps, step];
    saveStep({
      flowId: flow.flowId,
      spec: {
        description: flow.spec.description ?? flow.description,
        stopOnError: flow.spec.stopOnError,
        steps: updatedSteps,
        compensation: flow.spec.compensation,
        compose: flow.spec.compose,
      },
    });
  };

  const handleStepDelete = (stepId: string) => {
    modal.confirm.delete({
      options: { content: `"${stepId}" Step을 삭제하시겠습니까?` },
      onOk: () => {
        if (!flow) return;
        const updatedSteps = flow.spec.steps.filter((s) => s.id !== stepId);
        deleteStep({
          flowId: flow.flowId,
          spec: {
            description: flow.spec.description ?? flow.description,
            stopOnError: flow.spec.stopOnError,
            steps: updatedSteps,
            compensation: flow.spec.compensation,
            compose: flow.spec.compose,
          },
        });
      },
    });
  };

  const handleStepAddClick = () => {
    setEditingStep(null);
    setIsStepDrawerOpen(true);
  };

  const handleStepEditClick = (step: FlowStep) => {
    setEditingStep(step);
    setIsStepDrawerOpen(true);
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<FlowStep>) => {
    if (!event.data) return;
    handleStepEditClick(event.data);
  };

  const handleStepDrawerCancel = () => {
    setIsStepDrawerOpen(false);
    setEditingStep(null);
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  const steps = flow?.spec.steps ?? [];

  const columnDefs: ColDef<FlowStep>[] = [
    {
      headerName: 'Step ID',
      field: 'id',
      maxWidth: 160,
      cellRenderer: (params: ICellRendererParams<FlowStep>) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{params.value as string}</code>,
    },
    {
      headerName: '방식',
      field: 'method',
      maxWidth: 90,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<FlowStep>) => <Tag color={METHOD_COLORS[params.value as string] ?? 'default'}>{params.value as string}</Tag>,
    },
    {
      headerName: '서비스',
      field: 'serviceKey',
      maxWidth: 120,
    },
    {
      headerName: 'URI',
      field: 'uri',
      flex: 1,
      cellRenderer: (params: ICellRendererParams<FlowStep>) => <code className="text-xs">{params.value as string}</code>,
    },
    {
      headerName: '토큰',
      field: 'forwardUserToken',
      maxWidth: 70,
      cellRenderer: (params: ICellRendererParams<FlowStep>) => (params.value ? '✓' : ''),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<FlowStep>) => {
        if (!params.data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepDelete(params.data!.id);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  // ── 생성 모드 렌더 ─────────────────────────────────────────────────────────

  if (isCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white bt-shadow overflow-hidden">
        <div className="flex-1 overflow-y-auto p-7">
          <div className="flex gap-2 items-center text-[var(--color-bt-primary)] mb-6">
            <IconDocument className="h-5 w-5" />
            <span className="text-[20px] font-bold">Flow 생성</span>
          </div>
          <Form form={form} layout="vertical" className="max-w-2xl">
            <Form.Item
              label="Flow ID"
              name="flowId"
              rules={[
                { required: true, message: 'Flow ID를 입력해주세요' },
                { pattern: /^[a-z0-9-]+$/, message: '영소문자, 숫자, 하이픈만 사용 가능합니다' },
              ]}
            >
              <Input placeholder="예: menu-list, role-create" />
            </Form.Item>
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item label="설명" name="description">
                  <Input placeholder="Flow 설명" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="에러시 중단" name="stopOnError" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
        <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 border-t border-gray-100 px-7">
          <Col>
            <Button color="primary" variant="solid" loading={saving} onClick={handleCreate}>
              생성
            </Button>
          </Col>
        </Row>
      </div>
    );
  }

  // ── 편집 모드 렌더 (탭 구조) ───────────────────────────────────────────────

  return (
    <>
      <Tabs defaultValue="basic" className="w-full h-full gap-4 overflow-hidden flex flex-col">
        {/* 탭 바 — PageTabs / RoleDetailPage 동일 스타일 */}
        <div className="flex w-full h-[58px] min-h-[58px] bg-white bt-shadow">
          <TabsList className="h-full p-0 bg-white">
            <TabsTrigger value="basic" className={TAB_TRIGGER_CLASS}>
              <div className="flex items-center justify-center gap-2 min-w-[184px]">
                <IconDocument className="h-5 w-5" />
                <span>기본정보</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="steps" className={TAB_TRIGGER_CLASS}>
              <div className="flex items-center justify-center gap-2 min-w-[184px]">
                <IconLayer className="h-5 w-5" />
                <span>Steps ({steps.length})</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 기본정보 탭 */}
        <TabsContent value="basic" className="flex-0 w-full h-[calc(100%-58px-16px)] min-h-[calc(100%-58px-16px)]">
          <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
            <div className="flex flex-col w-full p-7">
              <div className="flex gap-2 items-center text-[var(--color-bt-primary)] mb-6">
                <IconDocument className="h-5 w-5" />
                <span className="text-[20px] font-bold">기본정보</span>
              </div>
              <Form form={form} layout="vertical" className="max-w-2xl">
                <Row gutter={20}>
                  <Col span={12}>
                    <Form.Item label="설명" name="description">
                      <Input placeholder="Flow 설명" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="에러시 중단" name="stopOnError" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              {/* 기본정보 탭의 액션 버튼 — RoleBasicInfoTab 동일 패턴 */}
              <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 mt-6 border-t border-gray-100">
                <Col>
                  <Button color="red" variant="solid" onClick={handleFlowDelete} disabled={saving}>
                    삭제
                  </Button>
                </Col>
                <Col>
                  <Button color="primary" variant="solid" loading={saving} onClick={handleMetaSave}>
                    저장
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </TabsContent>

        {/* Steps 탭 */}
        <TabsContent value="steps" className="flex-0 w-full h-[calc(100%-58px-16px)] min-h-[calc(100%-58px-16px)]">
          <div className="w-full h-full bg-white bt-shadow overflow-hidden">
            <div className="flex flex-col w-full h-full p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 items-center text-[var(--color-bt-primary)]">
                  <IconLayer className="h-5 w-5" />
                  <span className="text-[20px] font-bold">Steps ({steps.length})</span>
                </div>
                <Button disabled={isSavingStep || isDeletingStep} onClick={handleStepAddClick}>
                  + 추가
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <AgGridReact<FlowStep>
                  rowData={steps}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                  getRowId={(params) => params.data.id}
                  onRowDoubleClicked={handleRowDoubleClick}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <StepEditDrawer open={isStepDrawerOpen} step={editingStep} onOk={handleStepSave} onCancel={handleStepDrawerCancel} onDelete={handleStepDelete} />
    </>
  );
}
