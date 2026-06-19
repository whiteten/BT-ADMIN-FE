/**
 * DNIS 등록/수정 Drawer.
 *
 * <p>수정 시 노드/서비스번호/시나리오는 변경 불가 (AS-IS 동일 정책).</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useGetScenarios } from '../../scenario/hooks/useScenarioQueries';
import { dnisQueryKeys, useCreateDnis, useUpdateDnis } from '../hooks/useDnisQueries';
import { type DnisItem, TELCO_KIND_OPTIONS } from '../types/dnis.types';

const { TextArea } = Input;

interface FormValues {
  nodeId: number;
  dnisNo: string;
  serviceId: number;
  dnisName: string;
  tenantId: number;
  telcoKind?: number;
  ainNo?: string;
  dnisDesc?: string;
}

export interface DnisSheetRef {
  openCreate: () => void;
  openEdit: (dnis: DnisItem) => void;
  close: () => void;
}

interface Props {
  selectedNode: { nodeId: number; nodeName: string } | null;
  selectedTenantId: number | null;
}

const DnisSheet = forwardRef<DnisSheetRef, Props>(({ selectedNode, selectedTenantId }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<DnisItem | null>(null);
  const isEditMode = editing !== null;

  const { data: scenarios = [] } = useGetScenarios({
    params: selectedTenantId ? { tenantId: selectedTenantId } : undefined,
    queryOptions: { enabled: !!selectedTenantId && visible },
  });

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      form.resetFields();
      if (selectedNode && selectedTenantId) {
        form.setFieldsValue({ nodeId: selectedNode.nodeId, tenantId: selectedTenantId });
      }
      setEditing(null);
      setVisible(true);
    },
    openEdit: (dnis) => {
      form.resetFields();
      form.setFieldsValue({
        nodeId: dnis.nodeId,
        dnisNo: dnis.dnisNo,
        serviceId: dnis.serviceId,
        dnisName: dnis.dnisName,
        tenantId: dnis.tenantId,
        telcoKind: dnis.telcoKind ?? undefined,
        ainNo: dnis.ainNo ?? undefined,
        dnisDesc: dnis.dnisDesc ?? undefined,
      });
      setEditing(dnis);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateDnis();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateDnis();
  const isPending = isCreating || isUpdating;

  const handleSubmit = async (values: FormValues) => {
    const action = isEditMode ? '수정' : '등록';
    try {
      if (isEditMode && editing) {
        await updateAsync({
          params: { dnisNo: editing.dnisNo, nodeId: editing.nodeId },
          data: {
            dnisName: values.dnisName,
            telcoKind: values.telcoKind ?? null,
            ainNo: values.ainNo ?? null,
            dnisDesc: values.dnisDesc ?? null,
          },
        });
      } else {
        await createAsync(values);
      }
      toast.success(`${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: dnisQueryKeys.list._def });
      setVisible(false);
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  return (
    <Drawer
      title={isEditMode ? '서비스번호 수정' : '서비스번호 추가'}
      placement="right"
      styles={{ wrapper: { width: 480 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEditMode ? '저장' : '등록'}
          </Button>
        </div>
      }
    >
      {isEditMode && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          💡 수정 시 <b>노드 / 서비스번호 / 시나리오</b> 는 변경할 수 없습니다 (AS-IS 동일)
        </div>
      )}
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item name="nodeId" label="노드" required>
          <Select disabled options={selectedNode ? [{ value: selectedNode.nodeId, label: selectedNode.nodeName }] : []} placeholder="좌측에서 노드를 선택하세요" />
        </Form.Item>
        <Form.Item
          name="dnisNo"
          label="서비스번호"
          required
          rules={[
            { required: true, message: '서비스번호는 필수입니다' },
            { max: 50, message: '50자 이내' },
            { pattern: /^[0-9*#]+$/, message: '숫자와 *, # 만 입력 가능합니다' },
          ]}
        >
          <Input placeholder="숫자만 입력 (최대 50자)" maxLength={50} disabled={isEditMode} />
        </Form.Item>
        <Form.Item
          name="dnisName"
          label="서비스번호명"
          required
          rules={[
            { required: true, message: '서비스번호명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="이름 (최대 100자)" maxLength={100} />
        </Form.Item>
        <Form.Item name="serviceId" label="시나리오" required rules={[{ required: true, message: '시나리오는 필수입니다' }]}>
          <Select
            disabled={isEditMode}
            placeholder="시나리오 선택"
            showSearch
            optionFilterProp="label"
            options={scenarios.map((s) => ({ value: s.serviceId, label: s.serviceName }))}
          />
        </Form.Item>
        <Form.Item name="telcoKind" label="통신사">
          <Select allowClear options={[...TELCO_KIND_OPTIONS]} placeholder="(선택)" />
        </Form.Item>
        <Form.Item name="ainNo" label="지능망 대표번호" rules={[{ max: 32, message: '32자 이내' }]}>
          <Input placeholder="(선택, 최대 32자)" maxLength={32} />
        </Form.Item>
        <Form.Item name="dnisDesc" label="설명" rules={[{ max: 256, message: '256자 이내' }]}>
          <TextArea rows={3} maxLength={256} showCount placeholder="설명 (최대 256자)" />
        </Form.Item>
        <Form.Item name="tenantId" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DnisSheet.displayName = 'DnisSheet';
export default DnisSheet;
