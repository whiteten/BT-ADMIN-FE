/**
 * 기능코드 프로파일 등록/수정 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 테넌트 선택 + 프로파일명
 * - 수정: 프로파일명만 수정 (테넌트 disabled)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import type { DevfuncProfile, ProfileCreateData, ProfileUpdateData, TenantSimpleResponse } from '../types';

export interface DevfuncProfileDrawerRef {
  open: (profile?: DevfuncProfile | null, tenantId?: number) => void;
  close: () => void;
}

interface DevfuncProfileDrawerProps {
  tenants: TenantSimpleResponse[];
  onCreate: (data: ProfileCreateData) => void;
  onUpdate: (id: number, data: ProfileUpdateData) => void;
  isLoading?: boolean;
}

const DevfuncProfileDrawer = forwardRef<DevfuncProfileDrawerRef, DevfuncProfileDrawerProps>(({ tenants, onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<DevfuncProfile | null>(null);
  const [form] = Form.useForm();
  // 운영자 모드에서만 "테넌트" 선택 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });

  const isEditMode = !!editProfile;

  useImperativeHandle(ref, () => ({
    open: (profile?: DevfuncProfile | null, tenantId?: number) => {
      form.resetFields();
      if (profile) {
        setEditProfile(profile);
        form.setFieldsValue({
          devfuncCodeProfileName: profile.devfuncCodeProfileName,
          tenantId: profile.tenantId,
        });
      } else {
        setEditProfile(null);
        // 일반 모드: 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
        const createTenantId = tenantId ?? (operatorMode ? undefined : (activeTenantId ?? undefined));
        if (createTenantId) {
          form.setFieldsValue({ tenantId: createTenantId });
        }
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
        onUpdate(editProfile.devfuncCodeProfileId, {
          devfuncCodeProfileName: values.devfuncCodeProfileName,
        });
      } else {
        onCreate({
          devfuncCodeProfileName: values.devfuncCodeProfileName,
          tenantId: values.tenantId,
        });
      }
    } catch {
      // validation error
    }
  };

  const tenantOptions = tenants.map((t) => ({
    label: t.tenantName,
    value: t.tenantId,
  }));

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
        <Form.Item label="테넌트" name="tenantId" hidden={!operatorMode} rules={[{ required: true, message: '테넌트를 선택해주세요' }]}>
          <Select placeholder="테넌트 선택" options={tenantOptions} disabled={isEditMode} showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item
          label="프로파일명"
          name="devfuncCodeProfileName"
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

DevfuncProfileDrawer.displayName = 'DevfuncProfileDrawer';
export default DevfuncProfileDrawer;
