/**
 * 발신라우트 등록/수정 -- AS-IS IPR20S1020.jsp 2-Tab 구조
 * Tab 1: 기본정보 (라우트명, 노드, 분배방식, 호실패재시도, 발신번호변환, ANI설정, 과금설정, 통신사인증번호)
 * Tab 2: 부가정보 (링백톤, 블록, 우회라우트, DOD편집, 업무시간설정)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, Input, InputNumber, Row, Select, Steps, Switch } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import {
  routeQueryKeys,
  useCreateRoute,
  useGetDodTransOptions,
  useGetMentOptions,
  useGetNodes,
  useGetRouteDetail,
  useGetRoutesByNode,
  useGetWorktimeOptions,
  useUpdateRoute,
} from '../../features/route/hooks/useRouteQueries';
import {
  ANI_TYPE_LABELS,
  ANI_TYPE_OPTIONS,
  CHARGE_TYPE_LABELS,
  CHARGE_TYPE_OPTIONS,
  EDIT_OPT_LABELS,
  EDIT_OPT_OPTIONS,
  ROUTE_FORM_STEPS,
  ROUTE_INITIAL_VALUES,
  ROUTE_TYPE_LABELS,
  ROUTE_TYPE_OPTIONS,
  type RouteCreateRequest,
  WORKTIME_OPT_LABELS,
  WORKTIME_OPT_OPTIONS,
} from '../../features/route/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function RouteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const isEditMode = !!id;
  const routeId = id ? Number(id) : null;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  const { data: routeDetail, isFetching } = useGetRouteDetail({
    params: routeId ? { id: routeId } : undefined,
    queryOptions: { enabled: !!routeId },
  });

  // 현재 선택된 노드의 라우트 목록 (Self-ref FK select용)
  const watchedNodeId = Form.useWatch('nodeId', form);
  const watchedAniType = Form.useWatch('aniType', form);
  const watchedWorktimeOpt = Form.useWatch('worktimeOpt', form);
  const watchedIeWorktimeId = Form.useWatch('ieWorktimeId', form);
  const effectiveNodeId = watchedNodeId ?? defaultNodeId ?? routeDetail?.nodeId;
  const { data: nodeRoutes = [] } = useGetRoutesByNode(effectiveNodeId);

  // 동적 콤보 옵션 (노드 선택 시 갱신)
  // SWAT: cbCreate('dodtrans', search1=nodeId) / cbCreate('worktime', nodeId) / cbCreate('ment', nodeId&tenantId=0)
  const { data: dodTransOptions = [] } = useGetDodTransOptions(effectiveNodeId);
  const { data: worktimeOptions = [] } = useGetWorktimeOptions(effectiveNodeId);
  const { data: mentOptions = [] } = useGetMentOptions(effectiveNodeId);

  // Self-ref 라우트 옵션 (자기 자신 제외)
  const routeSelectOptions = nodeRoutes.filter((r) => r.routeId !== routeId).map((r) => ({ label: r.routeName, value: r.routeId }));

  // 조건부 필드 표시 여부
  const isLocalNumRequired = watchedAniType === 2;
  const isWorktimeSet = !!watchedIeWorktimeId;
  const showWorktimeMent = watchedWorktimeOpt === 2 || watchedWorktimeOpt === 4;
  const showWorktimeRoute = watchedWorktimeOpt === 3 || watchedWorktimeOpt === 4;

  // ─── 업무시간 미지정 시 연관 필드 초기화 (SWAT setUseWorktime(false) 정합) ──
  useEffect(() => {
    if (!isWorktimeSet) {
      form.setFieldsValue({
        worktimeOpt: undefined,
        worktimeMentId: undefined,
        worktimeRouteId: undefined,
        transNum: undefined,
      });
    }
  }, [isWorktimeSet, form]);

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (routeDetail && isEditMode) {
      const vals: Partial<RouteCreateRequest> = {
        routeName: routeDetail.routeName,
        routeType: Number(routeDetail.routeType),
        nodeId: routeDetail.nodeId,
        portNo: routeDetail.portNo,
        editOpt: Number(routeDetail.editOpt),
        delCount: routeDetail.delCount,
        addDigit: routeDetail.addDigit,
        dodTransId: routeDetail.dodTransId,
        aniType: Number(routeDetail.aniType),
        aniNo: routeDetail.aniNo ?? '',
        regionNo: routeDetail.regionNo,
        localNum: routeDetail.localNum,
        regionUseYn: routeDetail.regionUseYn,
        chrgType: Number(routeDetail.chrgType),
        chrgNo: routeDetail.chrgNo,
        ringbacktoneYn: routeDetail.ringbacktoneYn,
        routeBlockYn: routeDetail.routeBlockYn,
        busyRouteId: routeDetail.busyRouteId,
        blockRouteId: routeDetail.blockRouteId,
        ieWorktimeId: routeDetail.ieWorktimeId,
        worktimeRouteId: routeDetail.worktimeRouteId,
        worktimeOpt: Number(routeDetail.worktimeOpt),
        transNum: routeDetail.transNum,
        worktimeMentId: routeDetail.worktimeMentId,
        vendorAuthnumYn: routeDetail.vendorAuthnumYn,
        callFailRetryYn: routeDetail.callFailRetryYn,
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [routeDetail, isEditMode, form]);

  // ─── Set default nodeId ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode && defaultNodeId) {
      form.setFieldsValue({ nodeId: defaultNodeId });
    }
  }, [isEditMode, defaultNodeId, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createRoute, isPending: isCreating } = useCreateRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('라우트가 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: routeQueryKeys.getRoutes().queryKey });
        navigate('/ipron/line/route');
      },
    },
  });

  const { mutate: updateRoute, isPending: isUpdating } = useUpdateRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('라우트가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: routeQueryKeys.getRoutes().queryKey });
        navigate('/ipron/line/route');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const nodeOptions = nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));

  const steps = ROUTE_FORM_STEPS.map((s) => ({ title: s.title }));
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    try {
      // Tab 1 validation: 기본정보
      const fieldsToValidate: string[] = ['routeName', 'nodeId', 'routeType', 'aniType', 'aniNo', 'portNo'];
      if (isLocalNumRequired) {
        fieldsToValidate.push('localNum');
      }
      await form.validateFields(fieldsToValidate);
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch {
      /* validation failed */
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: RouteCreateRequest = {
        routeName: values.routeName,
        routeType: values.routeType,
        nodeId: values.nodeId,
        portNo: values.portNo ?? 5060,
        editOpt: values.editOpt ?? 1,
        delCount: values.delCount ?? 0,
        addDigit: values.addDigit || null,
        dodTransId: values.dodTransId || null,
        aniType: values.aniType,
        aniNo: values.aniNo,
        regionNo: values.regionNo || null,
        localNum: values.localNum || null,
        regionUseYn: values.regionUseYn ?? 0,
        chrgType: values.chrgType ?? 0,
        chrgNo: values.chrgNo || null,
        ringbacktoneYn: values.ringbacktoneYn ?? 0,
        routeBlockYn: values.routeBlockYn ?? 0,
        busyRouteId: values.busyRouteId || null,
        blockRouteId: values.blockRouteId || null,
        ieWorktimeId: values.ieWorktimeId || null,
        worktimeRouteId: values.worktimeRouteId || null,
        worktimeOpt: values.worktimeOpt ?? 1,
        transNum: values.transNum || null,
        worktimeMentId: values.worktimeMentId || null,
        vendorAuthnumYn: values.vendorAuthnumYn ?? 0,
        callFailRetryYn: values.callFailRetryYn ?? 0,
      };

      if (isEditMode && routeId) {
        updateRoute({ id: routeId, data: payload });
      } else {
        createRoute(payload);
      }
    } catch {
      setCurrentStep(0);
    }
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '회선관리', path: '/ipron/line' },
      { title: '발신라우트', path: '/ipron/line/route' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && id ? `/ipron/line/route/${id}` : '/ipron/line/route/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = formValues ?? ROUTE_INITIAL_VALUES;
    const nodeName = nodes.find((n) => n.nodeId === values.nodeId)?.nodeName ?? '-';

    return (
      <div className="space-y-4 text-sm">
        {/* 1. 기본정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본정보</div>
          <SummaryRow label="라우트명" value={displayValue(values.routeName)} />
          <SummaryRow label="노드" value={displayValue(nodeName)} />
          <SummaryRow label="라우트 분배방식" value={displayValue(ROUTE_TYPE_LABELS[values.routeType as string] ?? values.routeType)} />
          <SummaryRow label="호 실패시 재시도" value={displayValue(values.callFailRetryYn === 1 ? '설정' : '해제')} />
          <SummaryRow label="ANI TYPE" value={displayValue(ANI_TYPE_LABELS[values.aniType as string] ?? values.aniType)} />
          <SummaryRow label="대표번호" value={displayValue(values.aniNo)} />
          <SummaryRow label="지역번호 사용유무" value={displayValue(values.regionUseYn === 1 ? '설정' : '해제')} />
          {values.regionUseYn === 1 && (
            <>
              <SummaryRow label="지역번호" value={displayValue(values.regionNo)} />
              <SummaryRow label="국번호" value={displayValue(values.localNum)} />
            </>
          )}
          <SummaryRow label="과금 TYPE" value={displayValue(CHARGE_TYPE_LABELS[values.chrgType as string] ?? values.chrgType)} />
          <SummaryRow label="대표과금번호" value={displayValue(values.chrgNo)} />
          <SummaryRow label="포트번호" value={displayValue(values.portNo ?? 5060)} />
          <SummaryRow label="통신사인증번호" value={displayValue(values.vendorAuthnumYn === 1 ? '설정' : '해제')} />
        </div>

        <Divider className="!my-3" />

        {/* 2. 부가정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. 부가정보</div>
          <SummaryRow label="링백톤사용" value={displayValue(values.ringbacktoneYn === 1 ? '설정' : '해제')} />
          <SummaryRow label="블록사용" value={displayValue(values.routeBlockYn === 1 ? '설정' : '해제')} />
          <SummaryRow label="Busy 우회 라우트" value={displayValue(nodeRoutes.find((r) => r.routeId === values.busyRouteId)?.routeName ?? values.busyRouteId)} />
          <SummaryRow label="블럭시 우회 라우트" value={displayValue(nodeRoutes.find((r) => r.routeId === values.blockRouteId)?.routeName ?? values.blockRouteId)} />
          <SummaryRow label="편집 Digit수" value={displayValue(values.delCount)} />
          <SummaryRow label="편집 Digit" value={displayValue(values.addDigit)} />
          <SummaryRow label="편집 옵션" value={displayValue(EDIT_OPT_LABELS[values.editOpt as string] ?? values.editOpt)} />
          <SummaryRow label="업무시간 외 제어" value={displayValue(WORKTIME_OPT_LABELS[values.worktimeOpt as string] ?? values.worktimeOpt)} />
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/line/route')}>
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
                <Form form={form} initialValues={ROUTE_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Tab 1: 기본정보 ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">기본정보</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="routeName"
                          label="라우트명"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '라우트명은 필수입니다' },
                            { max: 100, message: '100자 이내' },
                          ]}
                        >
                          <Input placeholder="라우트명" maxLength={100} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
                          <Select options={nodeOptions} placeholder="노드 선택" disabled={isEditMode} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="routeType" label="라우트 분배방식" required rules={[{ required: true, message: '분배방식은 필수입니다' }]}>
                          <Select options={[...ROUTE_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="callFailRetryYn"
                          label="호 실패시 재시도"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="dodTransId" label="발신 번호변환">
                          <Select allowClear placeholder="미지정" options={dodTransOptions.map((o) => ({ label: o.dodTransName, value: o.dodTransId }))} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="portNo"
                          label="포트번호"
                          required
                          rules={[
                            { required: true, message: '포트번호는 필수입니다' },
                            { type: 'number', min: 1, max: 65535, message: '1~65535 범위' },
                          ]}
                        >
                          <InputNumber min={1} max={65535} className="!w-full" placeholder="5060" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">ANI 번호 설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="aniType" label="ANI TYPE" required rules={[{ required: true, message: 'ANI TYPE은 필수입니다' }]}>
                          <Select options={[...ANI_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="aniNo"
                          label="대표번호"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '대표번호는 필수입니다' },
                            { max: 24, message: '24자 이내' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="대표번호" maxLength={24} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="regionUseYn"
                          label="지역번호 사용유무"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="regionNo"
                          label="지역번호"
                          rules={[
                            { max: 8, message: '8자 이내' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="지역번호" maxLength={8} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="localNum"
                          label="국번호"
                          required={isLocalNumRequired}
                          rules={[
                            { required: isLocalNumRequired, message: 'ANI TYPE이 개별지정번호일 때 국번호는 필수입니다' },
                            { max: 8, message: '8자 이내' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="국번호" maxLength={8} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">발신번호 과금 설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="chrgType" label="과금 TYPE">
                          <Select options={[...CHARGE_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="chrgNo"
                          label="대표과금번호"
                          rules={[
                            { max: 24, message: '24자 이내' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="대표과금번호" maxLength={24} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="vendorAuthnumYn"
                          label="통신사인증번호"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Tab 2: 부가정보 ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">부가정보</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="ringbacktoneYn"
                          label="링백톤사용"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="routeBlockYn"
                          label="블록사용"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="busyRouteId" label="Busy 우회 라우트">
                          <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="blockRouteId" label="블럭시 우회 라우트">
                          <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">DOD 발신 번호 편집</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="delCount"
                          label="편집 Digit수"
                          required
                          rules={[
                            { required: true, message: '편집 Digit수는 필수입니다' },
                            { type: 'number', min: -1, message: '-1 이상' },
                          ]}
                        >
                          <InputNumber min={-1} className="!w-full" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="addDigit"
                          label="편집 Digit"
                          rules={[
                            { max: 48, message: '48자 이내' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="편집 Digit" maxLength={48} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="editOpt" label="편집 옵션" required rules={[{ required: true, message: '편집 옵션은 필수입니다' }]}>
                          <Select options={[...EDIT_OPT_OPTIONS]} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">업무시간 설정</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="ieWorktimeId" label="업무시간 설정">
                          <Select allowClear placeholder="미지정" options={worktimeOptions.map((o) => ({ label: o.worktimeName, value: o.worktimeId }))} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="worktimeOpt"
                          label="업무시간 외 제어"
                          required={isWorktimeSet}
                          rules={isWorktimeSet ? [{ required: true, message: '업무시간 외 제어는 필수입니다' }] : []}
                        >
                          <Select options={[...WORKTIME_OPT_OPTIONS]} disabled={!isWorktimeSet} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      {showWorktimeMent && (
                        <Col span={8}>
                          <Form.Item name="worktimeMentId" label="업무시간 외 안내멘트" required rules={[{ required: true, message: '업무시간 외 안내멘트를 선택하십시오.' }]}>
                            <Select allowClear placeholder="선택" options={mentOptions.map((o) => ({ label: o.name, value: o.id }))} />
                          </Form.Item>
                        </Col>
                      )}
                      {showWorktimeRoute && (
                        <Col span={8}>
                          <Form.Item name="worktimeRouteId" label="업무시간 외 우회라우트" required rules={[{ required: true, message: '업무시간 외 우회라우트를 선택하십시오.' }]}>
                            <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
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
