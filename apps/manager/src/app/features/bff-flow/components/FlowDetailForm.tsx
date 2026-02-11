/**
 * Flow 상세/편집/생성 폼
 * - flow가 null이면 생성 모드 (flowId 입력 가능)
 * - flow가 있으면 편집 모드 (flowId 읽기전용)
 * - 기본정보 (flowId, description, stopOnError)
 * - Steps 테이블 (추가/편집/삭제)
 * - 저장/삭제/리프레시 버튼
 */

import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Pencil, Trash2 } from 'lucide-react';
import StepEditDrawer from './StepEditDrawer';
import type { BffFlow, FlowSpec, FlowStep } from '../types/bffFlow.types';

interface FlowDetailFormProps {
  flow: BffFlow | null;
  onSave: (flowId: string, spec: FlowSpec) => void;
  onDelete?: (flowId: string) => void;
  onRefresh?: () => void;
  saving?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
};

export default function FlowDetailForm({ flow, onSave, onDelete, onRefresh, saving }: FlowDetailFormProps) {
  const [form] = Form.useForm<{ flowId: string; description: string; stopOnError: boolean }>();
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);

  const isCreateMode = flow === null;

  useEffect(() => {
    if (flow) {
      form.setFieldsValue({
        flowId: flow.flowId,
        description: flow.spec.description ?? flow.description,
        stopOnError: flow.spec.stopOnError,
      });
      setSteps([...(flow.spec.steps ?? [])]);
    } else {
      form.resetFields();
      form.setFieldsValue({ stopOnError: true });
      setSteps([]);
    }
  }, [flow, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const spec: FlowSpec = {
        description: values.description,
        stopOnError: values.stopOnError,
        steps,
        compensation: flow?.spec.compensation,
        compose: flow?.spec.compose,
      };
      onSave(values.flowId, spec);
    } catch {
      // validation error
    }
  };

  const handleDelete = () => {
    if (!flow || !onDelete) return;
    Modal.confirm({
      title: 'Flow 삭제',
      content: `"${flow.flowId}" Flow를 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => onDelete(flow.flowId),
    });
  };

  const handleStepSave = (step: FlowStep) => {
    if (editingStep) {
      setSteps((prev) => prev.map((s) => (s.id === editingStep.id ? step : s)));
    } else {
      setSteps((prev) => [...prev, step]);
    }
    setIsStepModalOpen(false);
    setEditingStep(null);
  };

  const handleStepDelete = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const columns: ColumnsType<FlowStep> = [
    {
      title: '#',
      width: 50,
      render: (_, __, index) => index,
    },
    {
      title: 'Step ID',
      dataIndex: 'id',
      width: 120,
      render: (v: string) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</code>,
    },
    {
      title: '방식',
      dataIndex: 'method',
      width: 80,
      render: (v: string) => <Tag color={METHOD_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '서비스',
      dataIndex: 'serviceKey',
      width: 90,
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      ellipsis: true,
      render: (v: string) => <code className="text-xs">{v}</code>,
    },
    {
      title: '토큰',
      dataIndex: 'forwardUserToken',
      width: 60,
      render: (v: boolean) => (v ? '✓' : ''),
    },
    {
      title: '',
      width: 80,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button
            type="text"
            size="small"
            icon={<Pencil className="size-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              setEditingStep(record);
              setIsStepModalOpen(true);
            }}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 className="size-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              handleStepDelete(record.id);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{isCreateMode ? 'Flow 생성' : 'Flow 상세'}</h3>
        {!isCreateMode && <code className="text-sm text-gray-400">{flow.flowId}</code>}
      </div>

      <div className="flex-1 overflow-auto">
        {/* 기본정보 */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-600 mb-3">기본정보</h4>
          <Form form={form} layout="vertical" className="max-w-2xl">
            {isCreateMode && (
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
            )}
            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item label="설명" name="description">
                <Input placeholder="Flow 설명" />
              </Form.Item>
              <Form.Item label="에러시 중단" name="stopOnError" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </div>

        {/* Steps */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-600">Steps ({steps.length})</h4>
            <Button
              size="small"
              onClick={() => {
                setEditingStep(null);
                setIsStepModalOpen(true);
              }}
            >
              추가
            </Button>
          </div>
          <Table columns={columns} dataSource={steps} rowKey="id" size="small" pagination={false} />
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
        {!isCreateMode && (
          <>
            <Button danger onClick={handleDelete}>
              삭제
            </Button>
            <Button onClick={onRefresh}>리프레시</Button>
          </>
        )}
        <Button type="primary" onClick={handleSubmit} loading={saving}>
          {isCreateMode ? '생성' : '저장'}
        </Button>
      </div>

      <StepEditDrawer open={isStepModalOpen} step={editingStep} onOk={handleStepSave} onCancel={() => setIsStepModalOpen(false)} />
    </div>
  );
}
