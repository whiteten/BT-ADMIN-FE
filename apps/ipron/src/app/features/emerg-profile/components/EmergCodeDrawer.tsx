/**
 * 긴급코드 등록/수정 Drawer (420px)
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 긴급코드 + 코드명 + 라우트 + 설명
 * - 수정: 긴급코드 disabled, 나머지 수정 가능
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import type { CodeCreateData, CodeUpdateData, EmergCode } from '../types/emergProfile.types';

export interface EmergCodeDrawerRef {
  open: (code?: EmergCode | null) => void;
  close: () => void;
}

interface EmergCodeDrawerProps {
  routeOptions: { label: string; value: number }[];
  onCreate: (data: CodeCreateData) => void;
  onUpdate: (code: string, data: CodeUpdateData) => void;
  isLoading?: boolean;
}

const EmergCodeDrawer = forwardRef<EmergCodeDrawerRef, EmergCodeDrawerProps>(({ routeOptions, onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editCode, setEditCode] = useState<EmergCode | null>(null);
  const [form] = Form.useForm();

  const isEditMode = !!editCode;

  useImperativeHandle(ref, () => ({
    open: (code?: EmergCode | null) => {
      form.resetFields();
      if (code) {
        setEditCode(code);
        form.setFieldsValue({
          emergencyCode: code.emergencyCode,
          emergencyCodeName: code.emergencyCodeName,
          routeId: code.routeId ?? undefined,
          emergencyCodeDesc: code.emergencyCodeDesc ?? '',
        });
      } else {
        setEditCode(null);
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
      if (isEditMode && editCode) {
        onUpdate(editCode.emergencyCode, {
          emergencyCodeName: values.emergencyCodeName,
          routeId: values.routeId ?? null,
          emergencyCodeDesc: values.emergencyCodeDesc ?? null,
        });
      } else {
        onCreate({
          emergencyCode: values.emergencyCode,
          emergencyCodeName: values.emergencyCodeName,
          routeId: values.routeId ?? null,
          emergencyCodeDesc: values.emergencyCodeDesc ?? null,
        });
      }
    } catch {
      // validation error
    }
  };

  const allRouteOptions = [{ label: '미지정', value: 0 }, ...routeOptions];

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
      title={isEditMode ? '긴급코드 수정' : '긴급코드 등록'}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420 } }}
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="긴급코드"
          name="emergencyCode"
          rules={[
            { required: true, message: '긴급코드는 필수입니다' },
            { max: 10, message: '긴급코드는 10자 이내여야 합니다' },
            { pattern: /^[0-9]+$/, message: '긴급코드는 숫자만 가능합니다' },
          ]}
        >
          <Input placeholder="긴급코드를 입력하세요 (숫자)" maxLength={10} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          label="코드명"
          name="emergencyCodeName"
          rules={[
            { required: true, message: '코드명은 필수입니다' },
            { max: 128, message: '코드명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="코드명을 입력하세요" maxLength={128} />
        </Form.Item>

        <Form.Item label="라우트" name="routeId">
          <Select placeholder="라우트 선택" options={allRouteOptions} allowClear showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item label="설명" name="emergencyCodeDesc" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="설명을 입력하세요" rows={4} maxLength={256} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

EmergCodeDrawer.displayName = 'EmergCodeDrawer';
export default EmergCodeDrawer;
