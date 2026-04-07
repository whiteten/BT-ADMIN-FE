/**
 * DOD DNIS 변환 마스터 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMaster, useDeleteMaster, useUpdateMaster } from '../hooks/useDodTransQueries';
import type { DodTransMaster } from '../types/dodTrans.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface DodTransMasterDrawerRef {
  open: (data?: DodTransMaster, nodeId?: number, nodeName?: string, tenantId?: number, tenantName?: string) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const DodTransMasterDrawer = forwardRef<DodTransMasterDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<DodTransMaster | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantName, setTenantName] = useState<string>('');

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: DodTransMaster, initNodeId?: number, initNodeName?: string, initTenantId?: number, initTenantName?: string) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
      setTenantId(data?.tenantId ?? initTenantId ?? null);
      setTenantName(data?.tenantName ?? initTenantName ?? '');
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setNodeId(null);
      setNodeName('');
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        dodTransName: editData.dodTransName,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createMaster, isPending: isCreating } = useCreateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: updateMaster, isPending: isUpdating } = useUpdateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: deleteMaster, isPending: isDeleting } = useDeleteMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating || isDeleting;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setNodeId(null);
    setNodeName('');
    setTenantId(null);
    setTenantName('');
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!nodeId) {
        toast.error('노드 정보가 없습니다.');
        return;
      }

      const payload = {
        nodeId,
        tenantId: tenantId ?? undefined,
        dodTransName: values.dodTransName,
      };

      if (isEditMode && editData) {
        updateMaster({ id: editData.dodTransId, data: payload });
      } else {
        createMaster(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, createMaster, updateMaster]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    modal.confirm.execute({
      onOk: () => deleteMaster({ id: editData.dodTransId }),
      options: {
        title: 'DOD DNIS 변환 삭제',
        content: `"${editData.dodTransName}" 변환을 삭제하시겠습니까?\n등록된 패턴이 있으면 삭제할 수 없습니다.`,
      },
    });
  }, [editData, modal, deleteMaster]);

  return (
    <Drawer
      title={isEditMode ? 'DOD DNIS 변환 수정' : 'DOD DNIS 변환 등록'}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 420 } }}
      footer={
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button danger onClick={handleDelete} loading={isDeleting}>
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="노드">
          <Input value={nodeName || (nodeId ? `Node ${nodeId}` : '')} disabled />
        </Form.Item>

        <Form.Item label="테넌트">
          <Input value={tenantName || (tenantId ? `Tenant ${tenantId}` : '')} disabled />
        </Form.Item>

        <Form.Item
          name="dodTransName"
          label="DOD DNIS 변환명"
          required
          rules={[
            { required: true, message: 'DOD DNIS 변환명은 필수입니다' },
            { max: 100, message: 'DOD DNIS 변환명은 100자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="DOD DNIS 변환명을 입력하세요" maxLength={100} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DodTransMasterDrawer.displayName = 'DodTransMasterDrawer';
export default DodTransMasterDrawer;
