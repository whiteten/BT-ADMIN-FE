import { forwardRef, useImperativeHandle } from 'react';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { DEFAULT_SCHEDULE_SERVER_PORT, SCHEDULE_SERVER_PROTOCOL, SCHEDULE_SERVER_PROTOCOL_OPTIONS } from '../constants/scheduleServerConstants';
import type { ScheduleServerFormValues } from '../types/scheduleServer';

export type ScheduleServerDetailFormRef = {
  resetForm: (values?: Partial<ScheduleServerFormValues>) => void;
  submit: () => void;
  isEmptyForm: () => boolean;
};

type ScheduleServerDetailFormProps = {
  onSave: (values: ScheduleServerFormValues) => void;
  onClose: () => void;
};

const ScheduleServerDetailForm = forwardRef<ScheduleServerDetailFormRef, ScheduleServerDetailFormProps>(({ onSave, onClose }, ref) => {
  const [form] = Form.useForm<ScheduleServerFormValues>();

  useImperativeHandle(ref, () => ({
    resetForm: (values) => {
      form.resetFields();
      if (values) {
        form.setFieldsValue(values);
      }
    },
    submit: () => {
      form.submit();
    },
    isEmptyForm: () => {
      const values = form.getFieldsValue();
      return !values.serverCategory?.trim() && !values.serverIp?.trim() && !values.hostName?.trim();
    },
  }));

  const onFinish: FormProps<ScheduleServerFormValues>['onFinish'] = (values) => {
    Log.debug('scheduleServer onFinish', values);
    onSave(values);
  };

  const onFinishFailed: FormProps<ScheduleServerFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        serverPort: DEFAULT_SCHEDULE_SERVER_PORT,
        protocol: SCHEDULE_SERVER_PROTOCOL.HTTP,
      }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
    >
      <Row gutter={20}>
        <Col span={4}>
          <Form.Item name="serverCategory" label="서버구분">
            <Input disabled placeholder="자동입력" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="serverIp"
            label="서버IP"
            required
            hasFeedback
            rules={[
              { required: true, message: '서버IP를 입력해 주세요.' },
              { whitespace: true, message: '서버IP를 입력해 주세요.' },
            ]}
          >
            <Input placeholder="필수입력" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="호스트명">
            <div className="flex items-center gap-2">
              <Form.Item name="hostName" noStyle>
                <Input placeholder="호스트명을 입력하세요." className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">※ 옵션, 서버IP 입력</span>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="serverPort" label="서버포트" required rules={[{ required: true, message: '서버포트를 입력해 주세요.' }]}>
            <InputNumber min={1} max={65535} className="w-full" placeholder="9090" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="protocol" label="프로토콜" required rules={[{ required: true, message: '프로토콜을 선택해 주세요.' }]}>
            <Select options={[...SCHEDULE_SERVER_PROTOCOL_OPTIONS]} placeholder="프로토콜을 선택하세요." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20} justify="center" className="mt-2">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit">
            저장
          </Button>
        </Col>
        <Col>
          <Button variant="solid" onClick={onClose}>
            닫기
          </Button>
        </Col>
      </Row>
    </Form>
  );
});

ScheduleServerDetailForm.displayName = 'ScheduleServerDetailForm';

export default ScheduleServerDetailForm;
