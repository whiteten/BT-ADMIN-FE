import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select, Table, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { EXECUTION_MANAGEMENT_PATH, EXECUTION_TARGET_STATUS_OPTIONS } from '../constants/executionManagementConstants';
import { type CampaignExecutionItem, type ExecutionTargetExtraInfoItem, type ExecutionTargetItem, type ExecutionTargetStatus } from '../types';

type ExecutionTargetBasicInfoFormValues = {
  senderKey: string;
  customerKey: string;
  campaignId: string;
  scenarioListId: string;
  round: number;
  createdAt: string;
  phoneNumber: string;
  processStatus: ExecutionTargetStatus;
  reservationTime: Dayjs | null;
  callId: string;
  callDateTime: string;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

const parseReservationTime = (value?: string) => (value ? dayjs(value, 'HH:mm') : null);

/** API 연동 전 placeholder — 반환 타입을 유지해 CFA가 never로 좁히지 않게 함 */
function getExecutionTarget(_targetId: string | undefined): ExecutionTargetItem | undefined {
  return undefined;
}

function getCampaignExecution(_executionId: string | undefined): CampaignExecutionItem | undefined {
  return undefined;
}

export default function ExecutionTargetBasicInfo() {
  const { targetId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ExecutionTargetBasicInfoFormValues>();
  const target = getExecutionTarget(targetId);
  const execution = target ? getCampaignExecution(target.executionId) : undefined;

  const campaignSelectOptions = useMemo(() => {
    if (!execution) return [];
    return [{ label: execution.campaignName, value: execution.campaignId }];
  }, [execution]);

  const scenarioSelectOptions = useMemo(() => {
    if (!execution) return [];
    return [{ label: execution.scenarioName, value: execution.scenarioListId }];
  }, [execution]);

  const onFinish: FormProps<ExecutionTargetBasicInfoFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', {
      reservationTime: values.reservationTime ? values.reservationTime.format('HH:mm') : null,
    });
    toast.success('예약시간이 저장되었습니다. (백엔드 연동 전)');
  };

  const onFinishFailed: FormProps<ExecutionTargetBasicInfoFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCloseBtn = () => {
    navigate(EXECUTION_MANAGEMENT_PATH);
  };

  useEffect(() => {
    if (!target || !execution) return;

    form.setFieldsValue({
      senderKey: target.senderKey ?? '-',
      customerKey: target.customerKey ?? '-',
      campaignId: execution.campaignId,
      scenarioListId: execution.scenarioListId,
      round: target.round ?? execution.round,
      createdAt: formatDateTime(target.createdAt ?? target.workDateTime),
      phoneNumber: target.phoneNumber,
      processStatus: target.processStatus,
      reservationTime: parseReservationTime(target.reservationTime),
      callId: target.callId ?? '-',
      callDateTime: formatDateTime(target.callDateTime),
    });
  }, [target, execution, form]);

  if (!target) {
    return <div className="p-7 text-gray-500">실행대상 정보를 찾을 수 없습니다.</div>;
  }

  const extraInfoColumns = [
    { title: '부가정보', dataIndex: 'key', key: 'key' },
    { title: '값', dataIndex: 'value', key: 'value' },
    { title: '설명', dataIndex: 'description', key: 'description' },
  ];

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="senderKey" label="발신키">
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="customerKey" label="고객키">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignId" label="캠페인">
            <Select disabled options={campaignSelectOptions} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="scenarioListId" label="시나리오">
            <Select disabled options={scenarioSelectOptions} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="round" label="차수">
            <InputNumber disabled className="w-full" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="createdAt" label="생성일시">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="phoneNumber" label="전화번호" required>
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="processStatus" label="처리상태" required>
            <Select disabled options={[...EXECUTION_TARGET_STATUS_OPTIONS]} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item label="예약시간">
            <div className="flex items-center gap-2">
              <Form.Item name="reservationTime" noStyle>
                <TimePicker format="HH:mm" showMinute={false} showSecond={false} showNow={false} needConfirm={false} allowClear className="w-full" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">(미입력시즉시발송대상)</span>
            </div>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="callId" label="콜ID">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="callDateTime" label="통화일시">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={24}>
          <Form.Item label=" ">
            <Table<ExecutionTargetExtraInfoItem>
              columns={extraInfoColumns}
              dataSource={target.extraInfoItems ?? []}
              rowKey="key"
              pagination={false}
              bordered
              size="small"
              locale={{ emptyText: ' ' }}
            />
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
