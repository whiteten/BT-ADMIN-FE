import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, InputNumber, Radio, Row, Select, Slider, Steps } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetClusterGroups } from '../hooks/useClusterGroupQueries';
import { nodeQueryKeys, useGetNode, useGetNodes, useUpdateNode } from '../hooks/useNodeQueries';
import { MCS_ROUTE_METHOD_LABELS, NAT_OPTION_LABELS, type NodeUpdateData } from '../types/node.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';

const natOptions = Object.entries(NAT_OPTION_LABELS).map(([value, label]) => ({ label, value: Number(value) }));
const enatOptions = [
  { label: '옵션1', value: 1 },
  { label: '옵션2', value: 2 },
  { label: '옵션3', value: 3 },
  { label: '옵션4', value: 4 },
];
const routeMethodOptions = Object.entries(MCS_ROUTE_METHOD_LABELS).map(([value, label]) => ({ label, value: Number(value) }));

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

export default function NodeSettingPage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm();

  const { data: node, isFetching } = useGetNode({ params: { nodeId } });
  const { data: clusterGroups } = useGetClusterGroups();
  const { data: nodeList } = useGetNodes();

  const clusterGroupOptions = (clusterGroups ?? []).map((g) => ({ label: g.clusterGrpName, value: g.clusterGrpId }));
  const backupNodeOptions = (nodeList ?? []).filter((n) => n.nodeId !== Number(nodeId)).map((n) => ({ label: `${n.nodeName} (ID:${n.nodeId})`, value: n.nodeId }));

  const formValues = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFieldErrors({}))
      .catch((errorInfo) => {
        const errors: Record<string, string[]> = {};
        errorInfo.errorFields?.forEach((field: { name: string[]; errors: string[] }) => {
          errors[field.name[0]] = field.errors;
        });
        setFieldErrors(errors);
      });
  }, [formValues, form]);

  const { mutate: updateNode, isPending: isUpdating } = useUpdateNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNode({ nodeId }).queryKey });
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
        navigate(`../${nodeId}`);
      },
    },
  });

  useEffect(() => {
    if (!node) return;
    form.setFieldsValue({
      nodeName: node.nodeName,
      nodeAlias: node.nodeAlias,
      regionNum: node.regionNum,
      clusterGrpId: node.clusterGrpId,
      mainJob: node.mainJob,
      natOption: node.natOption ?? 0,
      msGroupId: node.msGroupId,
      externalIpAddr: node.externalIpAddr,
      enatOption: node.enatOption ?? 1,
      mcsBkNodeId: node.mcsBkNodeId,
      mcsBkGsaIpv4Address: node.mcsBkGsaIpv4Address,
      mcsBkGsbIpv4Address: node.mcsBkGsbIpv4Address,
      mcsBkRouteMethod: node.mcsBkRouteMethod ?? 0,
      mcsBkRouteRatio: node.mcsBkRouteRatio ?? 50,
      mcsIcdownUseYn: node.mcsIcdownUseYn ?? 0,
      mcsIedownUseYn: node.mcsIedownUseYn ?? 0,
    });
  }, [node, form]);

  const steps = [
    { title: '기본정보', requiredFieldNames: ['nodeName', 'nodeAlias'], content: renderStep1 },
    { title: '중개 NAT', requiredFieldNames: [] as string[], content: renderStep2 },
    { title: 'MCS 설정', requiredFieldNames: [] as string[], content: renderStep3 },
  ];

  const onFinish: FormProps<NodeUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateNode({ id: Number(nodeId), data: values });
  };

  const onFinishFailed: FormProps<NodeUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleNext = async () => {
    try {
      const fieldsToValidate = steps[currentStep].requiredFieldNames;
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch {
      // validation failed
    }
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const handleSubmitBtn = () => form.submit();

  const isPending = isUpdating;
  const isLastStep = currentStep === steps.length - 1;

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '시스템' },
    { title: '자원관리' },
    { title: '클러스터 관리', href: '../list' },
    { title: node?.nodeName ?? '-', href: `../${nodeId}` },
    { title: '노드 설정' },
  ];

  // ─── Step 1: 기본정보 ─────────────────────────────
  function renderStep1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={3}>
            <Form.Item label="노드 ID">
              <InputNumber disabled value={Number(nodeId)} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="nodeName"
              label="노드명"
              required
              hasFeedback
              rules={[
                { required: true, message: '노드명은 필수입니다.' },
                { max: 200, message: '200자 이내' },
              ]}
            >
              <Input placeholder="노드명" maxLength={200} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="nodeAlias"
              label="노드 약칭"
              required
              hasFeedback
              rules={[
                { required: true, message: '약칭은 필수입니다.' },
                { max: 60, message: '60자 이내' },
              ]}
            >
              <Input placeholder="약칭" maxLength={60} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="regionNum"
              label="지역번호"
              rules={[
                { max: 64, message: '64자 이내' },
                { pattern: /^[0-9]*$/, message: '숫자만' },
              ]}
            >
              <Input placeholder="02" maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="clusterGrpId" label="클러스터 그룹" required rules={[{ required: true, message: '클러스터 그룹은 필수입니다.' }]}>
              <Select options={clusterGroupOptions} placeholder="클러스터 그룹 선택" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="mainJob" label="주요 업무" rules={[{ max: 512, message: '512자 이내' }]}>
              <Input.TextArea placeholder="주요 업무" maxLength={512} rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // ─── Step 2: 중개 NAT ─────────────────────────────
  function renderStep2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="natOption" label="RTP 중개">
              <Select options={natOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="enatOption" label="확장 NAT 옵션">
              <Select options={enatOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="externalIpAddr" label="외부 IP" rules={[{ max: 400, message: '400자 이내' }]}>
              <Input placeholder="외부 IP 주소" maxLength={400} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // ─── Step 3: MCS 설정 ─────────────────────────────
  function renderStep3() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="mcsBkNodeId" label="백업 MCS 노드">
              <Select options={backupNodeOptions} allowClear placeholder="미지정" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="mcsBkGsaIpv4Address" label="A Side IP" rules={[{ max: 40, message: '40자 이내' }]}>
              <Input placeholder="0.0.0.0" maxLength={40} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="mcsBkGsbIpv4Address" label="B Side IP" rules={[{ max: 40, message: '40자 이내' }]}>
              <Input placeholder="0.0.0.0" maxLength={40} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="mcsBkRouteMethod" label="분배방식">
              <Select options={routeMethodOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="mcsBkRouteRatio" label="비율 (%)">
              <Slider min={0} max={100} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="mcsIcdownUseYn" label="IC 우회">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="mcsIedownUseYn" label="IE 우회">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // ─── 확인 (최종 스텝 요약) ─────────────────────────
  function renderConfirm() {
    const v = form.getFieldsValue(true);
    const clusterName = clusterGroupOptions.find((g) => g.value === v.clusterGrpId)?.label ?? '-';
    const backupNodeName = backupNodeOptions.find((n) => n.value === v.mcsBkNodeId)?.label ?? '-';

    return (
      <div className="space-y-4">
        <Divider orientation={'left' as any}>기본정보</Divider>
        <Row gutter={[16, 8]}>
          <Col span={4} className="text-gray-500">
            노드 ID
          </Col>
          <Col span={8}>{nodeId}</Col>
          <Col span={4} className="text-gray-500">
            노드명
          </Col>
          <Col span={8}>{displayValue(v.nodeName)}</Col>
          <Col span={4} className="text-gray-500">
            약칭
          </Col>
          <Col span={8}>{displayValue(v.nodeAlias)}</Col>
          <Col span={4} className="text-gray-500">
            지역번호
          </Col>
          <Col span={8}>{displayValue(v.regionNum)}</Col>
          <Col span={4} className="text-gray-500">
            클러스터
          </Col>
          <Col span={8}>{clusterName}</Col>
        </Row>
        <Divider orientation={'left' as any}>중개 NAT</Divider>
        <Row gutter={[16, 8]}>
          <Col span={4} className="text-gray-500">
            RTP 중개
          </Col>
          <Col span={8}>{NAT_OPTION_LABELS[v.natOption ?? 0]}</Col>
          <Col span={4} className="text-gray-500">
            확장 NAT
          </Col>
          <Col span={8}>{displayValue(v.enatOption)}</Col>
          <Col span={4} className="text-gray-500">
            외부 IP
          </Col>
          <Col span={8}>{displayValue(v.externalIpAddr)}</Col>
        </Row>
        <Divider orientation={'left' as any}>MCS 설정</Divider>
        <Row gutter={[16, 8]}>
          <Col span={4} className="text-gray-500">
            백업 MCS
          </Col>
          <Col span={8}>{v.mcsBkNodeId ? backupNodeName : '-'}</Col>
          <Col span={4} className="text-gray-500">
            A Side IP
          </Col>
          <Col span={8}>{displayValue(v.mcsBkGsaIpv4Address)}</Col>
          <Col span={4} className="text-gray-500">
            B Side IP
          </Col>
          <Col span={8}>{displayValue(v.mcsBkGsbIpv4Address)}</Col>
          <Col span={4} className="text-gray-500">
            분배방식
          </Col>
          <Col span={8}>{MCS_ROUTE_METHOD_LABELS[v.mcsBkRouteMethod ?? 0]}</Col>
          <Col span={4} className="text-gray-500">
            비율
          </Col>
          <Col span={8}>{v.mcsBkRouteRatio ?? 50}%</Col>
          <Col span={4} className="text-gray-500">
            IC 우회
          </Col>
          <Col span={8}>{v.mcsIcdownUseYn === 1 ? '사용' : '미사용'}</Col>
          <Col span={4} className="text-gray-500">
            IE 우회
          </Col>
          <Col span={8}>{v.mcsIedownUseYn === 1 ? '사용' : '미사용'}</Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
        {isFetching ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <>
            {/* Steps 헤더 */}
            <div className="px-7 pt-6 pb-2">
              <Steps current={currentStep} size="small" items={steps.map((s) => ({ title: s.title }))} />
            </div>

            {/* 폼 영역 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-7 pb-0">
              <Form form={form} initialValues={{}} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
                <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>{renderStep1()}</div>
                <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>{renderStep2()}</div>
                <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>{renderStep3()}</div>
              </Form>
              {isLastStep && renderConfirm()}
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-center gap-3 px-7 py-5 border-t border-gray-100">
              <Button variant="solid" onClick={() => navigate(`../${nodeId}`)}>
                취소
              </Button>
              {currentStep > 0 && <Button onClick={handlePrev}>이전</Button>}
              {!isLastStep && (
                <Button color="primary" variant="solid" onClick={handleNext}>
                  다음
                </Button>
              )}
              {isLastStep && (
                <Button color="primary" variant="solid" onClick={handleSubmitBtn} loading={isPending}>
                  확인
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
