import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { recogQueryKeys, useUpdateRecogGroup } from '../hooks/useRecogQueries';
import type { RecogGroupItem } from '../types';

interface RecogGroupEditModalProps {
  open: boolean;
  group: RecogGroupItem;
  onClose: () => void;
  onUpdated: (group: RecogGroupItem) => void;
}

export default function RecogGroupEditModal({ open, group, onClose, onUpdated }: RecogGroupEditModalProps) {
  const [form] = Form.useForm<{ groupName: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) form.setFieldsValue({ groupName: group.groupName });
  }, [open, group, form]);

  const { mutate: updateGroup, isPending } = useUpdateRecogGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList.queryKey });
        onUpdated({ ...group, groupName: form.getFieldValue('groupName') as string });
        onClose();
      },
      onError: () => {
        toast.error('저장에 실패했습니다.');
      },
    },
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      updateGroup({ groupCode: group.groupCode, groupName: values.groupName });
    });
  };

  return (
    <Modal open={open} title="그룹 수정" onOk={handleOk} onCancel={onClose} confirmLoading={isPending} okText="저장" cancelText="취소">
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="groupName" label="그룹명" required rules={[{ required: true, message: '그룹명을 입력해주세요.' }]}>
          <Input placeholder="그룹명을 입력하세요." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
