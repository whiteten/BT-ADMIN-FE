/**
 * 프로파일 복사 Dialog
 * - forwardRef + useImperativeHandle 패턴
 * - 소스 프로파일명(disabled) + 대상 노드 선택 + 새 프로파일명
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type { EmergProfile, NodeSimpleResponse, ProfileCopyData } from '../types';

export interface EmergProfileCopyDialogRef {
  open: (profile: EmergProfile) => void;
  close: () => void;
}

interface EmergProfileCopyDialogProps {
  nodes: NodeSimpleResponse[];
  onCopy: (profileId: number, data: ProfileCopyData) => void;
  isLoading?: boolean;
}

const EmergProfileCopyDialog = forwardRef<EmergProfileCopyDialogRef, EmergProfileCopyDialogProps>(({ nodes, onCopy, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceProfile, setSourceProfile] = useState<EmergProfile | null>(null);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: (profile: EmergProfile) => {
      form.resetFields();
      setSourceProfile(profile);
      form.setFieldsValue({
        sourceName: profile.emergencyCodeProfileName,
        // SWAT JSP:716-717 — 현재 노드명 표시(disabled)
        sourceNodeName: profile.nodeName || `Node ${profile.nodeId}`,
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
        onCopy(sourceProfile.emergencyCodeProfileId, {
          emergencyCodeProfileName: values.emergencyCodeProfileName,
          targetNodeId: values.targetNodeId,
        });
      }
    } catch {
      // validation error
    }
  };

  const nodeOptions = nodes.map((n) => ({
    label: n.nodeName,
    value: n.nodeId,
  }));

  return (
    <Modal open={isOpen} onCancel={handleClose} onOk={handleOk} title="프로파일 복사" okText="복사" cancelText="취소" confirmLoading={isLoading} centered destroyOnHidden>
      <Form form={form} layout="vertical" className="pt-4">
        <Form.Item label="원본 프로파일" name="sourceName">
          <Input disabled />
        </Form.Item>

        {/* SWAT JSP:716-717 — 현재 노드 표시(disabled), 대상 노드 선택 */}
        <Form.Item label="현재 노드" name="sourceNodeName">
          <Input disabled />
        </Form.Item>

        <Form.Item label="대상 노드" name="targetNodeId" rules={[{ required: true, message: '대상 노드를 선택해주세요' }]}>
          <Select placeholder="대상 노드 선택" options={nodeOptions} showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item
          label="새 프로파일명"
          name="emergencyCodeProfileName"
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

EmergProfileCopyDialog.displayName = 'EmergProfileCopyDialog';
export default EmergProfileCopyDialog;
