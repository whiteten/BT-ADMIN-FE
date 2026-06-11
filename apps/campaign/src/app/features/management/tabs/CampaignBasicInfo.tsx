import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, DatePicker, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { CAMPAIGN_IN_USE_OPTIONS, CAMPAIGN_SERVICE_TYPE_OPTIONS } from '../constants/campaignManagementConstants';
import { getMockCampaignDetail } from '../constants/campaignManagementMockData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type CampaignBasicInfoFormValues = {
  campaignName: string;
  executionPeriod: [Dayjs, Dayjs];
  sortOrder: number;
  priority: number;
  serviceType: string;
  inUse: boolean;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

export default function CampaignBasicInfo() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<CampaignBasicInfoFormValues>();
  const campaign = campaignId ? getMockCampaignDetail(campaignId) : undefined;

  const onFinish: FormProps<CampaignBasicInfoFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    toast.success('캠페인 기본 정보가 저장되었습니다. (백엔드 연동 전)');
  };

  const onFinishFailed: FormProps<CampaignBasicInfoFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => {
        toast.success('캠페인이 삭제되었습니다. (백엔드 연동 전)');
        navigate('../list');
      },
    });
  };

  const handleClickCancelBtn = () => {
    navigate('../list');
  };

  useEffect(() => {
    if (!campaign) return;
    form.setFieldsValue({
      campaignName: campaign.campaignName,
      executionPeriod: [dayjs(campaign.startDateTime), dayjs(campaign.endDateTime)],
      sortOrder: campaign.sortOrder,
      priority: campaign.priority,
      serviceType: campaign.serviceType,
      inUse: campaign.inUse,
    });
  }, [campaign, form]);

  if (!campaign) {
    return <div className="p-7 text-gray-500">캠페인 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={9}>
          <Form.Item
            name="campaignName"
            label="캠페인"
            required
            hasFeedback
            rules={[
              { required: true, message: '캠페인 이름을 입력해 주세요.' },
              { whitespace: true, message: '캠페인 이름을 입력해 주세요.' },
            ]}
          >
            <Input placeholder="캠페인 이름을 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="캠페인ID" required>
            <Input disabled value={campaign.campaignId} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="executionPeriod" label="실행기간">
            <DatePicker.RangePicker showTime className="w-full" format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={4}>
          <Form.Item name="sortOrder" label="정렬순서">
            <InputNumber min={1} className="w-full" placeholder="정렬순서" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="priority" label="우선순위">
            <InputNumber min={1} className="w-full" placeholder="우선순위" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="serviceType" label="서비스구분">
            <Select options={[...CAMPAIGN_SERVICE_TYPE_OPTIONS]} allowClear placeholder="서비스구분을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="inUse" label="사용여부">
            <Select options={[...CAMPAIGN_IN_USE_OPTIONS]} placeholder="사용여부를 선택하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item label="작업자">
            <Input disabled value={campaign.worker} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="작업일시">
            <Input disabled value={formatDateTime(campaign.workDateTime)} />
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
          <Button color="red" variant="solid" onClick={handleClickDeleteBtn}>
            삭제
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
