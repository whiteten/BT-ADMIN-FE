/**
 * SIP 헤더 그룹 등록/수정 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 그룹명 입력
 * - 수정: 기존 그룹명 수정
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import type { SipHeaderGroup, SipHeaderGroupCreateRequest, SipHeaderGroupUpdateRequest } from '../types/sipProfile.types';

export interface SipHeaderGroupDrawerRef {
  open: (group?: SipHeaderGroup | null) => void;
  close: () => void;
}

interface SipHeaderGroupDrawerProps {
  onCreate: (data: SipHeaderGroupCreateRequest) => void;
  onUpdate: (id: number, data: SipHeaderGroupUpdateRequest) => void;
  isLoading?: boolean;
}

const SipHeaderGroupDrawer = forwardRef<SipHeaderGroupDrawerRef, SipHeaderGroupDrawerProps>(({ onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<SipHeaderGroup | null>(null);
  const [form] = Form.useForm();

  const isEditMode = !!editGroup;

  useImperativeHandle(ref, () => ({
    open: (group?: SipHeaderGroup | null) => {
      form.resetFields();
      if (group) {
        setEditGroup(group);
        form.setFieldsValue({
          sipHeaderGrpName: group.sipHeaderGrpName,
        });
      } else {
        setEditGroup(null);
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
      if (isEditMode && editGroup) {
        onUpdate(editGroup.sipHeaderGrpId, {
          sipHeaderGrpName: values.sipHeaderGrpName,
        });
      } else {
        onCreate({
          sipHeaderGrpName: values.sipHeaderGrpName,
        });
      }
    } catch {
      // validation error
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={handleClose}>취소</Button>
      <Button type="primary" onClick={handleSubmit} loading={isLoading}>
        {isEditMode ? '수정' : '등록'}
      </Button>
    </div>
  );

  return (
    <Drawer title={isEditMode ? '헤더 그룹 수정' : '헤더 그룹 등록'} open={isOpen} onClose={handleClose} styles={{ wrapper: { width: 420 } }} footer={footer} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item
          label="그룹명"
          name="sipHeaderGrpName"
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

SipHeaderGroupDrawer.displayName = 'SipHeaderGroupDrawer';

export default SipHeaderGroupDrawer;
