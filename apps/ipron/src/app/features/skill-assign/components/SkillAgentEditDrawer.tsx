/**
 * 스킬 배정 P/L 수정 드로어 — 칩 클릭 시 열림.
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, InputNumber, Space } from 'antd';
import { toast } from '@/shared-util';
import { useUpdateSkillAgent } from '../hooks/useSkillAssignQueries';
import type { SkillAgentResponse } from '../types';

interface Props {
  open: boolean;
  row: SkillAgentResponse | null;
  onClose: () => void;
}

export default function SkillAgentEditDrawer({ open, row, onClose }: Props) {
  const [form] = Form.useForm();

  const { mutate, isPending } = useUpdateSkillAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (open && row) {
      form.setFieldsValue({ priority: row.priority ?? 0, skillLevel: row.skillLevel ?? 0 });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, row, form]);

  if (!row) return null;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      mutate({
        agentId: row.agentId,
        skillsetId: row.skillsetId,
        body: { priority: values.priority, skillLevel: values.skillLevel },
      });
    } catch {
      // form validation: silent
    }
  };

  return (
    <Drawer
      title={`스킬 우선순위/스킬레벨 수정 — ${row.skillsetName}`}
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} onClick={onSubmit}>
            저장
          </Button>
        </Space>
      }
    >
      <div className="mb-3 text-xs text-gray-500">
        상담사: <span className="font-semibold text-gray-800">{row.agentName ?? row.agentLoginId}</span>
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          label="우선순위 (PRIORITY, 0~9)"
          name="priority"
          rules={[{ required: true, message: '필수' }]}
          tooltip="같은 스킬 보유자 중 작은 값이 먼저 호출 받음 (0 = 1순위)"
        >
          <InputNumber min={0} max={9} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="스킬 레벨 (SKILL_LEVEL, 0~99)" name="skillLevel" rules={[{ required: true, message: '필수' }]} tooltip="같은 PRIORITY 라면 큰 값이 가중치 우위">
          <InputNumber min={0} max={99} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
