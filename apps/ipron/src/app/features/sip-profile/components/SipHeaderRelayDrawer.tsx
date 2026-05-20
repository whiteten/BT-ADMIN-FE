/**
 * SIP 헤더 릴레이 등록 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록만 지원 (수정 없음, 삭제는 그리드에서 처리)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import type { SipHeaderRelayCreateRequest } from '../types/sipProfile.types';

export interface SipHeaderRelayDrawerRef {
  open: () => void;
  close: () => void;
}

interface SipHeaderRelayDrawerProps {
  onCreate: (data: SipHeaderRelayCreateRequest) => void;
  isLoading?: boolean;
}

const SipHeaderRelayDrawer = forwardRef<SipHeaderRelayDrawerRef, SipHeaderRelayDrawerProps>(({ onCreate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
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
      onCreate({
        sipHeader: values.sipHeader,
      });
    } catch {
      // validation error
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={handleClose}>취소</Button>
      <Button type="primary" onClick={handleSubmit} loading={isLoading}>
        등록
      </Button>
    </div>
  );

  return (
    <Drawer title="헤더 릴레이 등록" open={isOpen} onClose={handleClose} styles={{ wrapper: { width: 420 } }} footer={footer} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item
          label="헤더명"
          name="sipHeader"
          rules={[
            { required: true, message: '헤더명은 필수입니다' },
            { max: 128, message: '헤더명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="헤더명을 입력하세요 (예: Content-Type)" maxLength={128} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

SipHeaderRelayDrawer.displayName = 'SipHeaderRelayDrawer';

export default SipHeaderRelayDrawer;
