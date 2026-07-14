import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, DatePicker, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { CAMPAIGN_IN_USE_OPTIONS, CAMPAIGN_SERVICE_TYPE_OPTIONS } from '../constants/campaignManagementConstants';
import { useCampaignMasterDetailParams } from '../hooks/useCampaignMasterDetailParams';
import { useGetCampaignMasterDetail } from '../hooks/useCampaignQueries';
import { toCampaignItem, toCampaignMasterFormDateTime } from '../utils/campaignMasterUtils';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
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
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<CampaignBasicInfoFormValues>();
  const detailParams = useCampaignMasterDetailParams();

  const { data: campaignMaster, isFetching } = useGetCampaignMasterDetail({
    params: detailParams,
    queryOptions: { enabled: Boolean(detailParams?.campaignId) },
  });

  const campaign = useMemo(() => (campaignMaster ? toCampaignItem(campaignMaster) : undefined), [campaignMaster]);

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
        navigate('../basic-info');
      },
    });
  };

  const handleClickCancelBtn = () => {
    navigate('../basic-info');
  };

  useEffect(() => {
    if (!campaignMaster || !campaign) return;

    const startDateTime = toCampaignMasterFormDateTime(campaignMaster.campaignStartdate, campaignMaster.campaignStarttime);
    const endDateTime = toCampaignMasterFormDateTime(campaignMaster.campaignEnddate, campaignMaster.campaignEndtime);
    const start = startDateTime ? dayjs(startDateTime) : null;
    const end = endDateTime ? dayjs(endDateTime) : null;

    form.setFieldsValue({
      campaignName: campaign.campaignName,
      ...(start?.isValid() && end?.isValid() ? { executionPeriod: [start, end] } : {}),
      sortOrder: campaignMaster.sortSeq ?? undefined,
      priority: campaignMaster.priority ?? undefined,
      serviceType: campaign.serviceType || undefined,
      inUse: campaign.inUse,
    });
  }, [campaign, campaignMaster, form]);

  if (isFetching) {
    return <FallbackSpinner />;
  }

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
