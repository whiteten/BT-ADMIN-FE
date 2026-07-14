/**
 * 내선 프로파일 등록/수정 폼 페이지 (IPR20S2220)
 * Pattern: DidRouteForm 표준 (Steps Wizard + 우측 Summary Panel)
 *
 * Step 구성:
 *  - Step 1: 기본정보 (내선 프로파일 / DR 설정)
 *  - Step 2: 프로파일 연결 (특수코드 / SIP / 라우트 / CTI)
 *  - Step 3: 중개 & NAT (RTP / NAT / 미디어 딜리버리 / AGC)
 *
 * 노드 변경 시 tenantId, 옵션 재로딩, 관련 FK 필드 리셋
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, Input, InputNumber, Row, Select, Steps, Switch } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DnProfileSummaryPanel from '../../features/dn-profile/components/DnProfileSummaryPanel';
import {
  dnProfileQueryKeys,
  useCreateDnProfile,
  useDeleteDnProfile,
  useGetDnProfileDetail,
  useGetDnProfileNodes,
  useGetDnProfileOptions,
  useGetDnProfileTenants,
  useUpdateDnProfile,
} from '../../features/dn-profile/hooks/useDnProfileQueries';
import { DN_PROFILE_INITIAL_VALUES, type DnProfileCreateRequest, type DnProfileUpdateRequest } from '../../features/dn-profile/types';
import { DN_PROFILE_TYPE_OPTIONS, NAT_OPTION_OPTIONS, REC_START_CALL_TYPE_OPTIONS, getRtpOptions } from '../../features/dn-profile/utils/dnProfileEnums';
import { useGetNodeTenants, useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function DnProfileForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const defaultTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : undefined;

  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const STEPS = [
    { title: '기본정보', key: 'basic' },
    { title: '중개 / NAT', key: 'relay' },
  ];
  const isLastStep = currentStep === STEPS.length - 1;

  const isEditMode = !!id;
  const dnProfileId = id ? Number(id) : null;

  // ─── Watch fields ───────────────────────────────────────────────────────────
  const watchedNodeId = Form.useWatch('nodeId', form);
  const watchedTenantId = Form.useWatch('tenantId', form);
  const watchedDnProfileType = Form.useWatch('dnProfileType', form);
  const watchedAgcYn = Form.useWatch('agcYn', form);
  const watchedNatOption = Form.useWatch('natOption', form);
  const watchedRtpOption = Form.useWatch('rtpOption', form);

  // AS-IS 조건:
  //  - TRUNK(유형=1): 녹취 멘트/시작콜유형 disabled + AGC disabled
  //  - rtpOption=0(사용안함): 미디어전달 disabled + AGC disabled
  //  - rtpOption!=0: MS 그룹 필수
  const isTrunkType = watchedDnProfileType === '1';
  const isRtpDisabled = (watchedRtpOption ?? 0) === 0;
  const recFieldDisabled = isTrunkType;
  const agcDisabled = isTrunkType || isRtpDisabled;
  const mediaDeliveryDisabled = isRtpDisabled;
  const msGroupRequired = !isRtpDisabled;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();
  // 노드 셀렉트 스코프: 신규 등록은 일반 모드=로그인 테넌트 노드/운영자=전체, 수정은 기존 노드 표시 위해 전체.
  const scopedNodes = useScopedNodes(allNodes);
  const nodes = isEditMode ? allNodes : scopedNodes;
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: profileDetail, isFetching } = useGetDnProfileDetail(dnProfileId);

  // 노드-테넌트 매핑 기반: 해당 노드에 할당된 테넌트만
  const tenantOptions = useMemo(() => {
    if (!watchedNodeId) return [];
    const tenantIdsForNode = new Set(nodeTenants.filter((nt) => nt.nodeId === watchedNodeId).map((nt) => nt.tenantId));
    return tenants.filter((t) => tenantIdsForNode.has(t.tenantId)).map((t) => ({ label: t.tenantName, value: t.tenantId }));
  }, [watchedNodeId, tenants, nodeTenants]);

  // 할당된 노드만 표시
  const nodeOptions = useMemo(() => {
    const assignedNodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => assignedNodeIds.has(n.nodeId)).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, nodeTenants]);

  // optional FK 드롭다운에 "미지정" / 커스텀 라벨 prepend
  const withUnset = <T extends { label: string; value: unknown }>(opts: T[], label = '미지정') => [{ label, value: null } as unknown as T, ...opts];

  // DR 노드 watch (DR 프로파일/MS/미디어 옵션 의존)
  const watchedDrNodeId = Form.useWatch('drNodeId', form);

  // DR 노드 지정 여부에 따라 Global DN 자동 동기화 (편집 로드/DB drift 대응)
  useEffect(() => {
    const next = watchedDrNodeId ? true : false;
    if (form.getFieldValue('globalDnYn') !== next) {
      form.setFieldsValue({ globalDnYn: next });
    }
  }, [watchedDrNodeId, form]);

  // 폼 옵션 일괄 조회 (노드+테넌트 + DR 노드 + 유형 + 자기 자신 제외)
  const optionsParams = useMemo(() => {
    if (watchedNodeId && watchedTenantId) {
      return {
        nodeId: watchedNodeId as number,
        tenantId: watchedTenantId as number,
        drNodeId: (watchedDrNodeId ?? null) as number | null,
        dnProfileType: (watchedDnProfileType ?? null) as string | null,
        excludeProfileId: (dnProfileId ?? null) as number | null,
      };
    }
    return null;
  }, [watchedNodeId, watchedTenantId, watchedDrNodeId, watchedDnProfileType, dnProfileId]);
  const { data: options } = useGetDnProfileOptions(optionsParams);

  const emergencyOptions = useMemo(() => (options?.emergencyProfiles ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const devfuncOptions = useMemo(() => (options?.devfuncProfiles ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const accessOptions = useMemo(() => (options?.accessProfiles ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const sipOptions = useMemo(() => (options?.sipProfiles ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const localRouteOptions = useMemo(() => (options?.localRoutes ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const msGroupOptions = useMemo(() => (options?.msGroups ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const mediaDeliveryOptions = useMemo(() => (options?.mediaDeliveries ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const recNotifyOptions = useMemo(() => (options?.recNotifyMents ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const drProfileOptions = useMemo(() => withUnset((options?.drProfiles ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const drNodeOptions = useMemo(() => withUnset((options?.drNodes ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  // optional FK 드롭다운 (미지정 옵션 포함)
  const sipOptionsWithUnset = useMemo(() => withUnset((options?.sipProfiles ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const localRouteOptionsWithUnset = useMemo(
    () =>
      withUnset(
        (options?.localRoutes ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '미사용',
      ),
    [options],
  );
  const msGroupOptionsWithUnset = useMemo(() => withUnset((options?.msGroups ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const mediaDeliveryOptionsWithUnset = useMemo(() => withUnset((options?.mediaDeliveries ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  // DR 노드 기준 옵션 (AS-IS onChangedDrNode)
  const drMediaDeliveryOptionsWithUnset = useMemo(() => withUnset((options?.drMediaDeliveries ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const drMsGroupOptionsWithUnset = useMemo(() => withUnset((options?.drMsGroups ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const recNotifyOptionsWithUnset = useMemo(
    () =>
      withUnset(
        (options?.recNotifyMents ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );

  // RTP 옵션 (dnProfileType 에 따라 분기)
  const rtpOptionList = useMemo(() => getRtpOptions(watchedDnProfileType), [watchedDnProfileType]);

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (profileDetail && isEditMode) {
      // BE Response 는 boolean 으로 내려오고 Request 는 Integer(0/1) — 변환 헬퍼.
      const toFlag = (v: unknown): number => (v === true || v === 1 ? 1 : 0);
      const vals: Partial<DnProfileCreateRequest> = {
        nodeId: profileDetail.nodeId,
        tenantId: profileDetail.tenantId,
        dnProfileType: profileDetail.dnProfileType,
        dnProfileName: profileDetail.dnProfileName,
        drNodeId: profileDetail.drNodeId,
        globalDnYn: toFlag(profileDetail.globalDnYn),
        drDnProfileId: profileDetail.drDnProfileId,
        emergencyCodeProfileId: profileDetail.emergencyCodeProfileId,
        devfuncCodeProfileId: profileDetail.devfuncCodeProfileId,
        accessCodeProfileId: profileDetail.accessCodeProfileId,
        sipProfileId: profileDetail.sipProfileId,
        localRouteId: profileDetail.localRouteId,
        ctiUse: toFlag(profileDetail.ctiUse),
        rtpOption: profileDetail.rtpOption ?? 0,
        drRtpOption: profileDetail.drRtpOption ?? 0,
        msGroupId: profileDetail.msGroupId,
        msDrGroupId: profileDetail.msDrGroupId,
        natOption: profileDetail.natOption ?? '0',
        mediaDeliveryId: profileDetail.mediaDeliveryId,
        drMediaDeliveryId: profileDetail.drMediaDeliveryId,
        recNotifyMentId: profileDetail.recNotifyMentId,
        recStartCallType: profileDetail.recStartCallType,
        agcYn: toFlag(profileDetail.agcYn),
        agcDefLevel: profileDetail.agcDefLevel ?? 0,
        agcGainComp: profileDetail.agcGainComp ?? 0,
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [profileDetail, isEditMode, form]);

  // ─── Set default node/tenant (신규 등록 시) ──────────────────────────────
  useEffect(() => {
    if (!isEditMode) {
      const defaults: Record<string, unknown> = {};
      if (defaultNodeId) defaults.nodeId = defaultNodeId;
      if (defaultTenantId) defaults.tenantId = defaultTenantId;
      if (Object.keys(defaults).length > 0) {
        form.setFieldsValue(defaults);
        setFormValues((prev: Record<string, unknown>) => ({ ...(prev ?? DN_PROFILE_INITIAL_VALUES), ...defaults }));
      }
    }
  }, [isEditMode, defaultNodeId, defaultTenantId, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createDnProfile, isPending: isCreating } = useCreateDnProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('내선 프로파일이 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: dnProfileQueryKeys.getList().queryKey });
        navigate('/ipron/profile/dn-profile');
      },
    },
  });

  const { mutate: updateDnProfile, isPending: isUpdating } = useUpdateDnProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('내선 프로파일이 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: dnProfileQueryKeys.getList().queryKey });
        navigate('/ipron/profile/dn-profile');
      },
    },
  });

  const { mutate: deleteDnProfile } = useDeleteDnProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('내선 프로파일이 삭제되었습니다');
        queryClient.invalidateQueries({ queryKey: dnProfileQueryKeys.getList().queryKey });
        navigate('/ipron/profile/dn-profile');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Antd Switch 컴포넌트는 boolean 을 내보내지만 BE DTO 는 Integer(0/1) 이므로
      // submit 직전에 숫자로 변환. null/undefined 도 0 으로 수렴.
      const toFlag = (v: unknown): number => (v === true || v === 1 ? 1 : 0);

      const payload: DnProfileCreateRequest = {
        nodeId: values.nodeId,
        tenantId: values.tenantId,
        dnProfileType: values.dnProfileType,
        dnProfileName: values.dnProfileName,
        drNodeId: values.drNodeId ?? null,
        globalDnYn: toFlag(values.globalDnYn),
        drDnProfileId: values.drDnProfileId ?? null,
        emergencyCodeProfileId: values.emergencyCodeProfileId,
        devfuncCodeProfileId: values.devfuncCodeProfileId,
        accessCodeProfileId: values.accessCodeProfileId,
        sipProfileId: values.sipProfileId ?? null,
        localRouteId: values.localRouteId ?? null,
        ctiUse: toFlag(values.ctiUse),
        rtpOption: values.rtpOption ?? 0,
        drRtpOption: values.drRtpOption ?? 0,
        msGroupId: values.msGroupId ?? null,
        msDrGroupId: values.msDrGroupId ?? null,
        natOption: values.natOption ?? '0',
        mediaDeliveryId: values.mediaDeliveryId ?? null,
        drMediaDeliveryId: values.drMediaDeliveryId ?? null,
        recNotifyMentId: values.recNotifyMentId ?? null,
        recStartCallType: values.recStartCallType || null,
        agcYn: toFlag(values.agcYn),
        agcDefLevel: values.agcDefLevel ?? 0,
        agcGainComp: values.agcGainComp ?? 0,
      };

      if (isEditMode && dnProfileId) {
        const { nodeId: _n, tenantId: _t, ...updateData } = payload;
        updateDnProfile({ id: dnProfileId, data: updateData as DnProfileUpdateRequest });
      } else {
        createDnProfile(payload);
      }
    } catch {
      // validation error — 첫 스탭으로 돌아가서 에러 위치 확인
      setCurrentStep(0);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 기본정보 탭에 프로파일 연결 섹션이 병합됨 → 특수코드까지 모두 검증
        await form.validateFields(['nodeId', 'tenantId', 'dnProfileType', 'dnProfileName', 'emergencyCodeProfileId', 'devfuncCodeProfileId', 'accessCodeProfileId']);
      }
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch {
      /* validation failed — 현재 스탭 유지 */
    }
  };

  const handleDeleteConfirm = () => {
    if (!dnProfileId) return;
    modal.confirm.execute({
      onOk: () => deleteDnProfile(dnProfileId),
      options: {
        title: '내선 프로파일 삭제',
        content: `"${profileDetail?.dnProfileName}" 프로파일을 삭제하시겠습니까?\n(DN / SIP Trunk / DR 에서 참조 중인 경우 삭제가 거부됩니다)`,
      },
    });
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '번호자원관리' },
      { title: '프로파일', path: '/ipron/profile' },
      { title: '내선 프로파일', path: '/ipron/profile/dn-profile' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && id ? `/ipron/profile/dn-profile/${id}/edit` : '/ipron/profile/dn-profile/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── Footer ────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/profile/dn-profile')}>
            취소
          </Button>
        </Col>
        {isEditMode && (
          <Col>
            <Button variant="solid" color="danger" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </Col>
        )}
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

  // ─── Render ────────────────────────────────────────────────────────────────
  const showNatHint = watchedNatOption === '2' || watchedNatOption === '3' || watchedNatOption === '4';

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Steps bar */}
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
          items={STEPS.map((s) => ({ title: s.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${STEPS.length * 250}px` }}
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
                <Form form={form} initialValues={DN_PROFILE_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Step 1: 기본정보 (내선 프로파일 + DR 설정) ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    {/* ── 섹션 1: 내선 프로파일 ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">내선 프로파일</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
                          <Select
                            options={nodeOptions}
                            placeholder="노드 선택"
                            disabled={isEditMode}
                            showSearch
                            optionFilterProp="label"
                            onChange={() => {
                              if (!isEditMode) {
                                // 노드 변경 시 테넌트 및 의존 FK 리셋
                                form.setFieldsValue({
                                  tenantId: undefined,
                                  drNodeId: null,
                                  drDnProfileId: null,
                                  emergencyCodeProfileId: undefined,
                                  devfuncCodeProfileId: undefined,
                                  accessCodeProfileId: undefined,
                                  sipProfileId: null,
                                  localRouteId: null,
                                  msGroupId: null,
                                  msDrGroupId: null,
                                  mediaDeliveryId: null,
                                  drMediaDeliveryId: null,
                                  recNotifyMentId: null,
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트는 필수입니다' }]}>
                          <Select
                            placeholder={watchedNodeId ? '테넌트 선택' : '노드를 먼저 선택하세요'}
                            options={tenantOptions}
                            disabled={isEditMode || !watchedNodeId}
                            showSearch
                            optionFilterProp="label"
                            onChange={() => {
                              if (!isEditMode) {
                                // 테넌트 변경 시 의존 FK 리셋
                                form.setFieldsValue({
                                  emergencyCodeProfileId: undefined,
                                  devfuncCodeProfileId: undefined,
                                  accessCodeProfileId: undefined,
                                  sipProfileId: null,
                                  localRouteId: null,
                                  msGroupId: null,
                                  mediaDeliveryId: null,
                                  recNotifyMentId: null,
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="dnProfileType" label="유형" required rules={[{ required: true, message: '유형은 필수입니다' }]}>
                          <Select options={DN_PROFILE_TYPE_OPTIONS} placeholder="유형 선택" disabled={isEditMode} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={24}>
                        <Form.Item
                          name="dnProfileName"
                          label="프로파일명"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '프로파일명은 필수입니다' },
                            { max: 128, message: '128자 이내여야 합니다' },
                          ]}
                        >
                          <Input placeholder="프로파일명" maxLength={128} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── 섹션 2: DR 설정 ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">DR 설정</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="drNodeId" label="DR 노드" tooltip="같은 클러스터 그룹의 다른 노드만 선택 가능. 지정 시 Global DN 자동 사용">
                          <Select
                            options={drNodeOptions}
                            placeholder="DR 노드 선택"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            onChange={(v) => {
                              // DR 노드 변경 시 DR 프로파일/MS그룹(DR)/미디어전달(DR) 리셋
                              // DR 노드 지정 → Global DN 사용 강제 / 미지정 → 사용안함 복귀
                              form.setFieldsValue({
                                drDnProfileId: null,
                                msDrGroupId: null,
                                drMediaDeliveryId: null,
                                globalDnYn: v ? true : false,
                              });
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="globalDnYn"
                          label="Global DN"
                          valuePropName="checked"
                          tooltip={watchedDrNodeId ? 'DR 노드 지정 시 자동 사용 (수정 불가)' : 'Global DN: 클러스터 전역에서 고유한 번호'}
                        >
                          <Switch checkedChildren="사용" unCheckedChildren="사용안함" disabled={!!watchedDrNodeId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="drDnProfileId"
                          label="DR 프로파일"
                          required={!!watchedDrNodeId}
                          rules={watchedDrNodeId ? [{ required: true, message: 'DR 노드 선택 시 DR 프로파일도 필수입니다' }] : []}
                          tooltip={!watchedDrNodeId ? 'DR 노드를 먼저 선택하세요' : undefined}
                        >
                          <Select options={drProfileOptions} placeholder="DR 프로파일 선택" showSearch optionFilterProp="label" disabled={!watchedDrNodeId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── 섹션 (이동): 특수코드 설정 ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">특수코드 설정</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="emergencyCodeProfileId" label="긴급코드 프로파일" required rules={[{ required: true, message: '긴급코드 프로파일은 필수입니다' }]}>
                          <Select options={emergencyOptions} placeholder="긴급코드 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="devfuncCodeProfileId" label="기능코드 프로파일" required rules={[{ required: true, message: '기능코드 프로파일은 필수입니다' }]}>
                          <Select options={devfuncOptions} placeholder="기능코드 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="accessCodeProfileId" label="접근코드 프로파일" required rules={[{ required: true, message: '접근코드 프로파일은 필수입니다' }]}>
                          <Select options={accessOptions} placeholder="접근코드 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── 섹션 4: SIP / 라우트 / CTI ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">SIP / 라우트 / CTI</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="sipProfileId" label="SIP 프로파일">
                          <Select options={sipOptionsWithUnset} placeholder="SIP 프로파일 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="localRouteId" label="로컬 라우트">
                          <Select options={localRouteOptionsWithUnset} placeholder="라우트 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="ctiUse" label="CTI 사용" valuePropName="checked">
                          <Switch checkedChildren="사용" unCheckedChildren="사용안함" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Step 2: 중개 / NAT / AGC ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    {/* ── 섹션 1: RTP 중개 옵션 + NAT ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">RTP 중개 / NAT</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="rtpOption" label="RTP 중개 옵션">
                          <Select options={rtpOptionList} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="msGroupId"
                          label="MS 그룹"
                          required={msGroupRequired}
                          rules={msGroupRequired ? [{ required: true, message: 'MS 그룹은 필수입니다 (중개 사용 시)' }] : []}
                        >
                          <Select options={msGroupOptionsWithUnset} placeholder="MS 그룹 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="natOption" label="NAT 동작 옵션" tooltip={showNatHint ? 'NAT 옵션 설정 시 MS 중개가 필요합니다' : undefined}>
                          <Select options={NAT_OPTION_OPTIONS} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── 섹션 2: 미디어 딜리버리 ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">미디어 딜리버리</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="mediaDeliveryId" label="미디어 전달 그룹" tooltip={mediaDeliveryDisabled ? 'RTP 중개가 "사용안함"이면 선택 불가' : undefined}>
                          <Select
                            options={mediaDeliveryOptionsWithUnset}
                            placeholder="미디어 전달 선택"
                            showSearch
                            optionFilterProp="label"
                            disabled={!watchedTenantId || mediaDeliveryDisabled}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="recNotifyMentId" label="녹취 안내 멘트" tooltip={recFieldDisabled ? 'TRUNK 유형에서는 사용 불가' : undefined}>
                          <Select options={recNotifyOptionsWithUnset} placeholder="멘트 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId || recFieldDisabled} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="recStartCallType" label="녹취 시작 콜 유형" tooltip={recFieldDisabled ? 'TRUNK 유형에서는 사용 불가' : undefined}>
                          <Select
                            options={[{ label: '미지정', value: null }, ...REC_START_CALL_TYPE_OPTIONS]}
                            placeholder="콜 유형 선택"
                            allowClear
                            disabled={!watchedTenantId || recFieldDisabled}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── 섹션 2-2: DR 중개 설정 (DR 노드 지정 시 활성) — AS-IS IPR20S2220 poDrRtpOption/poMsDrGroupId/poDrMediaDeliveryId ── */}
                    {watchedDrNodeId && (
                      <>
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">DR 중개 설정</h4>
                        <Row gutter={20}>
                          <Col span={8}>
                            <Form.Item name="drRtpOption" label="DR RTP 중개 옵션">
                              <Select options={rtpOptionList} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="msDrGroupId" label="DR MS 그룹">
                              <Select options={drMsGroupOptionsWithUnset} placeholder="DR MS 그룹 선택" showSearch optionFilterProp="label" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="drMediaDeliveryId" label="DR 미디어 전달 그룹">
                              <Select options={drMediaDeliveryOptionsWithUnset} placeholder="DR 미디어 전달 선택" showSearch optionFilterProp="label" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )}

                    {/* ── 섹션 3: AGC 제어 ── */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">AGC 제어</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="agcYn" label="AGC 설정" valuePropName="checked" tooltip={agcDisabled ? 'TRUNK이거나 RTP 중개가 "사용안함"이면 설정 불가' : undefined}>
                          <Switch checkedChildren="설정" unCheckedChildren="해제" disabled={agcDisabled} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="agcDefLevel" label="기본 레벨" tooltip="0 ~ 10" rules={[{ type: 'number', min: 0, max: 10, message: '0~10 범위여야 합니다' }]}>
                          <InputNumber min={0} max={10} className="!w-full" disabled={agcDisabled || !watchedAgcYn} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="agcGainComp" label="Gain 압축" tooltip="-1 ~ 1" rules={[{ type: 'number', min: -1, max: 1, message: '-1~1 범위여야 합니다' }]}>
                          <InputNumber min={-1} max={1} className="!w-full" disabled={agcDisabled || !watchedAgcYn} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </Form>
              </div>
              <div className="w-full px-7 pb-7">{renderFooter()}</div>
            </>
          )}
        </div>

        {/* Right summary panel */}
        <div className="!w-[360px] !min-w-[360px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
            <DnProfileSummaryPanel
              values={formValues ?? DN_PROFILE_INITIAL_VALUES}
              nodes={nodes}
              tenants={tenants}
              options={{
                emergencyProfiles: options?.emergencyProfiles ?? [],
                devfuncProfiles: options?.devfuncProfiles ?? [],
                accessProfiles: options?.accessProfiles ?? [],
                sipProfiles: options?.sipProfiles ?? [],
                localRoutes: options?.localRoutes ?? [],
                msGroups: options?.msGroups ?? [],
                mediaDeliveries: options?.mediaDeliveries ?? [],
                recNotifyMents: options?.recNotifyMents ?? [],
                drProfiles: options?.drProfiles ?? [],
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
