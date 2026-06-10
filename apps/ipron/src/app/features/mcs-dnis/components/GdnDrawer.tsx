/**
 * MCS 대표번호(GDN) 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 필드:
 * - 통신사 (Select: 공통/KT/SKT/LGU+)
 * - 분배방식 (Input, disabled — 코드테이블 미확정으로 표시 전용)
 * - 대표번호 (Input, 숫자만, max 24, 수정 시 disabled)
 * - 설명 (Input, max 256, 필수)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMcsGdn, useUpdateMcsGdn } from '../hooks/useMcsDnisQueries';
import { type McsdGdn, NETWORK_OPERATOR_OPTIONS, type NetworkOperator } from '../types';

export interface GdnDrawerRef {
  open: (data?: McsdGdn, initialOp?: NetworkOperator | null) => void;
  close: () => void;
}

interface Props {
  onSuccess: (created?: { mcsdGdnNo: string; networkOp: NetworkOperator }) => void;
}

const GdnDrawer = forwardRef<GdnDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<McsdGdn | null>(null);
  const [initialOp, setInitialOp] = useState<NetworkOperator | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: McsdGdn, op?: NetworkOperator | null) => {
      setEditData(data ?? null);
      setInitialOp(op ?? null);
      setVisible(true);
    },
    close: () => handleClose(),
  }));

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setInitialOp(null);
    form.resetFields();
  }, [form]);

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        mcsdGdnNo: editData.mcsdGdnNo,
        networkOp: editData.networkOp,
        description: editData.description ?? '',
        distrMethod: editData.distrMethod ?? 0,
      });
    } else if (visible) {
      form.resetFields();
      // 등록 모드: 현재 선택된 통신사가 있으면 고정, 없으면 공통(0) 기본
      form.setFieldsValue({ networkOp: initialOp ?? '0', distrMethod: 0 });
    }
  }, [visible, editData, initialOp, form]);

  // ─── Mutations ────────────────────────────────────────────────────────
  // 등록 직후 포커싱을 위해 입력값을 일시 보관
  const [pendingCreate, setPendingCreate] = useState<{ mcsdGdnNo: string; networkOp: NetworkOperator } | null>(null);

  const { mutate: createGdn, isPending: isCreating } = useCreateMcsGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('대표번호가 등록되었습니다.');
        const created = pendingCreate;
        setPendingCreate(null);
        handleClose();
        onSuccess(created ?? undefined);
      },
      onError: () => setPendingCreate(null),
    },
  });

  const { mutate: updateGdn, isPending: isUpdating } = useUpdateMcsGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('대표번호가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const networkOp = values.networkOp as NetworkOperator;
      const description = values.description?.trim() || null;

      if (isEditMode && editData) {
        updateGdn({
          gdnNo: editData.mcsdGdnNo,
          data: { networkOp, description, distrMethod: editData.distrMethod ?? 0 },
        });
      } else {
        setPendingCreate({ mcsdGdnNo: values.mcsdGdnNo, networkOp });
        createGdn({
          mcsdGdnNo: values.mcsdGdnNo,
          networkOp,
          description,
          distrMethod: 0,
        });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, createGdn, updateGdn]);

  return (
    <Drawer
      title={isEditMode ? '대표번호 수정' : '대표번호 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isCreating || isUpdating}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ networkOp: '0' }}>
        <Form.Item name="networkOp" label="통신사" rules={[{ required: true, message: '통신사를 선택하세요' }]}>
          <Select options={[...NETWORK_OPERATOR_OPTIONS]} placeholder="통신사를 선택하세요" disabled={!isEditMode && initialOp !== null} />
        </Form.Item>

        <Form.Item
          name="mcsdGdnNo"
          label="대표번호"
          rules={[
            { required: true, message: '대표번호는 필수입니다' },
            { max: 24, message: '대표번호는 24자 이내여야 합니다' },
            { pattern: /^[0-9]*$/, message: '대표번호는 숫자만 입력 가능합니다' },
          ]}
        >
          <Input placeholder="대표번호를 입력하세요" maxLength={24} disabled={isEditMode} />
        </Form.Item>

        {/* 분배방식: SWAT poDistrMethod disabled 콤보와 동일 — 코드테이블 미확정으로 숫자값 표시 전용 */}
        <Form.Item name="distrMethod" label="분배방식">
          <Input disabled />
        </Form.Item>

        <Form.Item
          name="description"
          label="설명"
          rules={[
            { required: true, message: '설명은 필수입니다' },
            { max: 256, message: '설명은 256자 이내여야 합니다' },
          ]}
        >
          <Input.TextArea placeholder="설명을 입력하세요" maxLength={256} rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

GdnDrawer.displayName = 'GdnDrawer';
export default GdnDrawer;
