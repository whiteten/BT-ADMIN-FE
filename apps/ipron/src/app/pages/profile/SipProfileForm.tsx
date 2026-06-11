/**
 * SIP 프로파일 등록/수정 — 2단계 위저드 + 우측 입력 정보 요약
 * Step 1: 기본정보
 * Step 2: SIP 옵션 + SIP 헤더 옵션 + Auto Answer Text
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, Input, InputNumber, Row, Select, Steps, Switch } from 'antd';
import { Check, X } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import {
  sipProfileQueryKeys,
  useCreateSipProfile,
  useGetSipHeaderGroups,
  useGetSipProfileDetail,
  useUpdateSipProfile,
} from '../../features/sip-profile/hooks/useSipProfileQueries';
import {
  DEFAULT_SIP_HEADER_OPTION,
  DEFAULT_SIP_OPTION,
  SIP_HEADER_OPTION_FIELDS,
  SIP_OPTION_FIELDS,
  SS_REFRESH_TYPE_LABELS,
  SS_REFRESH_TYPE_OPTIONS,
  type SipHeaderOptionDto,
  type SipOptionDto,
} from '../../features/sip-profile/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const initialValues = {
  ssRefreshType: 1,
  ssRefreshInterval: 1800,
  sipOption: { ...DEFAULT_SIP_OPTION },
  sipHeaderOption: { ...DEFAULT_SIP_HEADER_OPTION },
};

export default function SipProfileForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const isEditMode = !!id;
  const profileId = id ? Number(id) : null;

  const { data: headerGroups = [] } = useGetSipHeaderGroups();
  const { data: profileDetail, isFetching } = useGetSipProfileDetail({
    params: profileId ? { id: profileId } : undefined,
    queryOptions: { enabled: !!profileId },
  });

  useEffect(() => {
    if (profileDetail && isEditMode) {
      const vals = {
        sipProfileName: profileDetail.sipProfileName,
        sipHeaderGrpId: profileDetail.sipHeaderGrpId,
        ssRefreshType: profileDetail.ssRefreshType,
        ssRefreshInterval: profileDetail.ssRefreshInterval,
        autoAnswerOption: profileDetail.autoAnswerOption ?? '',
        sipOption: { ...profileDetail.sipOption },
        sipHeaderOption: { ...profileDetail.sipHeaderOption },
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [profileDetail, isEditMode, form]);

  const { mutate: createProfile, isPending: isCreating } = useCreateSipProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: sipProfileQueryKeys.getProfiles().queryKey });
        navigate('/ipron/profile/sip-profile');
      },
    },
  });

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateSipProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: sipProfileQueryKeys.getProfiles().queryKey });
        navigate('/ipron/profile/sip-profile');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const headerGroupOptions = [{ label: '없음', value: 0 }, ...headerGroups.map((g) => ({ label: g.sipHeaderGrpName, value: g.sipHeaderGrpId }))];

  const steps = [{ title: '기본정보' }, { title: 'SIP 옵션' }, { title: 'SIP 헤더 옵션' }];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['sipProfileName', 'ssRefreshType', 'ssRefreshInterval']);
      }
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch {
      /* validation failed */
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        sipProfileName: values.sipProfileName,
        sipHeaderGrpId: values.sipHeaderGrpId ?? null,
        ssRefreshType: values.ssRefreshType,
        ssRefreshInterval: values.ssRefreshInterval,
        sipOption: values.sipOption,
        sipHeaderOption: values.sipHeaderOption,
        autoAnswerOption: values.autoAnswerOption || null,
      };
      if (isEditMode && profileId) {
        updateProfile({ id: profileId, data: payload });
      } else {
        createProfile(payload);
      }
    } catch {
      setCurrentStep(0);
    }
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '프로파일 관리', path: '/ipron/profile' },
      { title: 'SIP 프로파일', path: '/ipron/profile/sip-profile' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && id ? `/ipron/profile/sip-profile/${id}` : '/ipron/profile/sip-profile/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  const getOptionLabel = (options: { label: string; value: number }[], val: unknown) => {
    const found = options.find((o) => o.value === val);
    return found ? found.label : val;
  };

  const getSipOptionLabel = (key: string, val: number) => {
    const def = SIP_OPTION_FIELDS.find((f) => f.key === key);
    if (!def) return String(val);
    if (def.controlType === 'switch') return val === 1 ? '사용' : '미사용';
    return getOptionLabel(def.options ?? [], val);
  };

  const getHeaderOptionLabel = (key: string, val: number) => {
    const def = SIP_HEADER_OPTION_FIELDS.find((f) => f.key === key);
    if (!def) return String(val);
    if (def.controlType === 'switch') return val === 1 ? '사용' : '미사용';
    return getOptionLabel(def.options ?? [], val);
  };

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = formValues ?? initialValues;
    const sipOpt = (values.sipOption ?? DEFAULT_SIP_OPTION) as SipOptionDto;
    const hdrOpt = (values.sipHeaderOption ?? DEFAULT_SIP_HEADER_OPTION) as SipHeaderOptionDto;

    return (
      <div className="space-y-4 text-sm">
        {/* Step 1: 기본정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본정보</div>
          <SummaryRow label="프로파일명" value={displayValue(values.sipProfileName as string)} />
          <SummaryRow label="헤더 그룹" value={displayValue(values.sipHeaderGrpId ? getOptionLabel(headerGroupOptions, values.sipHeaderGrpId) : null)} />
          <SummaryRow
            label="세션갱신"
            value={displayValue(`${SS_REFRESH_TYPE_LABELS[values.ssRefreshType as number] ?? values.ssRefreshType} / ${values.ssRefreshInterval ?? '-'}초`)}
          />
          <SummaryRow label="Auto Answer" value={displayValue(values.autoAnswerOption as string)} />
        </div>

        <Divider className="!my-3" />

        {/* Step 2: SIP 옵션 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. SIP 옵션</div>
          {SIP_OPTION_FIELDS.map((field) => {
            const val = sipOpt[field.key];
            const label = getSipOptionLabel(field.key, val);
            const isActive = field.controlType === 'switch' ? val === 1 : val !== 0;
            return (
              <div key={field.key} className="flex items-center gap-1">
                <span className="text-gray-500 w-[140px] shrink-0 truncate">{field.label}</span>
                <span className={`flex-1 font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{label as React.ReactNode}</span>
                {isActive ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : null}
              </div>
            );
          })}
        </div>

        <Divider className="!my-3" />

        {/* SIP 헤더 옵션 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">SIP 헤더 옵션</div>
          {SIP_HEADER_OPTION_FIELDS.map((field) => {
            const val = hdrOpt[field.key];
            const label = getHeaderOptionLabel(field.key, val);
            const isActive = field.controlType === 'switch' ? val === 1 : val !== 0;
            return (
              <div key={field.key} className="flex items-center gap-1">
                <span className="text-gray-500 w-[140px] shrink-0 truncate">{field.label}</span>
                <span className={`flex-1 font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{label as React.ReactNode}</span>
                {isActive ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/profile/sip-profile')}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep((prev) => prev - 1)}>
              이전
            </Button>
          </Col>
        )}
        {!isLastStep && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {isLastStep && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Steps 바 */}
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

      {/* 메인 (좌: 폼, 우: 요약) */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* 좌측 폼 */}
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          {isFetching && isEditMode ? (
            <div className="flex items-center justify-center w-full h-full">
              <FallbackSpinner />
            </div>
          ) : (
            <>
              <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
                <Form form={form} initialValues={initialValues} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Step 1: 기본정보 ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="sipProfileName"
                          label="프로파일명"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '프로파일명은 필수입니다' },
                            { max: 128, message: '128자 이내' },
                          ]}
                        >
                          <Input placeholder="프로파일명" maxLength={128} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="sipHeaderGrpId" label="헤더 그룹">
                          <Select options={headerGroupOptions} allowClear placeholder="선택" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="ssRefreshType" label="세션갱신 타입" required rules={[{ required: true, message: '세션갱신 타입은 필수입니다' }]}>
                          <Select options={[...SS_REFRESH_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ssRefreshInterval" label="세션갱신 주기 (초)" required rules={[{ required: true, message: '주기는 필수입니다' }]}>
                          <InputNumber min={0} className="!w-full" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Step 2: SIP 옵션 ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
                      {SIP_OPTION_FIELDS.map((field) =>
                        field.controlType === 'switch' ? (
                          <div key={field.key} className="flex items-center justify-between py-2 px-3 rounded-md border border-gray-100 bg-gray-50">
                            <span className="text-sm text-gray-700">{field.label}</span>
                            <Form.Item
                              name={['sipOption', field.key]}
                              valuePropName="checked"
                              noStyle
                              getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                              getValueProps={(value: number) => ({ checked: value === 1 })}
                            >
                              <Switch size="small" />
                            </Form.Item>
                          </div>
                        ) : (
                          <div key={field.key} className="flex items-center justify-between py-1.5 px-3 rounded-md border border-gray-100 bg-gray-50">
                            <span className="text-sm text-gray-700 flex-shrink-0 mr-3">{field.label}</span>
                            <Form.Item name={['sipOption', field.key]} noStyle>
                              <Select options={field.options} size="small" style={{ width: 160 }} />
                            </Form.Item>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="mt-4">
                      <Form.Item name="autoAnswerOption" label="Auto Answer Text" rules={[{ max: 128, message: '128자 이내' }]} className="!mb-0" style={{ maxWidth: 400 }}>
                        <Input placeholder="Auto Answer Text" maxLength={128} />
                      </Form.Item>
                    </div>
                  </div>

                  {/* ── Step 3: SIP 헤더 옵션 ── */}
                  <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                      {SIP_HEADER_OPTION_FIELDS.map((field) => (
                        <div key={field.key} className="flex items-center justify-between py-1.5 px-3 rounded-md border border-gray-100 bg-gray-50">
                          <span className="text-sm text-gray-700 flex-shrink-0 mr-3">{field.label}</span>
                          {field.controlType === 'switch' ? (
                            <Form.Item
                              name={['sipHeaderOption', field.key]}
                              valuePropName="checked"
                              noStyle
                              getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                              getValueProps={(value: number) => ({ checked: value === 1 })}
                            >
                              <Switch size="small" />
                            </Form.Item>
                          ) : (
                            <Form.Item name={['sipHeaderOption', field.key]} noStyle>
                              <Select options={field.options} size="small" style={{ width: 160 }} />
                            </Form.Item>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Form>
              </div>
              <div className="w-full px-7 pb-7">{renderFooter()}</div>
            </>
          )}
        </div>

        {/* 우측 요약 패널 */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 요약 행 컴포넌트 ─────────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[140px] shrink-0">{label}</span>
      <span className="text-gray-800 font-medium flex-1">{value}</span>
    </div>
  );
}
