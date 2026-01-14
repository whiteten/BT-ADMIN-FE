import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * BotEnvDrawer ref 타입
 * @property open - 드로어를 여는 함수. envId가 없으면 추가 모드, 있으면 편집 모드
 * @property close - 드로어를 닫는 함수
 */
export interface BotEnvDrawerRef {
  open: (params: { serviceId: string; envId?: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  serviceId: string;
  envId?: string;
}

/**
 * 환경변수 폼 데이터 타입
 */
interface BotEnvFormData {
  categoryName: string;
  varName: string;
  varValue: string;
}

/**
 * Bot 환경변수 등록/수정 Drawer
 * - ref.open({ serviceId }) : 추가 모드로 열기
 * - ref.open({ serviceId, envId }) : 편집 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const BotEnvDrawer = forwardRef<BotEnvDrawerRef>((_, ref) => {
  const modal = useModal();
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    envId: undefined,
  });

  const { open, serviceId, envId } = drawerState;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        envId: params.envId,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const title = envId ? '환경변수 수정' : '환경변수 추가';
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    // TODO: envId가 있으면 API로 데이터 조회 후 setFieldsValue
    if (envId) {
      // 편집 모드일 때 데이터 로드 (API 연동 시 구현)
      form.setFieldsValue({ categoryName: '', varName: '', varValue: '' });
    }
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [envId, form, open]);

  const onFinish: FormProps<BotEnvFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values, 'serviceId:', serviceId);
    // TODO: API 연동
    if (envId) {
      // 수정 API 호출
      toast.success('환경변수가 수정되었습니다.');
    } else {
      // 추가 API 호출
      toast.success('환경변수가 추가되었습니다.');
    }
    handleClose();
  };

  const onFinishFailed: FormProps<BotEnvFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => {
        Log.debug('handleDeleteBtn', envId);
        // TODO: 삭제 API 연동
        toast.success('환경변수가 삭제되었습니다.');
        handleClose();
      },
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      {envId && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ categoryName: '', varName: '', varValue: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="categoryName" label="분류명" required hasFeedback rules={[{ required: true, message: '분류명을 입력하세요.' }]}>
              <Input placeholder="분류명을 입력하세요." disabled={!!envId} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="varName" label="변수명" required hasFeedback rules={[{ required: true, message: '변수명을 입력하세요.' }]}>
              <Input placeholder="변수명을 입력하세요." disabled={!!envId} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="varValue" label="값" required hasFeedback rules={[{ required: true, message: '값을 입력하세요.' }]}>
              <Input placeholder="값을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

export default BotEnvDrawer;
