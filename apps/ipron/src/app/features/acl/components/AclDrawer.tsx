/**
 * ACL 등록/수정 Drawer (PBX/CTI 통합)
 * forwardRef + useImperativeHandle 패턴
 *
 * category에 따라 PBX API 또는 CTI API를 호출
 * 노드 미선택 상태에서 추가 시 노드 드롭다운 표시
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateAcl, useCreateCtiAcl, useDeleteAcl, useDeleteCtiAcl, useUpdateAcl, useUpdateCtiAcl } from '../hooks/useAclQueries';
import { type Acl, type AclCreateRequest, USE_YN_OPTIONS } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type AclCategory = 'pbx' | 'cti';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface AclDrawerRef {
  open: (data?: Acl, nodeId?: number, nodeName?: string, category?: AclCategory, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const AclDrawer = forwardRef<AclDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<Acl | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [category, setCategory] = useState<AclCategory>('pbx');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const isEditMode = !!editData;
  const isNodeSelectable = !isEditMode && !nodeId && nodeOptions.length > 0;
  const categoryLabel = category === 'pbx' ? 'PBX' : 'CTI';

  useImperativeHandle(ref, () => ({
    open: (data?: Acl, initNodeId?: number, initNodeName?: string, cat?: AclCategory, nodeList?: NodeOption[]) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
      setCategory(cat ?? 'pbx');
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
        aclName: editData.aclName,
        ipNet: editData.ipNet,
        ipMask: editData.ipMask,
        useYn: editData.useYn,
        aclDesc: editData.aclDesc ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── PBX mutations ────────────────────────────────────────────────────────
  const { mutate: createPbxAcl, isPending: isCreatingPbx } = useCreateAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('PBX IP 접근제어가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: updatePbxAcl, isPending: isUpdatingPbx } = useUpdateAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('PBX IP 접근제어가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: deletePbxAcl, isPending: isDeletingPbx } = useDeleteAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('PBX IP 접근제어가 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  // ─── CTI mutations ────────────────────────────────────────────────────────
  const { mutate: createCtiAcl, isPending: isCreatingCti } = useCreateCtiAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI IP 접근제어가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: updateCtiAcl, isPending: isUpdatingCti } = useUpdateCtiAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI IP 접근제어가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: deleteCtiAcl, isPending: isDeletingCti } = useDeleteCtiAcl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI IP 접근제어가 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const isPending = isCreatingPbx || isUpdatingPbx || isDeletingPbx || isCreatingCti || isUpdatingCti || isDeletingCti;

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

      // 노드 선택 모드일 때 form에서 nodeId 가져오기
      const targetNodeId = nodeId ?? values.nodeId;
      if (!targetNodeId) {
        toast.error('노드를 선택하세요.');
        return;
      }

      const payload: AclCreateRequest = {
        nodeId: targetNodeId,
        aclName: values.aclName,
        ipNet: values.ipNet,
        ipMask: values.ipMask,
        useYn: values.useYn,
        aclType: 1,
        aclDesc: values.aclDesc || null,
      };

      if (isEditMode && editData) {
        if (category === 'pbx') {
          updatePbxAcl({ id: editData.aclId, data: payload });
        } else {
          updateCtiAcl({ id: editData.aclId, data: payload });
        }
      } else {
        if (category === 'pbx') {
          createPbxAcl(payload);
        } else {
          createCtiAcl(payload);
        }
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, category, createPbxAcl, updatePbxAcl, createCtiAcl, updateCtiAcl]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    const deleteFn = category === 'pbx' ? deletePbxAcl : deleteCtiAcl;
    modal.confirm.execute({
      onOk: () => deleteFn({ id: editData.aclId }),
      options: {
        title: `${categoryLabel} IP 접근제어 삭제`,
        content: `"${editData.aclName}" 접근제어를 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, category, categoryLabel, deletePbxAcl, deleteCtiAcl]);

  return (
    <Drawer
      title={isEditMode ? `${categoryLabel} IP 접근제어 수정` : `${categoryLabel} IP 접근제어 등록`}
      open={visible}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420 } }}
      footer={
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button danger onClick={handleDelete} loading={isDeletingPbx || isDeletingCti}>
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
      <Form form={form} layout="vertical" initialValues={{ useYn: 1 }}>
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
          name="aclName"
          label="접근제어명"
          required
          rules={[
            { required: true, message: '접근제어명은 필수입니다' },
            { max: 100, message: '접근제어명은 100자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="접근제어명을 입력하세요" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="ipNet"
          label="IP NET"
          required
          rules={[
            { required: true, message: 'IP NET은 필수입니다' },
            { max: 100, message: 'IP NET은 100자 이내여야 합니다' },
            { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IPv4 형식으로 입력하세요 (예: 192.168.0.0)' },
          ]}
        >
          <Input placeholder="예: 192.168.1.0" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="ipMask"
          label="IP MASK"
          required
          rules={[
            { required: true, message: 'IP MASK는 필수입니다' },
            { max: 100, message: 'IP MASK는 100자 이내여야 합니다' },
            { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IPv4 형식으로 입력하세요 (예: 255.255.255.0)' },
          ]}
        >
          <Input placeholder="예: 255.255.255.0" maxLength={100} />
        </Form.Item>

        <Form.Item name="useYn" label="활성화 여부" rules={[{ required: true, message: '활성화 여부는 필수입니다' }]}>
          <Select options={[...USE_YN_OPTIONS]} placeholder="활성화 여부를 선택하세요" />
        </Form.Item>

        <Form.Item name="aclDesc" label="비고" rules={[{ max: 512, message: '비고는 512자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="비고를 입력하세요" maxLength={512} rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

AclDrawer.displayName = 'AclDrawer';
export default AclDrawer;
