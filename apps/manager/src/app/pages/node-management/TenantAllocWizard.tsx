import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Divider, Form, type FormProps, Input, InputNumber, Radio, Row, Select, Steps } from 'antd';
import { Check, X } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetNode } from '../../features/node-management/hooks/useNodeQueries';
import { tenantAllocQueryKeys, useCreateTenantAlloc, useGetTenantAllocDetail, useUpdateTenantAlloc } from '../../features/node-management/hooks/useTenantAllocQueries';
import { LICENSE_KIND_LABELS, type TenantAllocCreateData, type TenantAllocUpdateData, WORKTIME_OPT_LABELS } from '../../features/node-management/types';
import { useGetTenants } from '../../features/tenant-management/hooks/useTenantQueries';

const worktimeOptOptions = Object.entries(WORKTIME_OPT_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

const formatNumber = (value: number | null | undefined): string => {
  if (value == null || value === 0) return '0';
  return value.toLocaleString();
};

export default function TenantAllocWizard() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { nodeId, tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form] = Form.useForm();

  const isEditMode = tenantId !== 'new';
  // 드래그앤드롭으로 진입 시 tenantId가 쿼리파라미터로 전달됨
  const preselectedTenantId = searchParams.get('tenantId');
  const isTenantLocked = isEditMode || !!preselectedTenantId;
  const { data: node } = useGetNode({ params: { nodeId } });
  const { data: allTenants } = useGetTenants();

  const tenantOptions = (allTenants ?? []).map((t) => ({
    label: `${t.tenantName} (${t.tenantId})`,
    value: t.tenantId,
  }));
  const { data: existingAlloc } = useGetTenantAllocDetail({
    params: { nodeId, tenantId },
    queryOptions: { enabled: isEditMode },
  });

  const initialValues = {
    tenantId: isEditMode ? Number(tenantId) : preselectedTenantId ? Number(preselectedTenantId) : undefined,
    autoObYn: 0,
    validExtDigits: 7,
    extPrefix: '',
    acwDuration: 0,
    redirectTelno: '',
    ieWorktimeId: 0,
    worktimeOpt: 1,
    transNum: '',
    mentOutofwork: '',
    initMentfile: '',
    ringbackTone: '',
    musicOnHold: '',
    ctiRoutePolicy: '',
    inviteMd5Auth: 0,
    unregInviteNoresp: 1,
    deviceUaCheck: 0,
    regFailChkCnt: 0,
    regFailBlockMin: 0,
    callChkParam1: 0,
    callChkParam2: 0,
    callChkParam3: 1,
    callChkParam4: 0,
    lic10: 0,
    lic11: 0,
    lic12: 0,
    lic15: 0,
    lic16: 0,
    lic20: 0,
    lic40: 0,
    lic50: 0,
  };

  const formValues = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFieldErrors({}))
      .catch((errorInfo) => {
        const errors: Record<string, string[]> = {};
        errorInfo.errorFields?.forEach((field: { name: string[]; errors: string[] }) => {
          const fieldName = field.name[0];
          errors[fieldName] = field.errors;
        });
        setFieldErrors(errors);
      });
  }, [formValues, form]);

  // 수정 모드 데이터 로드
  useEffect(() => {
    if (!existingAlloc) return;
    form.setFieldsValue({
      tenantId: existingAlloc.tenantId,
      autoObYn: existingAlloc.autoObYn ?? 0,
      validExtDigits: existingAlloc.validExtDigits ?? 7,
      extPrefix: existingAlloc.extPrefix,
      acwDuration: existingAlloc.acwDuration ?? 0,
      redirectTelno: existingAlloc.redirectTelno,
      ieWorktimeId: existingAlloc.ieWorktimeId ?? 0,
      worktimeOpt: existingAlloc.worktimeOpt ?? 1,
      transNum: existingAlloc.transNum,
      mentOutofwork: existingAlloc.mentOutofwork,
      // 라이선스
      lic10: existingAlloc.lic10 ?? 0,
      lic11: existingAlloc.lic11 ?? 0,
      lic12: existingAlloc.lic12 ?? 0,
      lic15: existingAlloc.lic15 ?? 0,
      lic16: existingAlloc.lic16 ?? 0,
      lic20: existingAlloc.lic20 ?? 0,
      lic40: existingAlloc.lic40 ?? 0,
      lic50: existingAlloc.lic50 ?? 0,
      // 초기설정
      initMentfile: existingAlloc.initMentfile,
      ringbackTone: existingAlloc.ringbackTone,
      musicOnHold: existingAlloc.musicOnHold,
      ctiRoutePolicy: existingAlloc.ctiRoutePolicy,
      // 보안설정
      inviteMd5Auth: existingAlloc.inviteMd5Auth ?? 0,
      unregInviteNoresp: existingAlloc.unregInviteNoresp ?? 1,
      deviceUaCheck: existingAlloc.deviceUaCheck ?? 0,
      regFailChkCnt: existingAlloc.regFailChkCnt ?? 0,
      regFailBlockMin: existingAlloc.regFailBlockMin ?? 0,
      callChkParam1: existingAlloc.callChkParam1 ?? 0,
      callChkParam2: existingAlloc.callChkParam2 ?? 0,
      callChkParam3: existingAlloc.callChkParam3 ?? 1,
      callChkParam4: existingAlloc.callChkParam4 ?? 0,
      // 감시설정
      unregCheck: existingAlloc.unregCheck ?? 0,
      unregSec: existingAlloc.unregSec ?? 0,
      unregNum: existingAlloc.unregNum ?? 0,
      forceUnregCheck: existingAlloc.forceUnregCheck ?? 0,
      forceUnregSec: existingAlloc.forceUnregSec ?? 0,
      forceUnregNum: existingAlloc.forceUnregNum ?? 0,
      longWaitCheck: existingAlloc.longWaitCheck ?? 0,
      longWaitSec: existingAlloc.longWaitSec ?? 0,
      ctiUnmoniCheck: existingAlloc.ctiUnmoniCheck ?? 0,
      ctiUnmoniSec: existingAlloc.ctiUnmoniSec ?? 0,
      ctiUnmoniNum: existingAlloc.ctiUnmoniNum ?? 0,
      ctiLogoutCheck: existingAlloc.ctiLogoutCheck ?? 0,
      ctiLogoutSec: existingAlloc.ctiLogoutSec ?? 0,
      ctiLogoutNum: existingAlloc.ctiLogoutNum ?? 0,
    });
  }, [existingAlloc, form]);

  const steps = [
    { title: '기본정보', requiredFieldNames: isEditMode ? ['validExtDigits', 'acwDuration'] : ['tenantId', 'validExtDigits', 'acwDuration'], content: renderStep1 },
    { title: '라이선스', requiredFieldNames: [] as string[], content: renderStep2 },
    { title: '초기설정', requiredFieldNames: [] as string[], content: renderStep3 },
    { title: '보안설정', requiredFieldNames: [] as string[], content: renderStep4 },
    { title: '감시설정', requiredFieldNames: [] as string[], content: renderStep5 },
  ];

  const { mutate: createAlloc, isPending: isCreating } = useCreateTenantAlloc({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트 할당이 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantAllocQueryKeys.getTenantAllocs({ nodeId }).queryKey });
        navigate(`../${nodeId}`);
      },
    },
  });

  const { mutate: updateAlloc, isPending: isUpdating } = useUpdateTenantAlloc({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트 할당이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantAllocQueryKeys.getTenantAllocs({ nodeId }).queryKey });
        navigate(`../${nodeId}`);
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const buildRequestData = (values: Record<string, unknown>) => {
    // 폼 필드명이 백엔드 DTO 필드명과 동일 (flat: lic10, lic11, ..., unregCheck, ...)
    return { ...values };
  };

  const handleSubmitBtn = () => form.submit();

  const onFinish: FormProps['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const reqData = buildRequestData(values);
    if (isEditMode) {
      updateAlloc({ nodeId: Number(nodeId), tenantId: Number(tenantId), data: reqData as unknown as TenantAllocUpdateData });
    } else {
      createAlloc({ nodeId: Number(nodeId), data: reqData as unknown as TenantAllocCreateData });
    }
  };

  const onFinishFailed: FormProps['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleNext = async () => {
    try {
      const fieldsToValidate = steps[currentStep].requiredFieldNames;
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      Log.warn(`Step ${currentStep + 1} validation failed`, error);
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  // Step 1: 기본정보
  function renderStep1() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트는 필수입니다.' }]}>
              <Select options={tenantOptions} disabled={isTenantLocked} showSearch optionFilterProp="label" placeholder="테넌트 선택" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="autoObYn" label="자동 아웃바운드">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="validExtDigits"
              label="내선 자릿수"
              required
              rules={[
                { required: true, message: '내선 자릿수는 필수입니다.' },
                { type: 'number', min: 1, message: '1 이상이어야 합니다.' },
                { type: 'number', max: 20, message: '20 이내여야 합니다.' },
              ]}
            >
              <InputNumber min={1} max={20} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="extPrefix" label="내선 Prefix" rules={[{ max: 10, message: '10자 이내여야 합니다.' }]}>
              <Input placeholder="Prefix" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="acwDuration"
              label="후처리시간 (초)"
              required
              rules={[
                { required: true, message: '후처리시간은 필수입니다.' },
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
              ]}
            >
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="redirectTelno" label="과금 DNIS" rules={[{ max: 24, message: '24자 이내여야 합니다.' }]}>
              <Input placeholder="과금 DNIS" maxLength={24} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="ieWorktimeId" label="업무시간 프로파일">
              <InputNumber min={0} className="!w-full" placeholder="0=미설정" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="worktimeOpt" label="업무시간 옵션">
              <Select options={worktimeOptOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="transNum" label="전환 DNIS" rules={[{ max: 24, message: '24자 이내여야 합니다.' }]}>
              <Input placeholder="전환 DNIS" maxLength={24} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="mentOutofwork" label="시간외 멘트">
              <Input placeholder="시간외 멘트 파일" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 2: 라이선스
  function renderStep2() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="lic10" label="국선 (트렁크)" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lic11" label="내선" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lic12" label="IE트렁크" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="lic15" label="DID" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lic16" label="DOD" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lic20" label="CTI" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="lic40" label="IVR" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="lic50" label="녹취" rules={[{ type: 'number', min: 0, message: '0 이상이어야 합니다.' }]}>
              <InputNumber min={0} max={999999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 3: 초기설정
  function renderStep3() {
    return (
      <>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item name="initMentfile" label="환영 멘트">
              <Input placeholder="멘트 파일명" />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name="ringbackTone" label="연결 멘트">
              <Input placeholder="멘트 파일명" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={9}>
            <Form.Item name="musicOnHold" label="보류 멘트">
              <Input placeholder="멘트 파일명" />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name="ctiRoutePolicy" label="CTI 라우팅 정책">
              <Input placeholder="라우팅 정책" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 4: 보안설정
  function renderStep4() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="inviteMd5Auth" label="SIP MD5 인증">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="unregInviteNoresp" label="미등록 INVITE 무응답">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="deviceUaCheck" label="UA 체크">
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="regFailChkCnt"
              label="등록실패 횟수"
              rules={[
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
                { type: 'number', max: 10, message: '10 이내여야 합니다.' },
              ]}
            >
              <InputNumber min={0} max={10} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="regFailBlockMin"
              label="등록실패 차단시간 (분)"
              rules={[
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
                { type: 'number', max: 99999, message: '99999 이내여야 합니다.' },
              ]}
            >
              <InputNumber min={0} max={99999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="callChkParam1" label="통화체크 파라미터 1">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="callChkParam2" label="통화체크 파라미터 2">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="callChkParam3" label="통화체크 파라미터 3">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="callChkParam4" label="통화체크 파라미터 4">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Step 5: 감시설정
  function renderStep5() {
    return (
      <>
        {/* 미등록 장비 */}
        <div className="text-sm font-semibold text-gray-600 mb-3">미등록 장비 감시</div>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name={['alarm', 'unregCheck']} label="체크" initialValue={0}>
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'unregSec']} label="임계값 (초)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'unregNum']} label="임계값 (건수)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        {/* 강제 해제 */}
        <div className="text-sm font-semibold text-gray-600 mb-3 mt-4">강제 해제 감시</div>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name={['alarm', 'forceUnregCheck']} label="체크" initialValue={0}>
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'forceUnregSec']} label="임계값 (초)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'forceUnregNum']} label="임계값 (건수)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        {/* 장기 대기 */}
        <div className="text-sm font-semibold text-gray-600 mb-3 mt-4">장기 대기 감시</div>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name={['alarm', 'longWaitCheck']} label="체크" initialValue={0}>
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'longWaitSec']} label="임계값 (초)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        {/* CTI 미모니터링 */}
        <div className="text-sm font-semibold text-gray-600 mb-3 mt-4">CTI 미모니터링 감시</div>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiUnmoniCheck']} label="체크" initialValue={0}>
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiUnmoniSec']} label="임계값 (초)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiUnmoniNum']} label="임계값 (건수)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
        {/* CTI 로그아웃 */}
        <div className="text-sm font-semibold text-gray-600 mb-3 mt-4">CTI 로그아웃 감시</div>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiLogoutCheck']} label="체크" initialValue={0}>
              <Radio.Group>
                <Radio value={1}>사용</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiLogoutSec']} label="임계값 (초)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['alarm', 'ctiLogoutNum']} label="임계값 (건수)" initialValue={0}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // Validation 아이콘
  const renderValidationIcon = (fieldName: string) => {
    const hasError = fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
    return hasError ? <X className="w-4 h-4 text-red-500 ml-2 shrink-0" /> : <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" />;
  };

  // 우측 요약 패널
  function renderFormSummary() {
    const values = formValues ?? initialValues;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">기본정보</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">테넌트 ID</span>
            <span className="text-gray-800 flex-1">{displayValue(values.tenantId)}</span>
            {renderValidationIcon('tenantId')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">내선 자릿수</span>
            <span className="text-gray-800 flex-1">{displayValue(values.validExtDigits)}</span>
            {renderValidationIcon('validExtDigits')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-24 shrink-0">후처리시간</span>
            <span className="text-gray-800 flex-1">{values.acwDuration != null ? `${values.acwDuration}초` : '-'}</span>
          </div>
        </div>
        {currentStep >= 1 && (
          <>
            <Divider className="!my-3" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">라이선스</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-24 shrink-0">국선</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.lic10)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-24 shrink-0">내선</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.lic11)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-24 shrink-0">CTI</span>
                <span className="text-gray-800 flex-1">{formatNumber(values.lic20)}</span>
              </div>
            </div>
          </>
        )}
        {currentStep >= 3 && (
          <>
            <Divider className="!my-3" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#adb5bd] uppercase tracking-wider mb-1">보안설정</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-24 shrink-0">MD5 인증</span>
                <span className="text-gray-800 flex-1">{values.inviteMd5Auth === 1 ? '사용' : '미사용'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Footer
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate(`../${nodeId}`)}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={handlePrev}>
              이전
            </Button>
          </Col>
        )}
        {currentStep < steps.length - 1 && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === steps.length - 1 && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmitBtn} loading={isPending}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '시스템' },
    { title: '자원관리' },
    { title: '클러스터 관리', href: '../list' },
    { title: node?.nodeName ?? '-' },
    { title: isEditMode ? '테넌트 할당 수정' : '테넌트 할당' },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
          items={steps.map((step) => ({ title: step.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${steps.length * 200}px` }}
          responsive={false}
        />
      </div>

      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
              {steps.map((step, index) => (
                <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
                  {step.content()}
                </div>
              ))}
            </Form>
          </div>
          <div className="w-full px-7 pb-7">{renderFooter()}</div>
        </div>
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
