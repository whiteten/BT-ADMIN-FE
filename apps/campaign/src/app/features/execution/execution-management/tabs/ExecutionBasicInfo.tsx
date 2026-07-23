import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, DatePicker, Form, type FormProps, Input, InputNumber, Row, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { EXECUTION_MANAGEMENT_PATH, EXECUTION_STATUS_OPTIONS } from '../constants/executionManagementConstants';
import { type CampaignExecutionItem, type ExecutionStatus } from '../types';

type ExecutionBasicInfoFormValues = {
  campaignName: string;
  campaignDisplayId: string;
  scenarioName: string;
  scenarioDisplayId: string;
  executionDate: Dayjs;
  processTime: [Dayjs, Dayjs];
  status: ExecutionStatus;
  round: number;
  notificationCriteria: number;
  actionChannel: string;
  campaignCode: string;
  description: string;
  targetCount: number;
  workDateTime: string;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

const parseTime = (value?: string) => (value ? dayjs(value, 'HH:mm') : dayjs('00:00', 'HH:mm'));

/** API 연동 전 placeholder — 반환 타입을 유지해 CFA가 never로 좁히지 않게 함 */
function getCampaignExecution(_executionId: string | undefined): CampaignExecutionItem | undefined {
  return undefined;
}

export default function ExecutionBasicInfo() {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ExecutionBasicInfoFormValues>();
  const execution = getCampaignExecution(executionId);

  const onFinish: FormProps<ExecutionBasicInfoFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', { status: values.status, description: values.description });
    toast.success('처리상태와 설명이 저장되었습니다. (백엔드 연동 전)');
  };

  const onFinishFailed: FormProps<ExecutionBasicInfoFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCloseBtn = () => {
    navigate(EXECUTION_MANAGEMENT_PATH);
  };

  useEffect(() => {
    if (!execution) return;

    form.setFieldsValue({
      campaignName: execution.campaignName,
      campaignDisplayId: execution.campaignDisplayId ?? execution.campaignId,
      scenarioName: execution.scenarioName,
      scenarioDisplayId: execution.scenarioDisplayId ?? execution.scenarioListId,
      executionDate: dayjs(execution.executionDate),
      processTime: [parseTime(execution.processTimeStart), parseTime(execution.processTimeEnd)],
      status: execution.status,
      round: execution.round,
      notificationCriteria: execution.notificationCriteria ?? 0,
      actionChannel: execution.actionChannel ?? execution.channel,
      campaignCode: execution.campaignCode ?? execution.scenarioListId,
      description: execution.description ?? '',
      targetCount: execution.targetCount,
      workDateTime: formatDateTime(execution.workDateTime ?? execution.processFinalTime),
    });
  }, [execution, form]);

  if (!execution) {
    return <div className="p-7 text-gray-500">캠페인 실행 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignName" label="캠페인">
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="campaignDisplayId" label="캠페인ID">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="scenarioName" label="시나리오">
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="scenarioDisplayId" label="시나리오ID">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="executionDate" label="실행일자">
            <DatePicker disabled className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="processTime" label="처리시간">
            <TimePicker.RangePicker disabled className="w-full" format="HH:mm" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="status" label="처리상태" rules={[{ required: true, message: '처리상태를 선택해 주세요.' }]}>
            <Select options={[...EXECUTION_STATUS_OPTIONS]} placeholder="처리상태를 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="round" label="차수">
            <InputNumber disabled className="w-full" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item label="알림기준">
            <div className="flex items-center gap-2">
              <Form.Item name="notificationCriteria" noStyle>
                <InputNumber disabled className="w-full" />
              </Form.Item>
              <span className="shrink-0 text-sm text-[#495057]">% 이상 진행시 알림</span>
            </div>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="actionChannel" label="액션채널">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignCode" label="캠페인코드">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={24}>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={3} placeholder="추가 설명을 입력하세요.(옵션)" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="targetCount" label="대상수">
            <InputNumber disabled className="w-full" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="workDateTime" label="작업일시">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 z-10 bg-white/90 pb-7">
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
