import { forwardRef, useImperativeHandle, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { Form, Input, Modal } from 'antd';
import { Log } from '@/log';

export interface ClusterGroupDialogRef {
  open: (mode: 'create' | 'edit', data?: { clusterGrpId: number; clusterGrpName: string }) => void;
}

interface ClusterGroupDialogProps {
  onSubmit: (mode: 'create' | 'edit', values: { clusterGrpId?: number; clusterGrpName: string }) => void;
  isPending?: boolean;
}

const ClusterGroupDialog = forwardRef<ClusterGroupDialogRef, ClusterGroupDialogProps>(({ onSubmit, isPending }, ref) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | undefined>();
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: (m, data) => {
      setMode(m);
      if (m === 'edit' && data) {
        setEditId(data.clusterGrpId);
        form.setFieldsValue({ clusterGrpName: data.clusterGrpName });
      } else {
        setEditId(undefined);
        form.resetFields();
      }
      setVisible(true);
    },
  }));

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      Log.debug('ClusterGroupDialog onSubmit', { mode, values });
      onSubmit(mode, { clusterGrpId: editId, clusterGrpName: values.clusterGrpName });
      setVisible(false);
      form.resetFields();
    } catch (error) {
      Log.warn('ClusterGroupDialog validation failed', error);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    form.resetFields();
  };

  return (
    <Modal
      title={mode === 'create' ? '클러스터 그룹 추가' : '클러스터 그룹 수정'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={mode === 'create' ? '추가' : '저장'}
      cancelText="취소"
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="clusterGrpName"
          label="클러스터 그룹명"
          required
          rules={[
            { required: true, message: '클러스터 그룹명은 필수입니다.' },
            { max: 200, message: '클러스터 그룹명은 200자 이내여야 합니다.' },
          ]}
        >
          <Input placeholder="클러스터 그룹명을 입력하세요." maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

ClusterGroupDialog.displayName = 'ClusterGroupDialog';

export default ClusterGroupDialog;
