/**
 * Step 추가/편집 Drawer
 */

import { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, Select, Switch, Tag } from 'antd';
import { ChevronDown } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import type { FlowStep } from '../types/bffFlow.types';

interface StepEditDrawerProps {
  open: boolean;
  step: FlowStep | null;
  onOk: (step: FlowStep) => void;
  onCancel: () => void;
  onDelete?: (stepId: string) => void;
}

const METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

const SERVICE_KEY_OPTIONS = [
  { label: 'manager', value: 'manager' },
  { label: 'fca', value: 'fca' },
  { label: 'auth', value: 'auth' },
  { label: 'aoe', value: 'aoe' },
];

export default function StepEditDrawer({ open, step, onOk, onCancel, onDelete }: StepEditDrawerProps) {
  const [form] = Form.useForm<FlowStep>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isEdit = step !== null;

  // Advanced fields state
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [params, setParams] = useState<Record<string, string> | undefined>(undefined);
  const [requiredPerms, setRequiredPerms] = useState<string[]>([]);
  const [permInput, setPermInput] = useState('');
  const [bodyMap, setBodyMap] = useState<Record<string, string> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (step) {
      form.setFieldsValue({
        id: step.id,
        method: step.method ?? 'GET',
        serviceKey: step.serviceKey,
        uri: step.uri,
        forwardUserToken: step.forwardUserToken ?? false,
        continueOnError: step.continueOnError ?? false,
        body: step.body,
      });
      setHeaders(step.headers ?? undefined);
      setParams(step.params ?? undefined);
      setRequiredPerms(step.requiredPerms ?? []);
      setPermInput('');
      setBodyMap(step.body?.map ?? undefined);
      setAdvancedOpen(false);
    } else {
      form.resetFields();
      form.setFieldsValue({ method: 'GET', forwardUserToken: true, continueOnError: false });
      // Reset advanced fields
      setHeaders(undefined);
      setParams(undefined);
      setRequiredPerms([]);
      setPermInput('');
      setBodyMap(undefined);
      setAdvancedOpen(false);
    }
  }, [open, step, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // Build body spec with both from and map
      let bodySpec = step?.body;
      if (values.body?.from || bodyMap) {
        bodySpec = {
          from: values.body?.from ?? step?.body?.from,
          map: bodyMap,
        };
      }

      // permInput에 입력 중인 값도 저장에 포함 (Enter 없이 저장 버튼 클릭 시)
      const pendingPerm = permInput.trim().toUpperCase();
      const finalPerms = pendingPerm && !requiredPerms.includes(pendingPerm) ? [...requiredPerms, pendingPerm] : requiredPerms;

      const result: FlowStep = {
        ...(step ?? {}),
        id: values.id,
        method: values.method,
        serviceKey: values.serviceKey,
        uri: values.uri,
        forwardUserToken: values.forwardUserToken,
        continueOnError: values.continueOnError,
        headers: headers,
        params: params,
        requiredPerms: finalPerms.length > 0 ? finalPerms : undefined,
        body: bodySpec,
      };
      onOk(result);
    } catch {
      // validation error
    }
  };

  return (
    <Drawer
      title={isEdit ? 'Step 편집' : 'Step 추가'}
      open={open}
      onClose={onCancel}
      width={520}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="solid" onClick={onCancel}>
            취소
          </Button>
          {isEdit && onDelete && (
            <Button variant="solid" color="red" onClick={() => onDelete(step!.id)}>
              삭제
            </Button>
          )}
          <Button variant="solid" type="primary" onClick={handleOk}>
            {isEdit ? '수정' : '추가'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Step ID" name="id" rules={[{ required: true, message: 'Step ID를 입력해주세요' }]}>
          <Input placeholder="예: list, create, detail" disabled={isEdit} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="HTTP Method" name="method" rules={[{ required: true }]}>
            <Select options={METHOD_OPTIONS} />
          </Form.Item>

          <Form.Item label="서비스 키" name="serviceKey" rules={[{ required: true, message: '서비스 키를 선택해주세요' }]}>
            <Select placeholder="선택" options={SERVICE_KEY_OPTIONS} />
          </Form.Item>
        </div>

        <Form.Item label="URI" name="uri" rules={[{ required: true, message: 'URI를 입력해주세요' }]}>
          <Input placeholder="예: /api/manager/menus/{id}" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="토큰 전달" name="forwardUserToken" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="에러시 계속" name="continueOnError" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Form.Item label="Body From" name={['body', 'from']}>
          <Input placeholder="예: request (선택사항)" />
        </Form.Item>
      </Form>

      <div className="mt-4 border border-[#d9d9d9] rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-[#fafafa] hover:bg-gray-100 transition-colors"
          onClick={() => setAdvancedOpen((prev) => !prev)}
        >
          <span>고급 설정</span>
          <ChevronDown className={`size-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
        {advancedOpen && (
          <div className="px-4 pb-4 pt-3 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Headers</label>
              <KeyValueEditor value={headers} onChange={setHeaders} keyPlaceholder="헤더명" valuePlaceholder="값" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Params</label>
              <KeyValueEditor value={params} onChange={setParams} keyPlaceholder="파라미터명" valuePlaceholder="기본값" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Required Perms</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {requiredPerms.map((perm) => (
                  <Tag key={perm} closable onClose={() => setRequiredPerms((prev) => prev.filter((p) => p !== perm))}>
                    {perm}
                  </Tag>
                ))}
              </div>
              <Input
                placeholder="권한 입력 후 Enter (예: MENU_READ)"
                value={permInput}
                onChange={(e) => setPermInput(e.target.value)}
                onPressEnter={() => {
                  const val = permInput.trim().toUpperCase();
                  if (val && !requiredPerms.includes(val)) {
                    setRequiredPerms((prev) => [...prev, val]);
                  }
                  setPermInput('');
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Body 매핑</label>
              <KeyValueEditor value={bodyMap} onChange={setBodyMap} keyPlaceholder="필드명" valuePlaceholder="JSONPath (예: $.auth.userId)" />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
