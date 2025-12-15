import { useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { type ModelBasicInfoUpdateDatas } from '../types';

export default function ModelBasicInfo() {
  const { modelId } = useParams();
  const [form] = Form.useForm();

  const onFinish: FormProps<ModelBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
  };

  const onFinishFailed: FormProps<ModelBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  return (
    <Form form={form} initialValues={{ modelName: '', modelDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="modelName" label="모델 이름" required rules={[{ required: true, message: '모델 이름을 입력해 주세요.' }]}>
            <Input placeholder="모델 이름을 입력하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={24}>
          <Form.Item name="modelDesc" label="모델 설명">
            <Input.TextArea rows={4} placeholder="모델 설명을 입력하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit">
            저장
          </Button>
        </Col>
        <Col>
          <Button color="red" variant="solid">
            삭제
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
