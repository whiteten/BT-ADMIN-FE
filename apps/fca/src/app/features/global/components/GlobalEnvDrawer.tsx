import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { globalEnvQueryKeys, useCreateGlobalEnv, useDeleteGlobalEnv, useUpdateGlobalEnv } from '../hooks/useGlobalEnvQueries';
import type { GlobalEnvListItem } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface GlobalEnvDrawerRef {
  open: (params?: { envData?: GlobalEnvListItem }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  envData?: GlobalEnvListItem;
}

interface GlobalEnvFormData {
  category: string;
  property: string;
  value: string;
}

const GlobalEnvDrawer = forwardRef<GlobalEnvDrawerRef>((_, ref) => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, envData: undefined });

  const { open, envData } = drawerState;
  const isEditMode = !!envData;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({ open: true, envData: params?.envData });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const invalidateGlobalEnvList = () => {
    queryClient.invalidateQueries({ queryKey: globalEnvQueryKeys.getGlobalEnvList._def });
  };

  const createGlobalEnvMutation = useCreateGlobalEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateGlobalEnvList();
        toast.success('공용 환경변수가 추가되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('공용 환경변수 추가에 실패했습니다.');
      },
    },
  });

  const updateGlobalEnvMutation = useUpdateGlobalEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateGlobalEnvList();
        toast.success('공용 환경변수가 수정되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('공용 환경변수 수정에 실패했습니다.');
      },
    },
  });

  const deleteGlobalEnvMutation = useDeleteGlobalEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateGlobalEnvList();
        toast.success('공용 환경변수가 삭제되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('공용 환경변수 삭제에 실패했습니다.');
      },
    },
  });

  const isLoading = createGlobalEnvMutation.isPending || updateGlobalEnvMutation.isPending || deleteGlobalEnvMutation.isPending;
  const title = isEditMode ? '공용 환경변수 수정' : '공용 환경변수 추가';
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (envData) {
      form.setFieldsValue({
        category: envData.category,
        property: envData.property,
        value: envData.value,
      });
    }
    return () => {
      Log.debug('Reset GlobalEnvDrawer Form');
      form.resetFields();
    };
  }, [envData, form, open]);

  const onFinish: FormProps<GlobalEnvFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (isEditMode && envData) {
      updateGlobalEnvMutation.mutate({
        params: { category: envData.category, property: envData.property },
        data: { value: values.value },
      });
    } else {
      createGlobalEnvMutation.mutate(values);
    }
  };

  const onFinishFailed: FormProps<GlobalEnvFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    if (!envData) return;
    modal.confirm.delete({
      onOk: () => {
        deleteGlobalEnvMutation.mutate({
          category: envData.category,
          property: envData.property,
        });
      },
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose} disabled={isLoading}>
        취소
      </Button>
      {isEditMode && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={deleteGlobalEnvMutation.isPending} disabled={isLoading}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={createGlobalEnvMutation.isPending || updateGlobalEnvMutation.isPending} disabled={isLoading}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ category: '', property: '', value: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="category" label="분류명" required hasFeedback rules={[{ required: true, message: '분류명을 입력하세요.' }]}>
              <Input placeholder="분류명을 입력하세요." disabled={isEditMode} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="property" label="변수명" required hasFeedback rules={[{ required: true, message: '변수명을 입력하세요.' }]}>
              <Input placeholder="변수명을 입력하세요." disabled={isEditMode} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="value" label="값" required hasFeedback rules={[{ required: true, message: '값을 입력하세요.' }]}>
              <Input placeholder="값을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

GlobalEnvDrawer.displayName = 'GlobalEnvDrawer';
export default GlobalEnvDrawer;
