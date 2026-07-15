/**
 * ACS 실패사유코드 등록/수정 Modal (AS-IS popupAcsFailCodeDetail).
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, InputNumber, Modal } from 'antd';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useCreateFailCode, useUpdateFailCode } from '../hooks/useAcsServiceQueries';
import type { AcsFailCode } from '../types/acsService.types';

interface FormValues {
  failCode: string;
  failCodeName: string;
  retryCnt: number;
  retryPeriod: number;
  memo?: string;
}

export interface AcsFailCodeFormModalRef {
  openCreate: () => void;
  openEdit: (failCode: AcsFailCode) => void;
}

const AcsFailCodeFormModal = forwardRef<AcsFailCodeFormModalRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<AcsFailCode | null>(null);
  const isEditMode = editing !== null;

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      form.resetFields();
      form.setFieldsValue({ retryCnt: 3, retryPeriod: 10 });
      setEditing(null);
      setVisible(true);
    },
    openEdit: (failCode) => {
      form.resetFields();
      form.setFieldsValue({
        failCode: failCode.failCode,
        failCodeName: failCode.failCodeName,
        retryCnt: failCode.retryCnt ?? 0,
        retryPeriod: failCode.retryPeriod ?? 0,
        memo: failCode.memo ?? undefined,
      });
      setEditing(failCode);
      setVisible(true);
    },
  }));

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateFailCode();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateFailCode();
  const isPending = isCreating || isUpdating;

  const handleSubmit = async (values: FormValues) => {
    const action = isEditMode ? '수정' : '등록';
    try {
      if (isEditMode && editing) {
        await updateAsync({
          failCode: editing.failCode,
          data: {
            failCodeName: values.failCodeName,
            retryCnt: values.retryCnt,
            retryPeriod: values.retryPeriod,
            memo: values.memo ?? null,
          },
        });
      } else {
        await createAsync({
          failCode: values.failCode,
          failCodeName: values.failCodeName,
          retryCnt: values.retryCnt,
          retryPeriod: values.retryPeriod,
          memo: values.memo ?? null,
        });
      }
      toast.success(`${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getDialConfig.queryKey });
      setVisible(false);
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  return (
    <Modal
      title={isEditMode ? '실패사유코드 수정' : '실패사유코드 추가'}
      open={visible}
      onCancel={() => setVisible(false)}
      onOk={() => form.submit()}
      okText={isEditMode ? '저장' : '등록'}
      cancelText="취소"
      confirmLoading={isPending}
      destroyOnHidden
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item
          name="failCode"
          label="ACS 실패사유코드"
          required
          rules={[
            { required: true, message: '실패사유코드는 필수입니다' },
            { pattern: /^\d{1,10}$/, message: '숫자만 입력 가능합니다' },
          ]}
        >
          <Input placeholder="숫자 (0~10은 시스템 예약)" maxLength={10} disabled={isEditMode} />
        </Form.Item>
        <Form.Item
          name="failCodeName"
          label="ACS 실패사유코드명"
          required
          rules={[
            { required: true, message: '실패사유코드명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="코드명 (최대 100자)" maxLength={100} />
        </Form.Item>
        <Form.Item name="retryCnt" label="재시도횟수" required rules={[{ required: true, message: '재시도횟수는 필수입니다' }]}>
          <InputNumber min={0} className="!w-full" />
        </Form.Item>
        <Form.Item name="retryPeriod" label="재시도 주기 (초)" required rules={[{ required: true, message: '재시도 주기는 필수입니다' }]}>
          <InputNumber min={0} className="!w-full" />
        </Form.Item>
        <Form.Item name="memo" label="실패사유내용" rules={[{ max: 300, message: '300자 이내' }]}>
          <Input placeholder="(선택, 최대 300자)" maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

AcsFailCodeFormModal.displayName = 'AcsFailCodeFormModal';
export default AcsFailCodeFormModal;
