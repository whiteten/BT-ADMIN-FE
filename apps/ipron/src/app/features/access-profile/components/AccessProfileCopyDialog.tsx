/**
 * 접근코드 프로파일 복사 Dialog
 * - forwardRef + useImperativeHandle 패턴
 * - 소스 프로파일명(disabled) + 대상 노드 + 대상 테넌트 + 새 프로파일명
 * - 대상 노드 변경 시 테넌트 선택 초기화 (노드/테넌트 매핑에 맞춰야 하지만, 현재 테넌트는 독립 목록 사용)
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type { NodeTenantItem } from '../api/accessProfileApi';
import type { AccessProfile, NodeSimpleResponse, ProfileCopyData, TenantSimpleResponse } from '../types';

export interface AccessProfileCopyDialogRef {
  open: (profile: AccessProfile) => void;
  close: () => void;
}

interface AccessProfileCopyDialogProps {
  tenants: TenantSimpleResponse[];
  nodes: NodeSimpleResponse[];
  nodeTenants: NodeTenantItem[];
  onCopy: (profileId: number, data: ProfileCopyData) => void;
  isLoading?: boolean;
}

const AccessProfileCopyDialog = forwardRef<AccessProfileCopyDialogRef, AccessProfileCopyDialogProps>(({ tenants, nodes, nodeTenants, onCopy, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceProfile, setSourceProfile] = useState<AccessProfile | null>(null);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: (profile: AccessProfile) => {
      form.resetFields();
      setSourceProfile(profile);
      form.setFieldsValue({
        sourceName: profile.accessCodeProfileName,
        targetNodeId: profile.nodeId,
        targetTenantId: profile.tenantId,
      });
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (sourceProfile) {
        onCopy(sourceProfile.accessCodeProfileId, {
          accessCodeProfileName: values.accessCodeProfileName,
          targetNodeId: values.targetNodeId,
          targetTenantId: values.targetTenantId,
        });
      }
    } catch {
      // validation error
    }
  };

  const watchedTargetNodeId = Form.useWatch('targetNodeId', form);

  const tenantOptions = useMemo(() => {
    if (!watchedTargetNodeId) return [];
    const tenantIdsForNode = new Set(nodeTenants.filter((nt) => nt.nodeId === watchedTargetNodeId).map((nt) => nt.tenantId));
    return tenants.filter((t) => tenantIdsForNode.has(t.tenantId)).map((t) => ({ label: t.tenantName, value: t.tenantId }));
  }, [watchedTargetNodeId, nodeTenants, tenants]);

  const nodeOptions = useMemo(() => {
    const assignedNodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => assignedNodeIds.has(n.nodeId)).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, nodeTenants]);

  return (
    <Modal open={isOpen} onCancel={handleClose} onOk={handleOk} title="프로파일 복사" okText="복사" cancelText="취소" confirmLoading={isLoading} centered destroyOnHidden>
      <Form form={form} layout="vertical" className="pt-4">
        <Form.Item label="원본 프로파일" name="sourceName">
          <Input disabled />
        </Form.Item>

        <Form.Item label="대상 노드" name="targetNodeId" rules={[{ required: true, message: '대상 노드를 선택해주세요' }]}>
          <Select placeholder="노드를 선택하세요" options={nodeOptions} showSearch optionFilterProp="label" onChange={() => form.setFieldValue('targetTenantId', undefined)} />
        </Form.Item>

        <Form.Item label="대상 테넌트" name="targetTenantId" rules={[{ required: true, message: '대상 테넌트를 선택해주세요' }]}>
          <Select
            placeholder={watchedTargetNodeId ? '테넌트를 선택하세요' : '노드를 먼저 선택하세요'}
            options={tenantOptions}
            disabled={!watchedTargetNodeId}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label="새 프로파일명"
          name="accessCodeProfileName"
          rules={[
            { required: true, message: '프로파일명은 필수입니다' },
            { max: 128, message: '프로파일명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="새 프로파일명을 입력하세요" maxLength={128} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

AccessProfileCopyDialog.displayName = 'AccessProfileCopyDialog';
export default AccessProfileCopyDialog;
