/**
 * 접근코드 프로파일 등록/수정 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 노드 + 테넌트 + 프로파일명
 * - 수정: 프로파일명만 수정 (노드/테넌트 disabled, 복합키 불변)
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import type { NodeTenantItem } from '../api/accessProfileApi';
import type { AccessProfile, NodeSimpleResponse, ProfileCreateData, ProfileUpdateData, TenantSimpleResponse } from '../types';

export interface AccessProfileDrawerRef {
  open: (profile?: AccessProfile | null, tenantId?: number, nodeId?: number) => void;
  close: () => void;
}

interface AccessProfileDrawerProps {
  tenants: TenantSimpleResponse[];
  nodes: NodeSimpleResponse[];
  nodeTenants: NodeTenantItem[];
  onCreate: (data: ProfileCreateData) => void;
  onUpdate: (id: number, data: ProfileUpdateData) => void;
  isLoading?: boolean;
}

const AccessProfileDrawer = forwardRef<AccessProfileDrawerRef, AccessProfileDrawerProps>(({ tenants, nodes, nodeTenants, onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<AccessProfile | null>(null);
  const [form] = Form.useForm();
  // 운영자 모드에서만 "테넌트" 선택 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });

  const isEditMode = !!editProfile;

  useImperativeHandle(ref, () => ({
    open: (profile?: AccessProfile | null, tenantId?: number, nodeId?: number) => {
      form.resetFields();
      if (profile) {
        setEditProfile(profile);
        form.setFieldsValue({
          accessCodeProfileName: profile.accessCodeProfileName,
          tenantId: profile.tenantId,
          nodeId: profile.nodeId,
        });
      } else {
        setEditProfile(null);
        form.setFieldsValue({
          // 일반 모드: 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
          tenantId: tenantId ?? (operatorMode ? undefined : (activeTenantId ?? undefined)),
          nodeId: nodeId ?? undefined,
        });
      }
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && editProfile) {
        onUpdate(editProfile.accessCodeProfileId, {
          accessCodeProfileName: values.accessCodeProfileName,
        });
      } else {
        onCreate({
          accessCodeProfileName: values.accessCodeProfileName,
          tenantId: values.tenantId,
          nodeId: values.nodeId,
        });
      }
    } catch {
      // validation error
    }
  };

  // 선택된 노드에 따라 테넌트 옵션 필터링 (노드 선택 전에는 빈 배열)
  const watchedNodeId = Form.useWatch('nodeId', form);

  const tenantOptions = useMemo(() => {
    if (!watchedNodeId) return [];
    const tenantIdsForNode = new Set(nodeTenants.filter((nt) => nt.nodeId === watchedNodeId).map((nt) => nt.tenantId));
    return tenants.filter((t) => tenantIdsForNode.has(t.tenantId)).map((t) => ({ label: t.tenantName, value: t.tenantId }));
  }, [watchedNodeId, nodeTenants, tenants]);

  // 노드가 할당된 노드만 표시
  const nodeOptions = useMemo(() => {
    const assignedNodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => assignedNodeIds.has(n.nodeId)).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, nodeTenants]);

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={isLoading}>
        {isEditMode ? '수정' : '등록'}
      </Button>
    </div>
  );

  return (
    <Drawer open={isOpen} onClose={handleClose} title={isEditMode ? '프로파일 수정' : '프로파일 등록'} closable={{ placement: 'end' }} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item label="노드" name="nodeId" rules={[{ required: true, message: '노드를 선택해주세요' }]}>
          <Select
            placeholder="노드 선택"
            options={nodeOptions}
            disabled={isEditMode}
            showSearch
            optionFilterProp="label"
            onChange={() => {
              // 노드 변경 시 테넌트 선택 초기화 (해당 노드에 없는 테넌트가 선택돼 있을 수 있음).
              // 일반 모드는 테넌트가 로그인 테넌트로 고정(숨김)이므로 그 값을 유지.
              if (!isEditMode) form.setFieldValue('tenantId', operatorMode ? undefined : (activeTenantId ?? undefined));
            }}
          />
        </Form.Item>

        <Form.Item label="테넌트" name="tenantId" hidden={!operatorMode} rules={[{ required: true, message: '테넌트를 선택해주세요' }]}>
          <Select
            placeholder={watchedNodeId ? '테넌트 선택' : '노드를 먼저 선택하세요'}
            options={tenantOptions}
            disabled={isEditMode || !watchedNodeId}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label="프로파일명"
          name="accessCodeProfileName"
          rules={[
            { required: true, message: '프로파일명은 필수입니다' },
            { max: 128, message: '프로파일명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="프로파일명을 입력하세요" maxLength={128} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

AccessProfileDrawer.displayName = 'AccessProfileDrawer';
export default AccessProfileDrawer;
