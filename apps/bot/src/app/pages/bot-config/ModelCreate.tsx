import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import type { ModelCreateDatas } from '../../features/bot-config/types';
import { ModelType } from '../../features/bot-config/types/model';
import PageHeader from '@/components/custom/PageHeader';

export default function ModelCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { isPublic } = useModelRoute();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    isPublic ? { title: '공용 모델', path: '/bot/common/model/list' } : { title: '모델', path: '/bot/bot-config/model' },
    isPublic ? { title: '공용 모델 생성', path: '/bot/common/model/create' } : { title: '모델 생성', path: '/bot/bot-config/model/create' },
  ];
  const initialValues = { modelName: '', expansion1: '' };

  const { mutate: createModel, isPending: isCreatingModel } = useCreateModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 생성되었습니다.');
        navigate('../list');
      },
    },
  });
  const onFinish: FormProps<ModelCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createModel({ ...values, modelType: isPublic ? ModelType.PUBLIC : ModelType.NORMAL } as ModelCreateDatas);
  };
  const onFinishFailed: FormProps<ModelCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="모델 생성" breadcrumb={breadcrumb} />
      <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
        <div className="flex flex-col w-full h-full p-7 pb-0">
          <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item
                  name="modelName"
                  label="모델 이름"
                  required
                  hasFeedback
                  rules={[
                    { required: true, message: '모델 이름을 입력해 주세요.' },
                    { pattern: /^\S*$/, message: '공백은 사용할 수 없습니다.' },
                  ]}
                >
                  <Input placeholder="모델 이름을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={24}>
                <Form.Item name="expansion1" label="모델 설명">
                  <Input.TextArea rows={4} placeholder="모델 설명을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
              <Col>
                <Button variant="solid" color="primary" htmlType="submit" loading={isCreatingModel}>
                  저장
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  );
}
