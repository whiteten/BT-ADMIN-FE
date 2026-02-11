/**
 * Step 추가/편집 Drawer
 */

import { useEffect, useState } from 'react';
import { Button, Collapse, Drawer, Form, Input, Select, Switch } from 'antd';
import { Save, X } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import type { FlowStep } from '../types/bffFlow.types';

interface StepEditDrawerProps {
  open: boolean;
  step: FlowStep | null;
  onOk: (step: FlowStep) => void;
  onCancel: () => void;
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
];

export default function StepEditDrawer({ open, step, onOk, onCancel }: StepEditDrawerProps) {
  const [form] = Form.useForm<FlowStep>();
  const isEdit = step !== null;

  // Advanced fields state
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [params, setParams] = useState<Record<string, string> | undefined>(undefined);
  const [requiredPerms, setRequiredPerms] = useState<string[]>([]);
  const [bodyMap, setBodyMap] = useState<Record<string, string> | undefined>(undefined);

  useEffect(() => {
    if (open && step) {
      form.setFieldsValue({
        id: step.id,
        method: step.method ?? 'GET',
        serviceKey: step.serviceKey,
        uri: step.uri,
        forwardUserToken: step.forwardUserToken ?? false,
        continueOnError: step.continueOnError ?? false,
        body: step.body,
      });
      // Initialize advanced fields
      setHeaders(step.headers);
      setParams(step.params);
      setRequiredPerms(step.requiredPerms ?? []);
      setBodyMap(step.body?.map);
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({ method: 'GET', forwardUserToken: true, continueOnError: false });
      // Reset advanced fields
      setHeaders(undefined);
      setParams(undefined);
      setRequiredPerms([]);
      setBodyMap(undefined);
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
        requiredPerms: requiredPerms.length > 0 ? requiredPerms : undefined,
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
        <div className="flex justify-end gap-2">
          <Button icon={<X className="size-4" />} onClick={onCancel}>
            취소
          </Button>
          <Button type="primary" icon={<Save className="size-4" />} onClick={handleOk}>
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

        <Collapse
          className="mt-4"
          items={[
            {
              key: 'advanced',
              label: '고급 설정',
              children: (
                <div className="space-y-4">
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
                    <Select mode="tags" placeholder="권한 입력 (예: MENU_READ)" value={requiredPerms} onChange={setRequiredPerms} className="w-full" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Body 매핑</label>
                    <KeyValueEditor value={bodyMap} onChange={setBodyMap} keyPlaceholder="필드명" valuePlaceholder="JSONPath (예: $.auth.userId)" />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
}
