/**
 * 노드 기본 MS 설정 다이얼로그
 * AS-IS: poNodeWindow (400x200) — RTP 중개 + MS그룹 2개 필드
 */
import { useCallback, useEffect, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import { toast } from '@/shared-util';
import { useGetNodeMsSetting, useUpdateNodeMsSetting } from '../hooks/useMsGroupQueries';
import { type MsGroup, NAT_OPTION_OPTIONS } from '../types';

interface Props {
  nodeId: number | null;
  nodeName: string;
  msGroups: MsGroup[]; // 해당 노드의 MS그룹 목록
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NodeMsSettingDialog({ nodeId, nodeName, msGroups, open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();

  const { data: setting, isLoading } = useGetNodeMsSetting({
    params: nodeId ? { id: nodeId } : undefined,
    queryOptions: { enabled: !!nodeId && open },
  });

  const { mutate: updateSetting, isPending } = useUpdateNodeMsSetting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드 기본 MS 설정이 저장되었습니다.');
        onClose();
        onSuccess();
      },
    },
  });

  useEffect(() => {
    if (open && setting) {
      form.setFieldsValue({
        msGroupId: setting.msGroupId ?? 0,
        natOption: setting.natOption ?? 0,
      });
    }
  }, [open, setting, form]);

  const handleOk = useCallback(async () => {
    if (!nodeId) return;
    try {
      const values = await form.validateFields();
      updateSetting({
        id: nodeId,
        data: {
          msGroupId: values.msGroupId === 0 ? null : values.msGroupId,
          natOption: values.natOption,
        },
      });
    } catch {
      /* validation failed */
    }
  }, [form, nodeId, updateSetting]);

  const msGroupOptions = [{ label: '미지정', value: 0 }, ...msGroups.map((g) => ({ label: g.msGroupName, value: g.msGroupId }))];

  return (
    <Modal
      title={`노드 기본 MS 설정 - ${nodeName}`}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="저장"
      cancelText="닫기"
      width={400}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ msGroupId: 0, natOption: 0 }}>
        <h4 className="text-sm font-semibold text-gray-700 pb-1.5 mb-3 border-b border-gray-200">RTP 중개</h4>

        <Form.Item name="natOption" label="노드 RTP 중개">
          <Select options={[...NAT_OPTION_OPTIONS]} />
        </Form.Item>

        <Form.Item name="msGroupId" label="MS그룹">
          <Select options={msGroupOptions} loading={isLoading} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
