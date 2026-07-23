import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import type { ScheduleManagementItem } from '../types/scheduleManagement';

type ScheduleParameterFormValues = {
  parameter?: string;
};

/** API 연동 전 placeholder — 반환 타입을 유지해 CFA가 never로 좁히지 않게 함 */
function getScheduleManagementDetail(_scheduleId: string | undefined): ScheduleManagementItem | undefined {
  return undefined;
}

export default function ScheduleParameterBasicInfo() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ScheduleParameterFormValues>();
  const schedule = getScheduleManagementDetail(scheduleId);

  const onFinish: FormProps<ScheduleParameterFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    toast.success('파라미터가 저장되었습니다. (백엔드 연동 전)');
  };

  const onFinishFailed: FormProps<ScheduleParameterFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCloseBtn = () => {
    navigate('../..');
  };

  useEffect(() => {
    if (!schedule) return;
    form.setFieldsValue({ parameter: schedule.parameter });
  }, [schedule, form]);

  if (!schedule) {
    return <div className="text-gray-500">스케줄 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={18}>
          <Form.Item label="스케줄명">
            <Input disabled value={schedule.scheduleName} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="스케줄아이디">
            <Input disabled value={schedule.scheduleCode} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={24}>
          <Form.Item name="parameter" label="파라미터">
            <Input placeholder="파라미터를 입력하세요." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={24}>
          <Form.Item label="내용">
            <div className="w-full min-h-[320px] rounded border border-[#E9EBEC] bg-[#1e1e1e]" aria-label="내용 영역" />
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
          <Button variant="solid" onClick={handleClickCloseBtn}>
            닫기
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
