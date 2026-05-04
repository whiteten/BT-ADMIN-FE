import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { toolQueryKeys, useCreateToolGroup, useDeleteToolGroup, useUpdateToolGroup } from '../hooks/useToolQueries';
import type { ToolGroup, ToolGroupCreateDatas } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface ToolGroupDrawerRef {
  open: (group?: ToolGroup) => void;
  close: () => void;
}

interface FormValues {
  groupName: string;
  description?: string;
}

const ToolGroupDrawer = forwardRef<ToolGroupDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ToolGroup | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!editGroup;

  const { mutate: createGroup, isPending: isCreating } = useCreateToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('createToolGroup failed', error),
    },
  });

  const { mutate: updateGroup, isPending: isUpdating } = useUpdateToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('updateToolGroup failed', error),
    },
  });

  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('deleteToolGroup failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (group) => {
      setEditGroup(group ?? null);
      if (group) {
        form.setFieldsValue({ groupName: group.groupName, description: group.description ?? undefined });
      } else {
        form.resetFields();
      }
      setOpen(true);
    },
    close: handleClose,
  }));

  const handleClose = () => {
    setOpen(false);
    form.resetFields();
    setEditGroup(null);
  };

  const onFinish = (values: FormValues) => {
    const data: ToolGroupCreateDatas = { groupName: values.groupName, description: values.description };
    if (isEdit) {
      updateGroup({ params: { groupId: editGroup.groupId }, data });
    } else {
      createGroup(data);
    }
  };

  const handleDelete = () => {
    if (!editGroup) return;
    modal.confirm.delete({
      onOk: () => deleteGroup({ groupId: editGroup.groupId }),
    });
  };

  return (
    <Drawer
      title={isEdit ? 'API 그룹 수정' : 'API 그룹 생성'}
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      width={480}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between">
          {isEdit && (
            <Button color="danger" variant="solid" loading={isDeleting} onClick={handleDelete}>
              삭제
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" loading={isCreating || isUpdating} onClick={() => form.submit()}>
              저장
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="groupName" label="그룹명" required rules={[{ required: true, message: '그룹명을 입력해 주세요.' }]}>
          <Input placeholder="그룹명을 입력하세요." />
        </Form.Item>
        <Form.Item name="description" label="설명">
          <Input.TextArea placeholder="그룹 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

ToolGroupDrawer.displayName = 'ToolGroupDrawer';
export default ToolGroupDrawer;
