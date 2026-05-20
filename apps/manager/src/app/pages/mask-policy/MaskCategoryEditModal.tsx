/**
 * 카테고리 설정 편집 모달
 *
 * 카테고리의 활성 여부 / 기본·최대 해지 시간 / 승인 권한 / 사유 최소 길이를 편집한다.
 * 신규 카테고리 등록도 동일 모달로 처리 (mode='create' 일 때 category/label 추가 입력).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Form, Input, InputNumber, Modal, Row, Switch } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useCreateCategory, useUpdateCategory } from '../../features/mask-policy/hooks/useMaskPolicyQueries';
import type { MaskCategoryConfig, MaskCategoryConfigCreateRequest, MaskCategoryConfigUpdateRequest } from '../../features/mask-policy/types/maskPolicy.types';

export interface MaskCategoryEditModalRef {
  /** mode='create': 신규 카테고리 / mode='edit': 기존 편집 */
  open: (mode: 'create' | 'edit', data?: MaskCategoryConfig) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

interface FormValues {
  category: string;
  label: string;
  enabled: boolean;
  defaultHours: number;
  maxHours: number;
  approverAuthKey: string;
  requireReason: boolean;
  minReasonLength: number;
}

const MaskCategoryEditModal = forwardRef<MaskCategoryEditModalRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editData, setEditData] = useState<MaskCategoryConfig | null>(null);

  useImperativeHandle(ref, () => ({
    open: (m: 'create' | 'edit', data?: MaskCategoryConfig) => {
      setMode(m);
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        category: editData.category,
        label: editData.label,
        enabled: editData.enabled === 1,
        defaultHours: editData.defaultHours,
        maxHours: editData.maxHours,
        approverAuthKey: editData.approverAuthKey,
        requireReason: editData.requireReason === 1,
        minReasonLength: editData.minReasonLength,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory({
    mutationOptions: {
      onSuccess: () => {
        toast.success('카테고리가 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory({
    mutationOptions: {
      onSuccess: () => {
        toast.success('카테고리 설정이 저장되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      // maxHours >= defaultHours 검증
      if (values.maxHours < values.defaultHours) {
        toast.error('최대값은 기본값 이상이어야 합니다.');
        return;
      }
      if (mode === 'create') {
        const payload: MaskCategoryConfigCreateRequest = {
          category: values.category.toUpperCase().trim(),
          label: values.label,
          enabled: values.enabled ? 1 : 0,
          defaultHours: values.defaultHours,
          maxHours: values.maxHours,
          approverAuthKey: values.approverAuthKey,
          requireReason: values.requireReason ? 1 : 0,
          minReasonLength: values.minReasonLength,
        };
        createCategory(payload);
      } else if (editData) {
        const payload: MaskCategoryConfigUpdateRequest = {
          label: values.label,
          enabled: values.enabled ? 1 : 0,
          defaultHours: values.defaultHours,
          maxHours: values.maxHours,
          approverAuthKey: values.approverAuthKey,
          requireReason: values.requireReason ? 1 : 0,
          minReasonLength: values.minReasonLength,
        };
        updateCategory({ configId: editData.configId, data: payload });
      }
    } catch {
      /* validation 실패 */
    }
  }, [form, mode, editData, createCategory, updateCategory]);

  return (
    <Modal
      title={mode === 'create' ? '카테고리 추가' : `${editData?.label ?? ''} 카테고리 설정`}
      open={visible}
      width={520}
      onCancel={() => {
        setVisible(false);
        setEditData(null);
        form.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setVisible(false);
            setEditData(null);
            form.resetFields();
          }}
        >
          취소
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={isPending}>
          {mode === 'create' ? '등록' : '저장'}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: true,
          defaultHours: 1,
          maxHours: 4,
          requireReason: true,
          minReasonLength: 20,
          approverAuthKey: 'mask:approve:',
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="category"
              label="카테고리 코드"
              required
              rules={[
                { required: true, message: '카테고리 코드는 필수입니다' },
                { pattern: /^[A-Z_]+$/, message: '대문자/언더스코어만 가능합니다' },
                { max: 50, message: '50자 이내여야 합니다' },
              ]}
              tooltip="예: PHONE, EMAIL, SSN"
            >
              <Input placeholder="PHONE" maxLength={50} disabled={mode === 'edit'} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="label"
              label="표시명"
              required
              rules={[
                { required: true, message: '표시명은 필수입니다' },
                { max: 50, message: '50자 이내여야 합니다' },
              ]}
            >
              <Input placeholder="전화번호" maxLength={50} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="해지 유효 시간 (시간 단위)" required className="!mb-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="defaultHours" label="기본값" noStyle rules={[{ required: true, message: '기본값은 필수입니다' }]}>
                <InputNumber min={0.25} max={24} step={0.25} className="!w-full" addonAfter="시간" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxHours" label="최대값" noStyle rules={[{ required: true, message: '최대값은 필수입니다' }]}>
                <InputNumber min={0.25} max={24} step={0.25} className="!w-full" addonAfter="시간" />
              </Form.Item>
            </Col>
          </Row>
          <div className="text-[11px] text-gray-500 mt-1">요청 시 기본값이 자동 입력됩니다. 최대값 초과 요청은 자동 clamp.</div>
        </Form.Item>

        <Form.Item
          name="approverAuthKey"
          label="승인 권한 키"
          required
          rules={[
            { required: true, message: '승인 권한 키는 필수입니다' },
            { max: 100, message: '100자 이내여야 합니다' },
          ]}
          tooltip="이 권한을 보유한 사용자만 승인 가능. 예: mask:approve:phone"
        >
          <Input placeholder="mask:approve:phone" maxLength={100} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="requireReason" label="사유 입력 필수" valuePropName="checked">
              <Switch checkedChildren="필수" unCheckedChildren="선택" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="minReasonLength" label="사유 최소 길이" tooltip="감사 추적을 위한 최소 길이">
              <InputNumber min={0} max={500} className="!w-full" addonAfter="자" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="enabled" label="활성화" valuePropName="checked">
          <Switch checkedChildren="활성" unCheckedChildren="비활성" />
        </Form.Item>
      </Form>
    </Modal>
  );
});

MaskCategoryEditModal.displayName = 'MaskCategoryEditModal';
export default MaskCategoryEditModal;
