/**
 * MCS DNIS 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 필드:
 * - 대표번호 (readonly)
 * - 노드 (Select, 등록 시)
 * - 시작DNIS (Input, 숫자만, max 50)
 * - 개수 (InputNumber, max 10)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMcsDnis } from '../hooks/useMcsDnisQueries';
import type { McsdDnis } from '../types';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface DnisDrawerRef {
  open: (data?: McsdDnis, gdnNo?: string, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const DnisDrawer = forwardRef<DnisDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [gdnNo, setGdnNo] = useState<string>('');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  useImperativeHandle(ref, () => ({
    open: (_data?: McsdDnis, initGdnNo?: string, nodeList?: NodeOption[]) => {
      setGdnNo(initGdnNo ?? '');
      setNodeOptions(nodeList ?? []);
      setVisible(true);
    },
    close: () => handleClose(),
  }));

  const handleClose = useCallback(() => {
    setVisible(false);
    setGdnNo('');
    setNodeOptions([]);
    form.resetFields();
  }, [form]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ count: 1 });
    }
  }, [visible, form]);

  // ─── Mutations ────────────────────────────────────────────────────────
  const { mutate: createDnis, isPending: isCreating } = useCreateMcsDnis({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DNIS가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (!gdnNo) {
        toast.error('대표번호가 지정되지 않았습니다.');
        return;
      }
      if (!values.nodeId) {
        toast.error('노드를 선택하세요.');
        return;
      }
      createDnis({
        mcsdGdnNo: gdnNo,
        nodeId: values.nodeId,
        startDnis: values.startDnis,
        count: values.count,
      });
    } catch {
      /* validation failed */
    }
  }, [form, gdnNo, createDnis]);

  return (
    <Drawer
      title="DNIS 등록"
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isCreating}>
            등록
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ count: 1 }}>
        <Form.Item label="대표번호">
          <Input value={gdnNo} disabled />
        </Form.Item>

        <Form.Item name="nodeId" label="노드" rules={[{ required: true, message: '노드를 선택하세요' }]}>
          <Select placeholder="노드를 선택하세요" options={nodeOptions.map((n) => ({ label: n.nodeName, value: n.nodeId }))} />
        </Form.Item>

        <Form.Item
          name="startDnis"
          label="시작 DNIS"
          rules={[
            { required: true, message: '시작 DNIS는 필수입니다' },
            { max: 50, message: '시작 DNIS는 50자 이내여야 합니다' },
            { pattern: /^[0-9]*$/, message: '시작 DNIS는 숫자만 입력 가능합니다' },
          ]}
        >
          <Input placeholder="시작 DNIS를 입력하세요" maxLength={50} />
        </Form.Item>

        <Form.Item name="count" label="개수" rules={[{ required: true, message: '개수는 필수입니다' }]}>
          <InputNumber min={1} max={9999999999} placeholder="1" className="w-full" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DnisDrawer.displayName = 'DnisDrawer';
export default DnisDrawer;
