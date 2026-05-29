import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, type FormProps, Input, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetCodes } from '../hooks/useCommonQueries';
import { modelQueryKeys, useCreateSttModel, useUpdateSttModel } from '../hooks/useModelQueries';
import type { SttModelCreateData, SttModelItem, SttModelUpdateData } from '../types';

export interface SttModelDrawerRef {
  open: (engineCode?: string) => void;
  openEdit: (item: SttModelItem, engineCode: string) => void;
  close: () => void;
}

interface SttModelDrawerProps {
  onCreateSuccess?: () => void;
}

const SttModelDrawer = forwardRef<SttModelDrawerRef, SttModelDrawerProps>(({ onCreateSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<SttModelItem | null>(null);
  const isEdit = !!editItem;

  useImperativeHandle(ref, () => ({
    open: (engineCode?: string) => {
      setEditItem(null);
      if (engineCode) form.setFieldValue('engineCode', engineCode);
      setOpen(true);
    },
    openEdit: (item: SttModelItem, engineCode: string) => {
      setEditItem(item);
      form.setFieldValue('engineCode', engineCode);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  const [form] = Form.useForm<SttModelCreateData>();
  const queryClient = useQueryClient();

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });
  const engineOptions = engines?.map((e) => ({ label: e.value, value: e.code })) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSttModelList._def });

  const { mutate: createModel, isPending: isCreating } = useCreateSttModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 생성되었습니다.');
        invalidate();
        handleClose();
        onCreateSuccess?.();
      },
      onError: () => toast.error('모델 생성에 실패했습니다.'),
    },
  });

  const { mutate: updateModel, isPending: isUpdating } = useUpdateSttModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수정되었습니다.');
        invalidate();
        handleClose();
      },
      onError: () => toast.error('수정에 실패했습니다.'),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      form.setFieldsValue({
        modelVerName: editItem.modelVerName,
        modelDesc: editItem.modelDesc,
      });
    }
    return () => {
      Log.debug('SttModelDrawer resetFields');
      form.resetFields();
    };
  }, [form, open, editItem]);

  const onFinish: FormProps<SttModelCreateData>['onFinish'] = (values) => {
    if (isEdit) {
      const payload: SttModelUpdateData = { engineCode: values.engineCode, modelVerId: editItem.modelVerId, modelVerName: values.modelVerName, modelDesc: values.modelDesc };
      updateModel(payload);
    } else {
      createModel(values);
    }
  };

  const onFinishFailed: FormProps<SttModelCreateData>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) toast.error(firstError);
    Log.warn('onFinishFailed', errorInfo);
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isCreating || isUpdating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={isEdit ? '모델 상세' : '모델 추가'} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Form.Item name="engineCode" label="엔진" required rules={[{ required: true, message: '엔진을 선택해주세요.' }]}>
          <Select options={engineOptions} placeholder="엔진을 선택하세요" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="modelVerName" label="모델 이름" required hasFeedback rules={[{ required: true, message: '모델 이름을 입력해주세요.' }]}>
          <Input placeholder="모델 이름을 입력하세요" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="modelDesc" label="모델 적용 내용">
          <Input.TextArea placeholder="모델 적용 내용을 입력하세요" rows={8} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

SttModelDrawer.displayName = 'SttModelDrawer';
export default SttModelDrawer;
