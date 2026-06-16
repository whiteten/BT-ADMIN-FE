/**
 * SLEE 환경설정 속성 추가/수정 Drawer
 *
 * - MS관리 멤버관리 패턴 동일 (480px + footer 취소/저장)
 * - mode='CREATE': category 입력 (선택값 있으면 readonly), property/value/ptyDesc 입력
 *                  저장 직전 사전 중복 체크 (AS-IS IPR20S6060CHK.do)
 * - mode='UPDATE': value/ptyDesc 만 수정 가능 (category/property readonly)
 * - HTML entity 복원은 백엔드에서 처리
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import { toast } from '@/shared-util';
import { sleeConfigApi } from '../api/sleeConfigApi';
import { useCreateProperty, useUpdateProperty } from '../hooks/useSleeConfigQueries';

const { TextArea } = Input;

export interface PropertyEditDrawerRef {
  openCreate: (ctx: { tenantId: number; configFile: string; category: string | null }) => void;
  openEdit: (ctx: { tenantId: number; configFile: string; category: string; property: string; value: string; ptyDesc: string | null }) => void;
}

interface Props {
  onSuccess: () => void;
}

interface FormValues {
  category: string;
  property: string;
  value: string;
  ptyDesc?: string;
}

const PropertyEditDrawer = forwardRef<PropertyEditDrawerRef, Props>(({ onSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'CREATE' | 'UPDATE'>('CREATE');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [configFile, setConfigFile] = useState<string | null>(null);
  /** CREATE 모드에서 진입 시 선택된 카테고리. 있으면 readonly, 없으면 직접 입력 허용. */
  const [presetCategory, setPresetCategory] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreate: ({ tenantId: t, configFile: f, category }) => {
      setMode('CREATE');
      setTenantId(t);
      setConfigFile(f);
      setPresetCategory(category);
      form.resetFields();
      if (category) form.setFieldValue('category', category);
      setOpen(true);
    },
    openEdit: ({ tenantId: t, configFile: f, category, property, value, ptyDesc }) => {
      setMode('UPDATE');
      setTenantId(t);
      setConfigFile(f);
      setPresetCategory(category);
      form.resetFields();
      form.setFieldsValue({ category, property, value, ptyDesc: ptyDesc ?? '' });
      setOpen(true);
    },
  }));

  const handleClose = () => {
    setOpen(false);
    setTenantId(null);
    setConfigFile(null);
    setPresetCategory(null);
    form.resetFields();
  };

  const { mutate: createProperty } = useCreateProperty({
    mutationOptions: {
      onSuccess: () => {
        toast.success('속성이 등록되었습니다.');
        onSuccess();
        handleClose();
      },
      onError: () => {
        toast.error('속성 등록에 실패했습니다.');
      },
      onSettled: () => setSubmitting(false),
    },
  });

  const { mutate: updateProperty } = useUpdateProperty({
    mutationOptions: {
      onSuccess: () => {
        toast.success('속성이 수정되었습니다.');
        onSuccess();
        handleClose();
      },
      onError: () => {
        toast.error('속성 수정에 실패했습니다.');
      },
      onSettled: () => setSubmitting(false),
    },
  });

  const handleSubmit = async () => {
    if (!tenantId || !configFile) return;
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);

    if (mode === 'CREATE') {
      // 사전 중복 체크 (AS-IS IPR20S6060CHK.do)
      try {
        const duplicate = await sleeConfigApi.checkPropertyDuplicate({
          tenantId,
          configFile,
          category: values.category,
          property: values.property,
        });
        if (duplicate) {
          toast.warning('이미 존재하는 속성입니다.');
          setSubmitting(false);
          return;
        }
      } catch {
        toast.error('중복 체크 중 오류가 발생했습니다.');
        setSubmitting(false);
        return;
      }

      createProperty({
        tenantId,
        configFile,
        category: values.category,
        property: values.property,
        value: values.value,
        ptyDesc: values.ptyDesc?.trim() || undefined,
      });
    } else {
      const category = form.getFieldValue('category') as string;
      const property = form.getFieldValue('property') as string;
      updateProperty({
        key: { tenantId, configFile, category, property },
        data: {
          value: values.value,
          ptyDesc: values.ptyDesc?.trim() || undefined,
        },
      });
    }
  };

  const categoryReadonly = !!presetCategory;
  const isUpdate = mode === 'UPDATE';

  return (
    <Drawer
      title={isUpdate ? '속성 수정' : '속성 추가'}
      closable={{ placement: 'end' }}
      placement="right"
      open={open}
      onClose={handleClose}
      styles={{ wrapper: { width: 480 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {isUpdate ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="환경파일" className="mb-3">
          <Input value={configFile ?? ''} disabled />
        </Form.Item>

        <Form.Item
          label="카테고리"
          name="category"
          rules={[
            { required: true, message: '카테고리는 필수입니다' },
            { max: 100, message: '카테고리는 100자 이내여야 합니다' },
          ]}
          className="mb-3"
        >
          <Input placeholder="카테고리" disabled={isUpdate || categoryReadonly} maxLength={100} />
        </Form.Item>

        <Form.Item
          label="속성"
          name="property"
          rules={[
            { required: true, message: '속성은 필수입니다' },
            { max: 100, message: '속성은 100자 이내여야 합니다' },
          ]}
          className="mb-3"
        >
          <Input placeholder="속성명" disabled={isUpdate} maxLength={100} />
        </Form.Item>

        <Form.Item
          label="값"
          name="value"
          rules={[
            { required: true, message: '값은 필수입니다' },
            { max: 500, message: '값은 500자 이내여야 합니다' },
          ]}
          className="mb-3"
        >
          <TextArea rows={3} maxLength={500} showCount placeholder="값" />
        </Form.Item>

        <Form.Item label="설명" name="ptyDesc" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다' }]} className="mb-1">
          <TextArea rows={2} maxLength={256} showCount placeholder="설명 (선택)" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

PropertyEditDrawer.displayName = 'PropertyEditDrawer';
export default PropertyEditDrawer;
