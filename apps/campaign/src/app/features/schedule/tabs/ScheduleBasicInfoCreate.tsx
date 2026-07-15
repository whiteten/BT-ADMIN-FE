import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select, Switch } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetTenantOptionList } from '../../statistics/hooks/useCampaignStatisticsQueries';
import {
  SCHEDULE_CRON_ALL_VALUE,
  SCHEDULE_CRON_DAY_OF_WEEK_OPTIONS,
  SCHEDULE_CRON_DAY_OPTIONS,
  SCHEDULE_CRON_HOUR_VALUE_OPTIONS,
  SCHEDULE_CRON_MINUTE_VALUE_OPTIONS,
  SCHEDULE_CRON_MONTH_OPTIONS,
  SCHEDULE_CRON_REPEAT,
  SCHEDULE_CRON_REPEAT_OPTIONS,
  SCHEDULE_CRON_SECOND_VALUE_OPTIONS,
  SCHEDULE_CRON_SETTING,
  SCHEDULE_CRON_SETTING_OPTIONS,
} from '../constants/scheduleManagementFormConstants';

type ScheduleBasicInfoCreateFormValues = {
  scheduleName: string;
  serviceName: string;
  methodName: string;
  cronSetting: string;
  parameter?: string;
  dayOfWeek: string;
  month: string;
  day: string;
  hourRepeat: string;
  hourValue: string;
  minuteRepeat: string;
  minuteValue: string;
  secondRepeat: string;
  secondValue: string;
  tenantId: string;
  historyCollection: boolean;
  usageEnabled: boolean;
  memo?: string;
};

const initialValues: Partial<ScheduleBasicInfoCreateFormValues> = {
  cronSetting: SCHEDULE_CRON_SETTING.SELECT,
  dayOfWeek: SCHEDULE_CRON_ALL_VALUE,
  month: SCHEDULE_CRON_ALL_VALUE,
  day: SCHEDULE_CRON_ALL_VALUE,
  hourRepeat: SCHEDULE_CRON_REPEAT.NONE,
  hourValue: SCHEDULE_CRON_ALL_VALUE,
  minuteRepeat: SCHEDULE_CRON_REPEAT.NONE,
  minuteValue: SCHEDULE_CRON_ALL_VALUE,
  secondRepeat: SCHEDULE_CRON_REPEAT.NONE,
  secondValue: SCHEDULE_CRON_ALL_VALUE,
  tenantId: '',
  historyCollection: true,
  usageEnabled: false,
};

export default function ScheduleBasicInfoCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm<ScheduleBasicInfoCreateFormValues>();

  const { data: tenantOptionList } = useGetTenantOptionList();
  const tenantSelectOptions = useMemo(
    () => (tenantOptionList ?? []).filter((t) => Boolean(t?.tenantId && t?.tenantName)).map((t) => ({ label: String(t.tenantName), value: String(t.tenantId) })),
    [tenantOptionList],
  );

  const onFinish: FormProps<ScheduleBasicInfoCreateFormValues>['onFinish'] = (values) => {
    if (values.usageEnabled) {
      toast.warning("사용여부가 '아니오'일 경우에만(스케줄 중지시) 저장 가능합니다.");
      return;
    }

    Log.debug('onFinish', values);
    toast.success('스케줄이 저장되었습니다. (백엔드 연동 전)');
    navigate('../schedule-management');
  };

  const onFinishFailed: FormProps<ScheduleBasicInfoCreateFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCloseBtn = () => {
    form.resetFields();
    navigate('../schedule-management');
  };

  return (
    <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={18}>
          <Form.Item
            name="scheduleName"
            label="스케줄명"
            required
            hasFeedback
            rules={[
              { required: true, message: '스케줄명을 입력해 주세요.' },
              { whitespace: true, message: '스케줄명을 입력해 주세요.' },
            ]}
          >
            <Input placeholder="스케줄명을 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="스케줄ID" required>
            <Input disabled placeholder="자동생성" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={12}>
          <Form.Item
            name="serviceName"
            label="서비스명"
            required
            hasFeedback
            rules={[
              { required: true, message: '서비스명을 입력해 주세요.' },
              { whitespace: true, message: '서비스명을 입력해 주세요.' },
            ]}
          >
            <Input placeholder="서비스명을 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="methodName"
            label="메서드명"
            required
            hasFeedback
            rules={[
              { required: true, message: '메서드명을 입력해 주세요.' },
              { whitespace: true, message: '메서드명을 입력해 주세요.' },
            ]}
          >
            <Input placeholder="메서드명을 입력하세요." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="cronSetting" label="CRON설정" required rules={[{ required: true, message: 'CRON설정을 선택해 주세요.' }]}>
            <Select options={[...SCHEDULE_CRON_SETTING_OPTIONS]} placeholder="CRON설정을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={18}>
          <Form.Item name="parameter" label="파라미터">
            <Input placeholder="파라미터를 입력하세요." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={8}>
          <Form.Item name="dayOfWeek" label="요일">
            <Select options={[...SCHEDULE_CRON_DAY_OF_WEEK_OPTIONS]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="month" label="월">
            <Select options={[...SCHEDULE_CRON_MONTH_OPTIONS]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="day" label="일">
            <Select options={[...SCHEDULE_CRON_DAY_OPTIONS]} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={8}>
          <Form.Item label="시">
            <div className="flex items-center gap-2">
              <Form.Item name="hourRepeat" noStyle>
                <Select options={[...SCHEDULE_CRON_REPEAT_OPTIONS]} className="flex-1" />
              </Form.Item>
              <Form.Item name="hourValue" noStyle>
                <Select options={SCHEDULE_CRON_HOUR_VALUE_OPTIONS} className="flex-1" />
              </Form.Item>
            </div>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="분">
            <div className="flex items-center gap-2">
              <Form.Item name="minuteRepeat" noStyle>
                <Select options={[...SCHEDULE_CRON_REPEAT_OPTIONS]} className="flex-1" />
              </Form.Item>
              <Form.Item name="minuteValue" noStyle>
                <Select options={SCHEDULE_CRON_MINUTE_VALUE_OPTIONS} className="flex-1" />
              </Form.Item>
            </div>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="초">
            <div className="flex items-center gap-2">
              <Form.Item name="secondRepeat" noStyle>
                <Select options={[...SCHEDULE_CRON_REPEAT_OPTIONS]} className="flex-1" />
              </Form.Item>
              <Form.Item name="secondValue" noStyle>
                <Select options={SCHEDULE_CRON_SECOND_VALUE_OPTIONS} className="flex-1" />
              </Form.Item>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트를 선택해 주세요.' }]}>
            <Select options={tenantSelectOptions} placeholder="테넌트를 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="historyCollection" label="이력수집여부" valuePropName="checked">
            <Switch checkedChildren="예" unCheckedChildren="아니오" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={24}>
          <Form.Item label="사용여부">
            <div className="flex items-center gap-3 flex-wrap">
              <Form.Item name="usageEnabled" noStyle valuePropName="checked">
                <Switch checkedChildren="예" unCheckedChildren="아니오" />
              </Form.Item>
              <span className="text-sm text-red-500">※ 사용여부가 &apos;아니오&apos; 일 경우에만(스케줄 중지시) 저장 가능합니다.</span>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={24}>
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={4} placeholder="메모를 입력하세요." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={12}>
          <Form.Item label="작업자">
            <Input disabled placeholder="저장시 입력" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="작업일시">
            <Input disabled placeholder="저장시 입력" />
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
