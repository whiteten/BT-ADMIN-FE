import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { recogQueryKeys, useUpdateRecogGroup } from '../hooks/useRecogQueries';
import type { RecogGroupItem } from '../types';

export interface RecogGroupEditModalRef {
  open: (group: RecogGroupItem) => void;
  close: () => void;
}

interface RecogGroupEditModalProps {
  onUpdated: (group: RecogGroupItem) => void;
}

const RecogGroupEditModal = forwardRef<RecogGroupEditModalRef, RecogGroupEditModalProps>(({ onUpdated }, ref) => {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<RecogGroupItem | null>(null);
  const [form] = Form.useForm<{ groupName: string }>();
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    open: (g: RecogGroupItem) => {
      setGroup(g);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  useEffect(() => {
    if (open && group) {
      form.setFieldsValue({ groupName: group.groupName });
    } else {
      form.resetFields();
    }
  }, [open, group, form]);

  const { mutate: updateGroup, isPending } = useUpdateRecogGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList._def });
        if (group) onUpdated({ ...group, groupName: form.getFieldValue('groupName') as string });
        handleClose();
      },
      onError: () => {
        toast.error('저장에 실패했습니다.');
      },
    },
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      if (!group) return;
      updateGroup({ groupCode: group.groupCode, groupName: values.groupName });
    });
  };

  return (
    <Modal open={open} title="그룹 수정" onOk={handleOk} onCancel={handleClose} confirmLoading={isPending} okText="저장" cancelText="취소" destroyOnHidden>
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="groupName" label="그룹명" required rules={[{ required: true, message: '그룹명을 입력해주세요.' }]}>
          <Input placeholder="그룹명을 입력하세요." />
        </Form.Item>
      </Form>
    </Modal>
  );
});

RecogGroupEditModal.displayName = 'RecogGroupEditModal';
export default RecogGroupEditModal;
