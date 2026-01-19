import { Button, Col, Form, Input, Row } from 'antd';
import { Log } from '@/log';

export default function AoeBasicInfo() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    Log.debug('onFinish', values);
  };

  const onFinishFailed = (errorInfo: any) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="aoeUrl" label="AOE 연동 URL" rules={[{ required: true, message: 'AOE 연동 URL을 입력하세요.' }]}>
            <Input placeholder="AOE 연동 URL을 입력하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit">
            저장
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
