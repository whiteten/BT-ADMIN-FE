import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { MOCK_CAMPAIGN_LIST } from '../constants/campaignManagementMockData';
import { CALL_MULTIPLIER_OPTIONS, LOADED_CAMPAIGN_STATUS_OPTIONS, LOADED_TARGET_STATUS_OPTIONS, TRANSFER_DN_OPTIONS } from '../constants/campaignScenarioConstants';
import { getMockCampaignScenarioDetail } from '../constants/campaignScenarioMockData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type CampaignScenarioBasicInfoFormValues = {
  campaignId: string;
  scenarioName: string;
  callerNumber: string;
  campaignCode: string;
  transferDn: string;
  notificationCriteria: number;
  campaignStatus: string;
  targetStatus: string;
  priority: number;
  callMultiplier: number;
  inUse: boolean;
  fileIdentifier: string;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

export default function CampaignScenarioBasicInfo() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<CampaignScenarioBasicInfoFormValues>();
  const scenario = scenarioId ? getMockCampaignScenarioDetail(scenarioId) : undefined;
  const selectedCampaignId = Form.useWatch('campaignId', form);

  const campaignSelectOptions = useMemo(() => MOCK_CAMPAIGN_LIST.map((campaign) => ({ label: campaign.campaignName, value: campaign.campaignId })), []);

  const onFinish: FormProps<CampaignScenarioBasicInfoFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    toast.success('캠페인 시나리오 정보가 저장되었습니다. (백엔드 연동 전)');
  };

  const onFinishFailed: FormProps<CampaignScenarioBasicInfoFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => {
        toast.success('캠페인 시나리오가 삭제되었습니다. (백엔드 연동 전)');
        navigate('../campaign-scenario');
      },
    });
  };

  const handleClickCancelBtn = () => {
    navigate('../campaign-scenario');
  };

  useEffect(() => {
    if (!scenario) return;

    form.setFieldsValue({
      campaignId: scenario.campaignId,
      scenarioName: scenario.scenarioName,
      callerNumber: scenario.callerNumber,
      campaignCode: scenario.campaignCode,
      transferDn: scenario.transferDn,
      notificationCriteria: scenario.notificationCriteria,
      campaignStatus: scenario.campaignStatus,
      targetStatus: scenario.targetStatus,
      priority: scenario.priority,
      callMultiplier: scenario.callMultiplier,
      inUse: scenario.inUse,
      fileIdentifier: scenario.fileIdentifier,
    });
  }, [scenario, form]);

  if (!scenario) {
    return <div className="p-7 text-gray-500">캠페인 시나리오 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="campaignId" label="캠페인" required hasFeedback rules={[{ required: true, message: '캠페인을 선택해 주세요.' }]}>
            <Select options={campaignSelectOptions} placeholder="캠페인을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="캠페인ID" required>
            <Input disabled value={selectedCampaignId ?? scenario.campaignId} />
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
            <Input placeholder="시나리오를 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="시나리오ID" required>
            <Input disabled value={scenario.scenarioId} />
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
            <Input disabled value={scenario.fileLocation} />
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
          <Form.Item label="파일식별자" required>
            <div className="flex items-center gap-2">
              <Form.Item
                name="fileIdentifier"
                noStyle
                hasFeedback
                rules={[
                  { required: true, message: '파일식별자를 입력해 주세요.' },
                  { whitespace: true, message: '파일식별자를 입력해 주세요.' },
                ]}
              >
                <Input placeholder="파일 프리픽스를 입력하세요." className="flex-1" />
              </Form.Item>
              <span className="shrink-0 text-xs text-[#868e96]">(파일 프리픽스를 입력하세요)</span>
            </div>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item label="작업자">
            <Input disabled value={scenario.worker} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="작업일시">
            <Input disabled value={formatDateTime(scenario.workDateTime)} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button variant="solid" onClick={handleClickCancelBtn}>
            취소
          </Button>
        </Col>
        <Col>
          <Button color="primary" variant="solid" htmlType="submit">
            저장
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
