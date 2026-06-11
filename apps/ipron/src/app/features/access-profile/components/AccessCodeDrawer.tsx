/**
 * 접근코드 등록/수정 Drawer (420px)
 * - forwardRef + useImperativeHandle 패턴
 * - 등록: 접근코드 + 코드명 + 최소/최대 자릿수 + 라우트 + 설명
 * - 수정: 접근코드 readonly (복합키), 나머지 수정 가능
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select } from 'antd';
import type { AccessCode, CodeCreateData, CodeUpdateData } from '../types';

export interface AccessCodeDrawerRef {
  open: (code?: AccessCode | null) => void;
  close: () => void;
}

interface AccessCodeDrawerProps {
  routeOptions: { label: string; value: number }[];
  routesLoading?: boolean;
  onCreate: (data: CodeCreateData) => void;
  onUpdate: (code: string, data: CodeUpdateData) => void;
  isLoading?: boolean;
}

const AccessCodeDrawer = forwardRef<AccessCodeDrawerRef, AccessCodeDrawerProps>(({ routeOptions, routesLoading, onCreate, onUpdate, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editCode, setEditCode] = useState<AccessCode | null>(null);
  const [form] = Form.useForm();

  const isEditMode = !!editCode;

  useImperativeHandle(ref, () => ({
    open: (code?: AccessCode | null) => {
      form.resetFields();
      if (code) {
        setEditCode(code);
        form.setFieldsValue({
          accessCode: code.accessCode,
          accessCodeName: code.accessCodeName,
          minDigits: code.minDigits,
          maxDigits: code.maxDigits,
          routeId: code.routeId ?? undefined,
          accessCodeDesc: code.accessCodeDesc ?? '',
        });
      } else {
        setEditCode(null);
        form.setFieldsValue({
          minDigits: 3,
          maxDigits: 20,
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
        onUpdate(editCode.accessCode, {
          accessCodeName: values.accessCodeName,
          minDigits: values.minDigits ?? 0,
          maxDigits: values.maxDigits ?? 0,
          routeId: values.routeId,
          accessCodeDesc: values.accessCodeDesc || null,
        });
      } else {
        onCreate({
          accessCode: values.accessCode,
          accessCodeName: values.accessCodeName,
          minDigits: values.minDigits ?? 0,
          maxDigits: values.maxDigits ?? 0,
          routeId: values.routeId,
          accessCodeDesc: values.accessCodeDesc || null,
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
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? '접근코드 수정' : '접근코드 등록'}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420 } }}
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="접근코드"
          name="accessCode"
          rules={[
            { required: true, message: '접근코드는 필수입니다' },
            { max: 10, message: '접근코드는 10자 이내여야 합니다' },
            { pattern: /^[0-9*#\-/]+$/, message: '접근코드는 숫자, *, #, -, / 만 가능합니다' },
          ]}
          extra="숫자, *, #, -, / 만 입력 가능"
        >
          <Input placeholder="예: 9, *14" maxLength={10} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          label="접근코드명"
          name="accessCodeName"
          rules={[
            { required: true, message: '접근코드명은 필수입니다' },
            { max: 128, message: '접근코드명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="접근코드명을 입력하세요" maxLength={128} />
        </Form.Item>

        <div className="flex gap-4">
          <Form.Item label="최소 자릿수" name="minDigits" className="flex-1" rules={[{ type: 'number', min: 0, max: 99, message: '0~99 사이 값이어야 합니다' }]}>
            <InputNumber min={0} max={99} className="w-full" />
          </Form.Item>

          <Form.Item label="최대 자릿수" name="maxDigits" className="flex-1" rules={[{ type: 'number', min: 0, max: 99, message: '0~99 사이 값이어야 합니다' }]}>
            <InputNumber min={0} max={99} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item label="라우트" name="routeId" rules={[{ required: true, message: '라우트를 선택해주세요' }]}>
          <Select
            placeholder={routesLoading ? '라우트 불러오는 중...' : '라우트 선택'}
            options={routeOptions}
            loading={routesLoading}
            showSearch
            optionFilterProp="label"
            notFoundContent={routesLoading ? '불러오는 중...' : '해당 노드에 등록된 라우트가 없습니다'}
          />
        </Form.Item>

        <Form.Item label="설명" name="accessCodeDesc" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="설명을 입력하세요" rows={3} maxLength={256} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

AccessCodeDrawer.displayName = 'AccessCodeDrawer';
export default AccessCodeDrawer;
