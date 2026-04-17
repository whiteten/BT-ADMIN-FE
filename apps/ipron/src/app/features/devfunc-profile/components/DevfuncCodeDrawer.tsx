/**
 * 기능코드 등록/수정 Drawer (420px)
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 기능코드 + 코드명 + 최소/최대 자릿수 + 설명
 * - 수정: 기능코드 disabled, 나머지 수정 가능
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber } from 'antd';
import type { CodeCreateData, CodeUpdateData, DevfuncCode } from '../types/devfuncProfile.types';

export interface DevfuncCodeDrawerRef {
  open: (code?: DevfuncCode | null) => void;
  close: () => void;
}

interface DevfuncCodeDrawerProps {
  onCreate: (data: CodeCreateData) => void;
  onUpdate: (code: string, data: CodeUpdateData) => void;
  isLoading?: boolean;
}

const DevfuncCodeDrawer = forwardRef<DevfuncCodeDrawerRef, DevfuncCodeDrawerProps>(({ onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editCode, setEditCode] = useState<DevfuncCode | null>(null);
  const [form] = Form.useForm();

  const isEditMode = !!editCode;

  useImperativeHandle(ref, () => ({
    open: (code?: DevfuncCode | null) => {
      form.resetFields();
      if (code) {
        setEditCode(code);
        form.setFieldsValue({
          devfuncCode: code.devfuncCode,
          devfuncCodeName: code.devfuncCodeName,
          minDigits: code.minDigits,
          maxDigits: code.maxDigits,
          devfuncCodeDesc: code.devfuncCodeDesc ?? '',
        });
      } else {
        setEditCode(null);
        form.setFieldsValue({
          minDigits: 0,
          maxDigits: 0,
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
      if (isEditMode && editCode) {
        onUpdate(editCode.devfuncCode, {
          devfuncCodeName: values.devfuncCodeName,
          minDigits: values.minDigits ?? 0,
          maxDigits: values.maxDigits ?? 0,
          devfuncCodeDesc: values.devfuncCodeDesc || null,
        });
      } else {
        onCreate({
          devfuncCode: values.devfuncCode,
          devfuncCodeName: values.devfuncCodeName,
          minDigits: values.minDigits ?? 0,
          maxDigits: values.maxDigits ?? 0,
          devfuncCodeDesc: values.devfuncCodeDesc || null,
        });
      }
    } catch {
      // validation error
    }
  };

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
    <Drawer open={isOpen} onClose={handleClose} title={isEditMode ? '기능코드 수정' : '기능코드 등록'} closable={{ placement: 'end' }} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item
          label="기능코드"
          name="devfuncCode"
          rules={[
            { required: true, message: '기능코드는 필수입니다' },
            { max: 20, message: '기능코드는 20자 이내여야 합니다' },
          ]}
          extra="*, # 포함 가능"
        >
          <Input placeholder="예: *14, **" maxLength={20} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          label="코드명"
          name="devfuncCodeName"
          rules={[
            { required: true, message: '코드명은 필수입니다' },
            { max: 50, message: '코드명은 50자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="코드명을 입력하세요" maxLength={50} />
        </Form.Item>

        <div className="flex gap-4">
          <Form.Item
            label="최소 자릿수"
            name="minDigits"
            className="flex-1"
            rules={[{ type: 'number', min: 0, max: 99, message: '0~99 사이 값이어야 합니다' }]}
          >
            <InputNumber min={0} max={99} className="w-full" />
          </Form.Item>

          <Form.Item
            label="최대 자릿수"
            name="maxDigits"
            className="flex-1"
            rules={[{ type: 'number', min: 0, max: 99, message: '0~99 사이 값이어야 합니다' }]}
          >
            <InputNumber min={0} max={99} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item label="설명" name="devfuncCodeDesc" rules={[{ max: 200, message: '설명은 200자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="코드 설명을 입력하세요" rows={3} maxLength={200} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DevfuncCodeDrawer.displayName = 'DevfuncCodeDrawer';
export default DevfuncCodeDrawer;
