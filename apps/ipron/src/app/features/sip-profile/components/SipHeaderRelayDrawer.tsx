/**
 * SIP 헤더 릴레이 등록/수정 Drawer
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: open() 호출
 * - 수정: open(relay) 호출 (SWAT IPR20S2210RU.do 대응, QUICKWINS #24)
 * - 삭제는 그리드에서 처리
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import type { SipHeaderRelay, SipHeaderRelayCreateRequest, SipHeaderRelayUpdateRequest } from '../types';

export interface SipHeaderRelayDrawerRef {
  open: (relay?: SipHeaderRelay) => void;
  close: () => void;
}

interface SipHeaderRelayDrawerProps {
  onCreate: (data: SipHeaderRelayCreateRequest) => void;
  onUpdate?: (id: number, data: SipHeaderRelayUpdateRequest) => void;
  isLoading?: boolean;
}

const SipHeaderRelayDrawer = forwardRef<SipHeaderRelayDrawerRef, SipHeaderRelayDrawerProps>(({ onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRelay, setEditingRelay] = useState<SipHeaderRelay | null>(null);
  const [form] = Form.useForm();

  const isEditMode = editingRelay !== null;

  useImperativeHandle(ref, () => ({
    open: (relay?: SipHeaderRelay) => {
      if (relay) {
        setEditingRelay(relay);
        form.setFieldsValue({ sipHeader: relay.sipHeader });
      } else {
        setEditingRelay(null);
        form.resetFields();
      }
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setEditingRelay(null);
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    setEditingRelay(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && editingRelay) {
        onUpdate?.(editingRelay.sipHeaderId, { sipHeader: values.sipHeader });
      } else {
        onCreate({ sipHeader: values.sipHeader });
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
    <Drawer title={isEditMode ? '헤더 릴레이 수정' : '헤더 릴레이 등록'} open={isOpen} onClose={handleClose} styles={{ wrapper: { width: 420 } }} footer={footer} destroyOnClose>
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
