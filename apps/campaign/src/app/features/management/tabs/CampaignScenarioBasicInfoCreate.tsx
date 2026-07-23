import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select, Switch } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import {
  CALL_MULTIPLIER_OPTIONS,
  DEFAULT_SCENARIO_FILE_LOCATION,
  LOADED_CAMPAIGN_STATUS_OPTIONS,
  LOADED_TARGET_STATUS_OPTIONS,
  TRANSFER_DN_NONE,
  TRANSFER_DN_OPTIONS,
} from '../constants/campaignScenarioConstants';

type CampaignScenarioBasicInfoCreateFormValues = {
  campaignId?: string;
  scenarioName: string;
  callerNumber?: string;
  campaignCode?: string;
  transferDn: string;
  notificationCriteria: number;
  campaignStatus: string;
  targetStatus: string;
  priority: number;
  callMultiplier: number;
  inUse: boolean;
  fileIdentifier?: string;
};

const initialValues: Partial<CampaignScenarioBasicInfoCreateFormValues> = {
  transferDn: TRANSFER_DN_NONE,
  notificationCriteria: 95,
  campaignStatus: '대기중',
  targetStatus: '제외대상',
  priority: 50,
  callMultiplier: 1,
  inUse: true,
};

export default function CampaignScenarioBasicInfoCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm<CampaignScenarioBasicInfoCreateFormValues>();
  const selectedCampaignId = Form.useWatch('campaignId', form);

  const campaignSelectOptions = useMemo(() => [] as { label: string; value: string }[], []);

  const onFinish: FormProps<CampaignScenarioBasicInfoCreateFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    toast.success('캠페인 시나리오가 저장되었습니다. (백엔드 연동 전)');
    navigate('../campaign-scenario');
  };

  const onFinishFailed: FormProps<CampaignScenarioBasicInfoCreateFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCancelBtn = () => {
    form.resetFields();
    navigate('../campaign-scenario');
  };

  return (
    <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignId" label="캠페인" required hasFeedback rules={[{ required: true, message: '캠페인을 선택해 주세요.' }]}>
            <Select options={campaignSelectOptions} placeholder="캠페인을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="캠페인ID" required>
            <Input disabled value={selectedCampaignId ?? ''} placeholder="자동생성" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item
            name="scenarioName"
            label="시나리오"
            required
            hasFeedback
            rules={[
              { required: true, message: '시나리오를 입력해 주세요.' },
              { whitespace: true, message: '시나리오를 입력해 주세요.' },
            ]}
          >
            <Input placeholder="필수입력" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="시나리오ID" required>
            <Input disabled placeholder="자동생성" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item label="발신번호">
            <div className="flex items-center gap-2">
              <Form.Item name="callerNumber" noStyle>
                <Input placeholder="발신번호를 입력하세요." className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">※ 발신번호 없는 경우 사용</span>
            </div>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="캠페인코드">
            <div className="flex items-center gap-2">
              <Form.Item name="campaignCode" noStyle>
                <Input placeholder="캠페인코드를 입력하세요." className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">※ 중복 불가</span>
            </div>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="transferDn" label="호전환DN">
            <Select options={[...TRANSFER_DN_OPTIONS]} placeholder="호전환DN을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="알림기준">
            <div className="flex items-center gap-2">
              <Form.Item name="notificationCriteria" noStyle>
                <InputNumber min={0} max={100} className="w-full" placeholder="알림기준" />
              </Form.Item>
              <span className="shrink-0 text-sm text-[#495057]">% (이상 진행시)</span>
            </div>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignStatus" label="적재후캠페인">
            <Select options={[...LOADED_CAMPAIGN_STATUS_OPTIONS]} placeholder="적재후캠페인을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="targetStatus" label="적재시대상자상태">
            <Select options={[...LOADED_TARGET_STATUS_OPTIONS]} placeholder="적재시대상자상태를 선택하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="priority" label="우선순위">
            <InputNumber min={1} max={999} className="w-full" placeholder="우선순위" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="콜배수">
            <div className="flex items-center gap-2">
              <Form.Item name="callMultiplier" noStyle>
                <Select options={[...CALL_MULTIPLIER_OPTIONS]} placeholder="콜배수를 선택하세요." className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-sm text-[#495057]">(배수)</span>
            </div>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={24}>
          <Form.Item label="파일위치">
            <Input disabled value={DEFAULT_SCENARIO_FILE_LOCATION} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="inUse" label="사용여부" valuePropName="checked">
            <Switch checkedChildren="예" unCheckedChildren="아니오" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="파일식별자">
            <div className="flex items-center gap-2">
              <Form.Item name="fileIdentifier" noStyle>
                <Input placeholder="공백시 자동생성" className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">(파일 프리픽스를 입력하세요)</span>
            </div>
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
          <Button variant="solid" onClick={handleClickCancelBtn}>
            취소
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
