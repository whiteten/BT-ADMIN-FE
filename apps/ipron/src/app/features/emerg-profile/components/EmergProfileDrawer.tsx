/**
 * 긴급코드 프로파일 등록/수정 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 프로파일명 + 노드 선택
 * - 수정: 프로파일명만 수정 (노드는 disabled)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import type { EmergProfile, NodeSimpleResponse, ProfileCreateData, ProfileUpdateData } from '../types/emergProfile.types';

export interface EmergProfileDrawerRef {
  open: (profile?: EmergProfile | null) => void;
  close: () => void;
}

interface EmergProfileDrawerProps {
  nodes: NodeSimpleResponse[];
  onCreate: (data: ProfileCreateData) => void;
  onUpdate: (id: number, data: ProfileUpdateData) => void;
  isLoading?: boolean;
}

const EmergProfileDrawer = forwardRef<EmergProfileDrawerRef, EmergProfileDrawerProps>(({ nodes, onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<EmergProfile | null>(null);
  const [form] = Form.useForm();

  const isEditMode = !!editProfile;

  useImperativeHandle(ref, () => ({
    open: (profile?: EmergProfile | null) => {
      form.resetFields();
      if (profile) {
        setEditProfile(profile);
        form.setFieldsValue({
          emergencyCodeProfileName: profile.emergencyCodeProfileName,
          nodeId: profile.nodeId,
        });
      } else {
        setEditProfile(null);
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
        onUpdate(editProfile.emergencyCodeProfileId, {
          emergencyCodeProfileName: values.emergencyCodeProfileName,
        });
      } else {
        onCreate(values as ProfileCreateData);
      }
    } catch {
      // validation error
    }
  };

  const nodeOptions = nodes.map((n) => ({
    label: n.nodeName,
    value: n.nodeId,
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
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? '프로파일 수정' : '프로파일 등록'}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420 } }}
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="프로파일명"
          name="emergencyCodeProfileName"
          rules={[
            { required: true, message: '프로파일명은 필수입니다' },
            { max: 128, message: '프로파일명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="프로파일명을 입력하세요" maxLength={128} />
        </Form.Item>

        <Form.Item label="노드" name="nodeId" rules={[{ required: true, message: '노드를 선택해주세요' }]}>
          <Select placeholder="노드 선택" options={nodeOptions} disabled={isEditMode} showSearch optionFilterProp="label" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

EmergProfileDrawer.displayName = 'EmergProfileDrawer';
export default EmergProfileDrawer;
