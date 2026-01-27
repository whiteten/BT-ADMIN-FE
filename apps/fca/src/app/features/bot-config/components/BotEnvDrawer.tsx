import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useCreateEnv, useDeleteEnv, useUpdateEnv } from '../hooks/useBotQueries';
import type { EnvListItem } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * BotEnvDrawer ref 타입
 * @property open - 드로어를 여는 함수. envData가 없으면 추가 모드, 있으면 편집 모드
 * @property close - 드로어를 닫는 함수
 */
export interface BotEnvDrawerRef {
  open: (params: { serviceId: string; envData?: EnvListItem }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  serviceId: string;
  envData?: EnvListItem;
}

/**
 * 환경변수 폼 데이터 타입
 */
interface BotEnvFormData {
  category: string;
  property: string;
  value: string;
}

/**
 * Bot 환경변수 등록/수정 Drawer
 * - ref.open({ serviceId }) : 추가 모드로 열기
 * - ref.open({ serviceId, envData }) : 편집 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const BotEnvDrawer = forwardRef<BotEnvDrawerRef>((_, ref) => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    envData: undefined,
  });

  const { open, serviceId, envData } = drawerState;
  const isEditMode = !!envData;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        envData: params.envData,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const invalidateEnvList = () => {
    queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvList._def });
  };

  // Mutation 훅
  const createEnvMutation = useCreateEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateEnvList();
        toast.success('환경변수가 추가되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('환경변수 추가에 실패했습니다.');
      },
    },
  });

  const updateEnvMutation = useUpdateEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateEnvList();
        toast.success('환경변수가 수정되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('환경변수 수정에 실패했습니다.');
      },
    },
  });

  const deleteEnvMutation = useDeleteEnv({
    mutationOptions: {
      onSuccess: () => {
        invalidateEnvList();
        toast.success('환경변수가 삭제되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('환경변수 삭제에 실패했습니다.');
      },
    },
  });

  const isLoading = createEnvMutation.isPending || updateEnvMutation.isPending || deleteEnvMutation.isPending;

  const title = isEditMode ? '환경변수 수정' : '환경변수 추가';
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
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [envData, form, open]);

  const onFinish: FormProps<BotEnvFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values, 'serviceId:', serviceId);
    if (isEditMode && envData) {
      updateEnvMutation.mutate({
        params: { serviceId, category: envData.category, property: envData.property },
        data: { value: values.value },
      });
    } else {
      createEnvMutation.mutate({
        params: { serviceId },
        data: values,
      });
    }
  };

  const onFinishFailed: FormProps<BotEnvFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    if (!envData) return;
    modal.confirm.delete({
      onOk: () => {
        deleteEnvMutation.mutate({
          serviceId,
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
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={deleteEnvMutation.isPending} disabled={isLoading}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={createEnvMutation.isPending || updateEnvMutation.isPending} disabled={isLoading}>
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

export default BotEnvDrawer;
