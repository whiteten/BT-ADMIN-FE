/**
 * COS 설정 등록/수정 -- Steps form page
 * Step 1: 기본 정보 (테넌트, COS 이름) — COS ID는 자동 채번 (FN_NEWID_IE)
 * Step 2: 그룹IPT 서비스 (발신/착신 부가서비스)
 * Step 3: 개인IPT 서비스 (발신/착신/기타 부가서비스)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, Input, Modal, Row, Select, Steps, Switch } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { cosApi } from '../../features/cos/api/cosApi';
import { cosQueryKeys, useCreateCos, useDeleteCos, useGetCosDetail, useGetDodLimits, useGetNodeTenants, useUpdateCos } from '../../features/cos/hooks/useCosQueries';
import {
  COS_INITIAL_VALUES,
  type CosCreateRequest,
  type CosUpdateRequest,
  GROUP_IPT_INBOUND_FLAGS,
  GROUP_IPT_OUTBOUND_FLAGS,
  PERSONAL_IPT_ETC_FLAGS,
  PERSONAL_IPT_INBOUND_FLAGS,
  PERSONAL_IPT_OUTBOUND_FLAGS,
  type ServiceFlag,
} from '../../features/cos/types';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../features/did-trans/components/NumPatternDrawer';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const COS_FORM_STEPS = [{ title: '기본 정보' }, { title: '그룹IPT 서비스' }, { title: '개인IPT 서비스' }];

/**
 * 번호패턴 형식 유효성 검증 (AS-IS: SwatPattern.testPattern)
 * 허용 문자: 숫자(0-9), X, Z, N, !, ., [d-d], [d], [d,d,...], |, ()
 * 패턴을 | 로 분리하여 각 파트 검증
 */
