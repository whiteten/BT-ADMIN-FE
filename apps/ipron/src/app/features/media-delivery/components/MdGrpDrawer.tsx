/**
 * 미디어전달그룹 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMdGrp, useDeleteMdGrp, useUpdateMdGrp } from '../hooks/useMediaDeliveryQueries';
import type { MdGrp } from '../types/mediaDelivery.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface MdGrpDrawerRef {
  open: (data?: MdGrp, nodeId?: number, nodeName?: string, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const MdGrpDrawer = forwardRef<MdGrpDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<MdGrp | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const isEditMode = !!editData;
  const isNodeSelectable = !isEditMode && !nodeId && nodeOptions.length > 0;

  useImperativeHandle(ref, () => ({
    open: (data?: MdGrp, initNodeId?: number, initNodeName?: string, nodeList?: NodeOption[]) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
      setNodeOptions(nodeList ?? []);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setNodeId(null);
      setNodeName('');
      setNodeOptions([]);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        grpName: editData.grpName,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createMdGrp, isPending: isCreating } = useCreateMdGrp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달그룹이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: updateMdGrp, isPending: isUpdating } = useUpdateMdGrp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달그룹이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: deleteMdGrp, isPending: isDeleting } = useDeleteMdGrp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달그룹이 삭제되었습니다.');
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
    setNodeOptions([]);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const targetNodeId = nodeId ?? values.nodeId;
      if (!targetNodeId) {
        toast.error('노드를 선택하세요.');
        return;
      }

      const payload = {
        nodeId: targetNodeId,
        grpName: values.grpName,
      };

      if (isEditMode && editData) {
        updateMdGrp({ id: editData.grpId, data: payload });
      } else {
        createMdGrp(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, createMdGrp, updateMdGrp]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    modal.confirm.execute({
      onOk: () => deleteMdGrp({ id: editData.grpId }),
      options: {
        title: '미디어전달그룹 삭제',
        content: `"${editData.grpName}" 그룹을 삭제하시겠습니까?\n할당된 미디어전달이 있으면 삭제할 수 없습니다.`,
      },
    });
  }, [editData, modal, deleteMdGrp]);

  return (
    <Drawer
      title={isEditMode ? '미디어전달그룹 수정' : '미디어전달그룹 등록'}
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
        {isNodeSelectable ? (
          <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드를 선택하세요' }]}>
            <Select placeholder="노드를 선택하세요">
              {nodeOptions.map((n) => (
                <Select.Option key={n.nodeId} value={n.nodeId}>
                  {n.nodeName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item label="노드">
            <Input value={nodeName || (nodeId ? `Node ${nodeId}` : '')} disabled />
          </Form.Item>
        )}

        <Form.Item
          name="grpName"
          label="그룹명"
          required
          rules={[
            { required: true, message: '그룹명은 필수입니다' },
            { max: 128, message: '그룹명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="그룹명을 입력하세요" maxLength={128} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

MdGrpDrawer.displayName = 'MdGrpDrawer';
export default MdGrpDrawer;
