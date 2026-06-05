/**
 * 프로파일 복사 Dialog
 * - forwardRef + useImperativeHandle 패턴
 * - 소스 프로파일명(disabled) + 대상 테넌트 선택 + 새 프로파일명
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type { DevfuncProfile, ProfileCopyData, TenantSimpleResponse } from '../types';

export interface DevfuncProfileCopyDialogRef {
  open: (profile: DevfuncProfile) => void;
  close: () => void;
}

interface DevfuncProfileCopyDialogProps {
  tenants: TenantSimpleResponse[];
  onCopy: (profileId: number, data: ProfileCopyData) => void;
  isLoading?: boolean;
}

const DevfuncProfileCopyDialog = forwardRef<DevfuncProfileCopyDialogRef, DevfuncProfileCopyDialogProps>(({ tenants, onCopy, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceProfile, setSourceProfile] = useState<DevfuncProfile | null>(null);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: (profile: DevfuncProfile) => {
      form.resetFields();
      setSourceProfile(profile);
      form.setFieldsValue({
        sourceName: profile.devfuncCodeProfileName,
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
        onCopy(sourceProfile.devfuncCodeProfileId, {
          devfuncCodeProfileName: values.devfuncCodeProfileName,
          targetTenantId: values.targetTenantId,
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

  return (
    <Modal open={isOpen} onCancel={handleClose} onOk={handleOk} title="프로파일 복사" okText="복사" cancelText="취소" confirmLoading={isLoading} centered destroyOnHidden>
      <Form form={form} layout="vertical" className="pt-4">
        <Form.Item label="원본 프로파일" name="sourceName">
          <Input disabled />
        </Form.Item>

        <Form.Item label="복사대상 테넌트" name="targetTenantId" rules={[{ required: true, message: '대상 테넌트를 선택해주세요' }]}>
          <Select placeholder="테넌트를 선택하세요" options={tenantOptions} showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item
          label="새 프로파일명"
          name="devfuncCodeProfileName"
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

DevfuncProfileCopyDialog.displayName = 'DevfuncProfileCopyDialog';
export default DevfuncProfileCopyDialog;