function testSwatPattern(patterns: string): boolean {
  if (!patterns) return true;
  const patternList = patterns.toUpperCase().split('|');
  for (const pattern of patternList) {
    // 괄호 쌍 검증: () 있으면 ^( ) 형태여야 함
    if (/[()]/.test(pattern) && !/^\(.*\)$/.test(pattern)) {
      return false;
    }
    const trimPattern = pattern.replace(/[()]/g, '');
    try {
      const matched = trimPattern.match(/\[\d+-\d\]|X|Z|N|!|\.|\[\d+\](\d+)?|\[\d+(,\d+)*\](\d+)?|\d/g);
      if (!matched || matched.join('') !== trimPattern) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// SIP 프로파일 스타일 스위치 박스 (라벨 좌측 + Switch 우측, 회색 배경)
function SwitchBox({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border border-gray-100 bg-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <Form.Item
        name={name}
        valuePropName="checked"
        noStyle
        getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
        getValueProps={(value: number) => ({ checked: value === 1 })}
      >
        <Switch size="small" />
      </Form.Item>
    </div>
  );
}

export default function CosForm() {
  const navigate = useNavigate();
  const { cosId: cosIdParam } = useParams<{ cosId: string }>();
  const [searchParams] = useSearchParams();
  const defaultTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : undefined;
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const dodNumPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const callScreenNumDrawerRef = useRef<NumPatternDrawerRef>(null);

  const isEditMode = !!cosIdParam;
  const cosId = cosIdParam ? Number(cosIdParam) : undefined;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: cosDetail, isFetching } = useGetCosDetail(cosId);

  // Watch fields for conditional rendering and dynamic queries
  const watchedDodNumAllow = Form.useWatch('dodNumAllow', form);
  const watchedCallScreenSvc = Form.useWatch('callScreenSvc', form);
  const watchedTenantId = Form.useWatch('tenantId', form) as number | undefined;

  // 발신제한/허용그룹 목록 (테넌트별 TB_IE_DOD_LIMIT)
  // AS-IS: cbCreate('#poAddDodLimitSvc', 'dod_limit', 'tenantId='+tenantId)
  const { data: dodLimitOptions = [] } = useGetDodLimits(watchedTenantId ?? (isEditMode ? cosDetail?.tenantId : undefined));

  // dodLimitSvc 옵션: 미지정(0) + 테넌트별 목록
  const dodLimitSelectOptions = useMemo(() => [{ label: '미지정', value: 0 }, ...dodLimitOptions.map((d) => ({ label: d.name, value: d.id }))], [dodLimitOptions]);

  // 테넌트 Select 옵션 (중복 제거)
  const tenantOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) {
        map.set(nt.tenantId, nt.tenantName);
      }
    }
    return Array.from(map.entries())
      .map(([tenantId, tenantName]) => ({ label: tenantName, value: tenantId }))
      .sort((a, b) => a.value - b.value);
  }, [nodeTenants]);

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (cosDetail && isEditMode) {
      const vals: Partial<CosCreateRequest> = {
        cosName: cosDetail.cosName,
        tenantId: cosDetail.tenantId,
        dnTblSvc: cosDetail.dnTblSvc ?? 0,
        dnOblSvc: cosDetail.dnOblSvc ?? 0,
        dodLimitSvc: cosDetail.dodLimitSvc ?? 0,
        pickupSvc: cosDetail.pickupSvc ?? 0,
        coachingSvc: cosDetail.coachingSvc ?? 0,
        monitorSvc: cosDetail.monitorSvc ?? 0,
        ignoreBugsCoaching: cosDetail.ignoreBugsCoaching ?? 0,
        dodNumAllow: cosDetail.dodNumAllow ?? 0,
        dodNumPattern: cosDetail.dodNumPattern ?? '',
        callScreenSvc: cosDetail.callScreenSvc ?? 0,
        callScreenNum: cosDetail.callScreenNum ?? '',
        shortDialSvc: cosDetail.shortDialSvc ?? 0,
        callReserveSvc: cosDetail.callReserveSvc ?? 0,
        autoReturnSvc: cosDetail.autoReturnSvc ?? 0,
        intercomOrigSvc: cosDetail.intercomOrigSvc ?? 0,
        unknownDeny: cosDetail.unknownDeny ?? 0,
        dodNameSvc: cosDetail.dodNameSvc ?? 0,
        transSvc: cosDetail.transSvc ?? 0,
        denySvc: cosDetail.denySvc ?? 0,
        busyWaitSvc: cosDetail.busyWaitSvc ?? 0,
        absenceSvc: cosDetail.absenceSvc ?? 0,
        moveAnsSvc: cosDetail.moveAnsSvc ?? 0,
        mvaSvc: cosDetail.mvaSvc ?? 0,
        cidDenySvc: cosDetail.cidDenySvc ?? 0,
        callAvoidSvc: cosDetail.callAvoidSvc ?? 0,
        autoanswerSvc: cosDetail.autoanswerSvc ?? 0,
        intercomTermSvc: cosDetail.intercomTermSvc ?? 0,
        didReleaseTone: cosDetail.didReleaseTone ?? 0,
        trnsOkTone: cosDetail.trnsOkTone ?? 0,
        silentTermSvc: cosDetail.silentTermSvc ?? 0,
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [cosDetail, isEditMode, form]);

  // ─── Set default tenantId ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode && defaultTenantId) {
      form.setFieldsValue({ tenantId: defaultTenantId });
    }
  }, [isEditMode, defaultTenantId, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createCos, isPending: isCreating } = useCreateCos({
    mutationOptions: {
      onSuccess: () => {
        toast.success('COS가 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: cosQueryKeys.getList._def });
        navigate('/ipron/cos');
      },
    },
  });

  const { mutate: updateCos, isPending: isUpdating } = useUpdateCos({
    mutationOptions: {
      onSuccess: () => {
        toast.success('COS가 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: cosQueryKeys.getList._def });
        navigate('/ipron/cos');
      },
    },
  });

  const { mutate: deleteCos } = useDeleteCos({
    mutationOptions: {
      onSuccess: () => {
        toast.success('COS가 삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: cosQueryKeys.getList._def });
        navigate('/ipron/cos');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const steps = COS_FORM_STEPS.map((s) => ({ title: s.title }));
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    try {
      await form.validateFields(['tenantId', 'cosName']);
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch {
      /* validation failed */
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Step2 비즈니스 검증
      if (values.dodNumAllow === 1 && !values.dodNumPattern?.trim()) {
        toast.error('특정번호 발신허용 설정 시 패턴은 필수입니다');
        return;
      }
      if (values.callScreenSvc === 1 && !values.callScreenNum?.trim()) {
        toast.error('특정번호 착신금지 설정 시 패턴은 필수입니다');
        return;
      }

      const payload: CosCreateRequest = {
        cosName: values.cosName,
        tenantId: values.tenantId,
        dnTblSvc: values.dnTblSvc ?? 0,
        dnOblSvc: values.dnOblSvc ?? 0,
        dodLimitSvc: values.dodLimitSvc ?? 0,
        pickupSvc: values.pickupSvc ?? 0,
        coachingSvc: values.coachingSvc ?? 0,
        monitorSvc: values.monitorSvc ?? 0,
        ignoreBugsCoaching: values.ignoreBugsCoaching ?? 0,
        dodNumAllow: values.dodNumAllow ?? 0,
        dodNumPattern: values.dodNumPattern || null,
        callScreenSvc: values.callScreenSvc ?? 0,
        callScreenNum: values.callScreenNum || null,
        shortDialSvc: values.shortDialSvc ?? 0,
        callReserveSvc: values.callReserveSvc ?? 0,
        autoReturnSvc: values.autoReturnSvc ?? 0,
        intercomOrigSvc: values.intercomOrigSvc ?? 0,
        unknownDeny: values.unknownDeny ?? 0,
        dodNameSvc: values.dodNameSvc ?? 0,
        transSvc: values.transSvc ?? 0,
        denySvc: values.denySvc ?? 0,
        busyWaitSvc: values.busyWaitSvc ?? 0,
        absenceSvc: values.absenceSvc ?? 0,
        moveAnsSvc: values.moveAnsSvc ?? 0,
        mvaSvc: values.mvaSvc ?? 0,
        cidDenySvc: values.cidDenySvc ?? 0,
        callAvoidSvc: values.callAvoidSvc ?? 0,
        autoanswerSvc: values.autoanswerSvc ?? 0,
        intercomTermSvc: values.intercomTermSvc ?? 0,
        didReleaseTone: values.didReleaseTone ?? 0,
        trnsOkTone: values.trnsOkTone ?? 0,
        silentTermSvc: values.silentTermSvc ?? 0,
      };

      if (isEditMode && cosId) {
        const { tenantId: _tid, ...updateData } = payload;
        updateCos({ cosId, data: updateData as CosUpdateRequest });
      } else {
        createCos(payload);
      }
    } catch {
      setCurrentStep(0);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cosId || !cosDetail) return;

    // 기본 COS 삭제 불가
    if (cosDetail.tenantId === cosDetail.cosId) {
      Modal.warning({
        title: '삭제 불가',
        content: '기본 COS로 등록된 항목은 삭제할 수 없습니다.',
      });
      return;
    }

    // 참조 DN 수 확인
    try {
      const refCount = await cosApi.getRefCount(cosId);
      if (refCount > 0) {
        Modal.warning({
          title: '삭제 불가',
          content: `선택한 COS 설정을 사용하는 DN이 ${refCount}개가 있습니다. 삭제할 수 없습니다.`,
        });
        return;
      }
    } catch {
      toast.error('참조 DN 수 조회에 실패하였습니다');
      return;
    }

    modal.confirm.execute({
      onOk: () => deleteCos({ cosId }),
      options: {
        title: 'COS 삭제',
        content: `"${cosDetail?.cosName}" COS를 삭제하시겠습니까?`,
      },
    });
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '번호자원관리' },
      { title: 'COS 설정', path: '/ipron/cos' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && cosIdParam ? `/ipron/cos/${cosIdParam}/edit` : '/ipron/cos/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, cosIdParam, setBreadcrumb, clearBreadcrumb]);

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  // ─── 서비스 플래그 요약 행 헬퍼 ─────────────────────────────────────────────
  const renderFlagSummaryList = (flags: ServiceFlag[]) => {
    const values = formValues ?? COS_INITIAL_VALUES;
    return flags.map((flag) => {
      const isOn = values[flag.field] === 1;
      return <SummaryRow key={flag.field} label={flag.label} value={<span className={isOn ? 'text-blue-600 font-medium' : 'text-gray-400'}>{isOn ? '설정' : '해제'}</span>} />;
    });
  };

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = formValues ?? COS_INITIAL_VALUES;
    const tenantName = tenantOptions.find((t) => t.value === values.tenantId)?.label ?? '-';

    return (
      <div className="space-y-4 text-sm">
        {/* 1. 기본정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본 정보</div>
          <SummaryRow label="테넌트" value={displayValue(tenantName)} required />
          {isEditMode && cosDetail && <SummaryRow label="COS ID" value={displayValue(cosDetail.cosId)} />}
          <SummaryRow label="COS 이름" value={displayValue(values.cosName)} required />
          <SummaryRow
            label="발신제한/허용그룹"
            value={displayValue(values.dodLimitSvc === 0 ? '미지정' : (dodLimitSelectOptions.find((o) => o.value === values.dodLimitSvc)?.label ?? values.dodLimitSvc))}
          />
        </div>

        <Divider className="!my-3" />

        {/* 2. 그룹IPT 서비스 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. 그룹IPT 서비스</div>
          <div className="text-xs font-medium text-gray-500 mb-1">발신 부가서비스</div>
          {renderFlagSummaryList(GROUP_IPT_OUTBOUND_FLAGS)}
          <div className="text-xs font-medium text-gray-500 mt-2 mb-1">착신 부가서비스</div>
          {renderFlagSummaryList(GROUP_IPT_INBOUND_FLAGS)}
        </div>

        <Divider className="!my-3" />

        {/* 3. 개인IPT 서비스 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3. 개인IPT 서비스</div>
          <div className="text-xs font-medium text-gray-500 mb-1">발신 부가서비스</div>
          {renderFlagSummaryList(PERSONAL_IPT_OUTBOUND_FLAGS)}
          <div className="text-xs font-medium text-gray-500 mt-2 mb-1">착신 부가서비스</div>
          {renderFlagSummaryList(PERSONAL_IPT_INBOUND_FLAGS)}
          <div className="text-xs font-medium text-gray-500 mt-2 mb-1">기타</div>
          {renderFlagSummaryList(PERSONAL_IPT_ETC_FLAGS)}
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <div className="flex items-center justify-between">
        {/* 좌측: 위험 액션(삭제) 분리 */}
        <div>
          {isEditMode && (
            <Button variant="solid" color="danger" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          )}
        </div>
        {/* 우측: 네비게이션 + 저장 */}
        <div className="flex items-center gap-3">
          <Button variant="solid" onClick={() => navigate('/ipron/cos')}>
            취소
          </Button>
          {currentStep > 0 && (
            <Button variant="solid" onClick={() => setCurrentStep((prev) => prev - 1)}>
              이전
            </Button>
          )}
          {!isLastStep && (
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          )}
          {isLastStep && (
            <Button variant="solid" color="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Steps bar */}
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
          items={steps.map((s) => ({ title: s.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${steps.length * 250}px` }}
          responsive={false}
        />
      </div>

      {/* Main (left: form, right: summary) */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* Left form */}
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          {isFetching && isEditMode ? (
            <div className="flex items-center justify-center w-full h-full">
              <FallbackSpinner />
            </div>
          ) : (
            <>
              <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
                <Form form={form} initialValues={COS_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Step 1: 기본 정보 ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">기본 정보</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트는 필수입니다' }]}>
                          <Select options={tenantOptions} placeholder="테넌트를 선택하세요" disabled={isEditMode} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="cosName"
                          label="COS 이름"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: 'COS 이름은 필수입니다' },
                            { max: 100, message: '100자 이내여야 합니다' },
                          ]}
                        >
                          <Input placeholder="COS 이름" maxLength={100} />
                        </Form.Item>
                      </Col>
                    </Row>
                    {isEditMode && cosDetail && <div className="text-xs text-gray-400 mt-2">COS ID: {cosDetail.cosId}</div>}
                  </div>

                  {/* ── Step 2: 그룹IPT 서비스 ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    {/* 발신 부가서비스 */}
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">발신 부가서비스</h4>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 mb-3">
                      <SwitchBox name="dnOblSvc" label="발신금지설정" />
                      <SwitchBox name="coachingSvc" label="코칭사용설정" />
                      <SwitchBox name="monitorSvc" label="감청사용설정" />
                      <SwitchBox name="dodNumAllow" label="특정번호 발신허용" />
                    </div>
                    <Row gutter={[20, 0]}>
                      <Col span={12}>
                        <Form.Item className="!mb-3" name="dodLimitSvc" label="발신제한/허용그룹">
                          <Select options={dodLimitSelectOptions} placeholder="미지정" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          className="!mb-3"
                          name="dodNumPattern"
                          label="특정번호 발신허용패턴"
                          rules={[
                            { max: 256, message: '256자 이내여야 합니다' },
                            {
                              validator: (_, value) => {
                                if (!value?.trim()) return Promise.resolve();
                                if (!testSwatPattern(value.trim())) {
                                  return Promise.reject(new Error('특정번호 발신패턴 형식이 올바르지 않습니다'));
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Input
                            placeholder="발신허용 패턴"
                            maxLength={256}
                            disabled={watchedDodNumAllow !== 1}
                            addonAfter={
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed"
                                disabled={watchedDodNumAllow !== 1}
                                onClick={() => dodNumPatternDrawerRef.current?.open()}
                              >
                                패턴선택
                              </button>
                            }
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* 착신 부가서비스 */}
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">착신 부가서비스</h4>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 mb-3">
                      <SwitchBox name="dnTblSvc" label="착신금지설정" />
                      <SwitchBox name="pickupSvc" label="픽업사용설정" />
                      <SwitchBox name="ignoreBugsCoaching" label="피감청/피코칭방지" />
                      <SwitchBox name="callScreenSvc" label="특정번호 착신금지" />
                    </div>
                    <Row gutter={[20, 0]}>
                      <Col span={12}>
                        <Form.Item
                          className="!mb-3"
                          name="callScreenNum"
                          label="특정번호 착신금지패턴"
                          rules={[
                            { max: 24, message: '24자 이내여야 합니다' },
                            {
                              validator: (_, value) => {
                                if (!value?.trim()) return Promise.resolve();
                                if (!testSwatPattern(value.trim())) {
                                  return Promise.reject(new Error('특정번호 착신금지패턴 형식이 올바르지 않습니다'));
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Input
                            placeholder="착신금지 패턴"
                            maxLength={24}
                            disabled={watchedCallScreenSvc !== 1}
                            addonAfter={
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed"
                                disabled={watchedCallScreenSvc !== 1}
                                onClick={() => callScreenNumDrawerRef.current?.open()}
                              >
                                패턴선택
                              </button>
                            }
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Step 3: 개인IPT 서비스 ── */}
                  <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">개인IPT 서비스</h4>

                    {/* 발신 부가서비스 */}
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">발신 부가서비스</h4>
                    <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
                      <SwitchBox name="shortDialSvc" label="단축다이얼" />
                      <SwitchBox name="callReserveSvc" label="통화예약" />
                      <SwitchBox name="autoReturnSvc" label="자동호회수" />
                      <SwitchBox name="intercomOrigSvc" label="인터콤 발신" />
                    </div>

                    {/* 착신 부가서비스 */}
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 mt-4">착신 부가서비스</h4>
                    <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
                      <SwitchBox name="unknownDeny" label="익명호 거부" />
                      <SwitchBox name="dodNameSvc" label="발신자 이름표시" />
                      <SwitchBox name="transSvc" label="착신 전환류" />
                      <SwitchBox name="denySvc" label="착신 거부류" />
                      <SwitchBox name="busyWaitSvc" label="통화중 대기" />
                      <SwitchBox name="absenceSvc" label="부재중 안내" />
                      <SwitchBox name="moveAnsSvc" label="이동응답" />
                      <SwitchBox name="mvaSvc" label="모바일 원격접근" />
                      <SwitchBox name="cidDenySvc" label="발신자정보표시방지" />
                      <SwitchBox name="callAvoidSvc" label="호회피" />
                      <SwitchBox name="autoanswerSvc" label="자동응답" />
                      <SwitchBox name="intercomTermSvc" label="인터콤 착신 허용" />
                      <SwitchBox name="didReleaseTone" label="통화 종료음" />
                      <SwitchBox name="trnsOkTone" label="호전환완료음" />
                      <SwitchBox name="silentTermSvc" label="무음착신서비스" />
                    </div>
                  </div>
                </Form>
              </div>
              <div className="w-full px-7 pb-7">{renderFooter()}</div>
            </>
          )}
        </div>

        {/* Right summary panel */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>

      {/* 번호 패턴 공통 Drawer */}
      <NumPatternDrawer ref={dodNumPatternDrawerRef} onSelect={(p) => form.setFieldValue('dodNumPattern', p.numPattern)} />
      <NumPatternDrawer ref={callScreenNumDrawerRef} onSelect={(p) => form.setFieldValue('callScreenNum', p.numPattern)} />
    </div>
  );
}

// ─── 요약 행 컴포넌트 ─────────────────────────────────────────────────────────
function SummaryRow({ label, value, required }: { label: string; value: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[140px] shrink-0">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-gray-800 font-medium flex-1">{value}</span>
    </div>
  );
}
