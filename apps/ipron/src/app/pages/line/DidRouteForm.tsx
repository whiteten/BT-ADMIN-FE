/**
 * DID라우트 등록/수정 -- Steps form page
 * Step 1: 기본정보 (라우트명, 노드, ANI패턴, DNIS패턴, 우선순위, DN그룹, 업무시간, 익명통화차단)
 * Step 2: 라우팅설정 (업무시간 내: 라우트+DN번호, 업무시간 외: 라우트+DN번호)
 * Step 3: 블록설정 (블록여부, 블록제어, 블록멘트, 우회DNIS, 우회라우트)
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, Input, InputNumber, Row, Select, Steps, Switch } from 'antd';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import {
  didRouteQueryKeys,
  useCreateDidRoute,
  useDeleteDidRoute,
  useGetDidRouteDetail,
  useGetDnGroupOptions,
  useGetNodes,
  useGetRoutesByNode,
  useGetWorktimeOptions,
  useUpdateDidRoute,
} from '../../features/did-route/hooks/useDidRouteQueries';
import { BLOCK_CONTROL_LABELS, BLOCK_CONTROL_OPTIONS, DID_ROUTE_FORM_STEPS, DID_ROUTE_INITIAL_VALUES, type DidRouteCreateRequest } from '../../features/did-route/types';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../features/did-trans/components/NumPatternDrawer';
import { useGetMentOptions } from '../../features/ment-mgmt/hooks/useMentQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function DidRouteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const aniPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const dnisPatternDrawerRef = useRef<NumPatternDrawerRef>(null);

  const isEditMode = !!id;
  const didrouteId = id ? Number(id) : null;

  // DN그룹 선택 시 tenantId 추출 — 업무시간 재조회에 사용
  // SWAT IPR20S1036.jsp:411: selectedNode.id==="0" → tenantId=1, 그 외 → selectedNode.tenantId
  const [dnGroupTenantId, setDnGroupTenantId] = useState<number | null>(null);

  // 세션 테넌트 ID — JWT에서 추출 (SWAT sessionScope.tenantId 정합)
  const sessionTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();
  const { data: routeDetail, isFetching } = useGetDidRouteDetail({
    params: didrouteId ? { id: didrouteId } : undefined,
    queryOptions: { enabled: !!didrouteId },
  });

  // Watch fields for conditional rendering
  const watchedNodeId = Form.useWatch('nodeId', form);
  const watchedBlockYn = Form.useWatch('blockYn', form);
  const watchedBlockControl = Form.useWatch('blockControl', form);

  const effectiveNodeId = watchedNodeId ?? defaultNodeId ?? routeDetail?.nodeId;
  const { data: nodeRoutes = [] } = useGetRoutesByNode(effectiveNodeId);

  // DN그룹 콤보 — 세션 테넌트 기준 조회
  // SWAT: treeDnGroupByTenantId.do (IPR20S1036.jsp:14) — sessionScope.tenantId
  const { data: dnGroupOptions = [] } = useGetDnGroupOptions(sessionTenantId);

  // 업무시간 콤보 — DN그룹 선택 시 해당 그룹의 tenantId 로 재조회
  // SWAT: common.selWorktimeList (IPR20S1036.jsp:385)
  const effectiveWorktimeTenantId = dnGroupTenantId ?? sessionTenantId ?? null;
  const { data: worktimeOptions = [] } = useGetWorktimeOptions(effectiveWorktimeTenantId);

  // 블록 멘트 콤보 — SWAT: type="ment" params="&nodeId={nodeId}&tenantId=0"
  // BFF flow: ipron-ment-options (?nodeId=&tenantId=)
  const { data: mentOptions = [] } = useGetMentOptions(effectiveNodeId, undefined);

  // Route select options
  const routeSelectOptions = nodeRoutes.map((r) => ({ label: r.routeName, value: r.routeId }));

  // Block control conditional fields
  const showBlockMent = watchedBlockControl === 1 || watchedBlockControl === 3;
  const showBlockBypass = watchedBlockControl === 2 || watchedBlockControl === 3;

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (routeDetail && isEditMode) {
      const vals: Partial<DidRouteCreateRequest> = {
        didrouteName: routeDetail.didrouteName,
        nodeId: routeDetail.nodeId,
        aniPattern: routeDetail.aniPattern ?? '',
        dnisPattern: routeDetail.dnisPattern ?? '',
        routeId: routeDetail.routeId,
        dnNo: routeDetail.dnNo ?? '',
        priority: routeDetail.priority,
        didrouteDesc: routeDetail.didrouteDesc ?? '',
        dnGroupId: routeDetail.dnGroupId,
        ieWorktimeId: routeDetail.ieWorktimeId,
        anonyCallBlock: routeDetail.anonyCallBlock,
        afterRouteId: routeDetail.afterRouteId,
        afterDnNo: routeDetail.afterDnNo ?? '',
        blockYn: routeDetail.blockYn,
        blockControl: routeDetail.blockControl,
        blockMentId: routeDetail.blockMentId,
        blockRoutingDnis: routeDetail.blockRoutingDnis ?? '',
        blockRouteId: routeDetail.blockRouteId,
      };
      form.setFieldsValue(vals);
      setFormValues(vals);

      // 수정 모드: 저장된 dnGroupId 의 tenantId 복원 → 업무시간 콤보 동기화
      if (routeDetail.dnGroupId && dnGroupOptions.length > 0) {
        const grp = dnGroupOptions.find((g) => g.id === routeDetail.dnGroupId);
        if (grp) setDnGroupTenantId(grp.tenantId);
      }
    }
  }, [routeDetail, isEditMode, form, dnGroupOptions]);

  // ─── Set default nodeId ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode && defaultNodeId) {
      form.setFieldsValue({ nodeId: defaultNodeId });
    }
  }, [isEditMode, defaultNodeId, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createDidRoute, isPending: isCreating } = useCreateDidRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DID라우트가 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: didRouteQueryKeys.getList().queryKey });
        navigate('/ipron/line/did-route');
      },
    },
  });

  const { mutate: updateDidRoute, isPending: isUpdating } = useUpdateDidRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DID라우트가 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: didRouteQueryKeys.getList().queryKey });
        navigate('/ipron/line/did-route');
      },
    },
  });

  const { mutate: deleteDidRoute } = useDeleteDidRoute({
    mutationOptions: {
      onSuccess: () => {
        // SWAT IPR20S1036Controller.java:138: 삭제 성공 후 특수코드 연계 안내
        toast.success('DID라우트가 삭제되었습니다');
        toast.info('삭제된 라우트정보를 가지고 있던 특수코드 정보가 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: didRouteQueryKeys.getList().queryKey });
        navigate('/ipron/line/did-route');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const nodeOptions = nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));

  const steps = DID_ROUTE_FORM_STEPS.map((s) => ({ title: s.title }));
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['didrouteName', 'nodeId', 'priority']);
        // ANI 또는 DNIS 하나 이상 필수
        const aniVal = form.getFieldValue('aniPattern');
        const dnisVal = form.getFieldValue('dnisPattern');
        if (!aniVal && !dnisVal) {
          toast.error('ANI 패턴 또는 DNIS 패턴 중 하나 이상 입력해야 합니다');
          return;
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch {
      /* validation failed */
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: DidRouteCreateRequest = {
        didrouteName: values.didrouteName,
        nodeId: values.nodeId,
        aniPattern: values.aniPattern || null,
        dnisPattern: values.dnisPattern || null,
        routeId: values.routeId || null,
        dnNo: values.dnNo || null,
        priority: values.priority ?? 1,
        didrouteDesc: values.didrouteDesc || null,
        dnGroupId: values.dnGroupId || null,
        ieWorktimeId: values.ieWorktimeId || null,
        anonyCallBlock: values.anonyCallBlock ?? 0,
        afterRouteId: values.afterRouteId || null,
        afterDnNo: values.afterDnNo || null,
        blockYn: values.blockYn ?? 0,
        blockControl: values.blockControl ?? 0,
        blockMentId: values.blockMentId || null,
        blockRoutingDnis: values.blockRoutingDnis || null,
        blockRouteId: values.blockRouteId || null,
      };

      if (isEditMode && didrouteId) {
        updateDidRoute({ id: didrouteId, data: payload });
      } else {
        createDidRoute(payload);
      }
    } catch {
      setCurrentStep(0);
    }
  };

  const handleDeleteConfirm = () => {
    if (!didrouteId) return;
    modal.confirm.execute({
      onOk: () => deleteDidRoute({ id: didrouteId }),
      options: {
        title: 'DID라우트 삭제',
        content: `"${routeDetail?.didrouteName}" DID라우트를 삭제하시겠습니까?`,
      },
    });
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '회선관리', path: '/ipron/line' },
      { title: 'DID라우트관리', path: '/ipron/line/did-route' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && id ? `/ipron/line/did-route/form/${id}` : '/ipron/line/did-route/form',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = formValues ?? DID_ROUTE_INITIAL_VALUES;
    const nodeName = nodes.find((n) => n.nodeId === values.nodeId)?.nodeName ?? '-';
    const routeName = nodeRoutes.find((r) => r.routeId === values.routeId)?.routeName ?? '-';
    const afterRouteName = nodeRoutes.find((r) => r.routeId === values.afterRouteId)?.routeName ?? '-';
    const blockRouteName = nodeRoutes.find((r) => r.routeId === values.blockRouteId)?.routeName ?? '-';

    return (
      <div className="space-y-4 text-sm">
        {/* 1. 기본정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본정보</div>
          <SummaryRow label="라우트명" value={displayValue(values.didrouteName)} required />
          <SummaryRow label="노드" value={displayValue(nodeName)} required />
          <SummaryRow label="ANI 패턴" value={displayValue(values.aniPattern)} required />
          <SummaryRow label="DNIS 패턴" value={displayValue(values.dnisPattern)} required />
          <SummaryRow label="우선순위" value={displayValue(values.priority)} required />
          <SummaryRow label="익명통화 차단" value={displayValue(values.anonyCallBlock === 1 ? '설정' : '해제')} />
        </div>

        <Divider className="!my-3" />

        {/* 2. 라우팅설정 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. 라우팅설정</div>
          <div className="text-xs font-medium text-gray-500 mb-1">업무시간 내</div>
          <SummaryRow label="라우트" value={displayValue(routeName)} />
          <SummaryRow label="DN번호" value={displayValue(values.dnNo)} />
          <div className="text-xs font-medium text-gray-500 mt-2 mb-1">업무시간 외</div>
          <SummaryRow label="라우트" value={displayValue(afterRouteName)} />
          <SummaryRow label="DN번호" value={displayValue(values.afterDnNo)} />
        </div>

        <Divider className="!my-3" />

        {/* 3. 블록설정 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3. 블록설정</div>
          <SummaryRow label="블록 여부" value={displayValue(values.blockYn === 1 ? '설정' : '해제')} />
          <SummaryRow label="블록 제어" value={displayValue(BLOCK_CONTROL_LABELS[values.blockControl as number] ?? values.blockControl)} />
          {(values.blockControl === 2 || values.blockControl === 3) && (
            <>
              <SummaryRow label="우회 DNIS" value={displayValue(values.blockRoutingDnis)} />
              <SummaryRow label="우회 라우트" value={displayValue(blockRouteName)} />
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/line/did-route')}>
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
                <Form form={form} initialValues={DID_ROUTE_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Step 1: 기본정보 ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">기본정보</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="didrouteName"
                          label="라우트명"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '라우트명은 필수입니다' },
                            { max: 100, message: '100자 이내여야 합니다' },
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
                        <Form.Item
                          name="priority"
                          label="우선순위"
                          required
                          rules={[
                            { required: true, message: '우선순위는 필수입니다' },
                            { type: 'number', min: 1, max: 99, message: '1~99 범위여야 합니다' },
                          ]}
                        >
                          <InputNumber min={1} max={99} className="!w-full" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="aniPattern" label="ANI 패턴" required rules={[{ max: 256, message: '256자 이내여야 합니다' }]} tooltip="ANI 또는 DNIS 중 하나 이상 필수">
                          <Input
                            placeholder="ANI 패턴"
                            maxLength={256}
                            addonAfter={
                              <button type="button" className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => aniPatternDrawerRef.current?.open()}>
                                패턴선택
                              </button>
                            }
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="dnisPattern" label="DNIS 패턴" required rules={[{ max: 256, message: '256자 이내여야 합니다' }]} tooltip="ANI 또는 DNIS 중 하나 이상 필수">
                          <Input
                            placeholder="DNIS 패턴"
                            maxLength={256}
                            addonAfter={
                              <button type="button" className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => dnisPatternDrawerRef.current?.open()}>
                                패턴선택
                              </button>
                            }
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        {/* SWAT IPR20S1036.jsp:14: poDnGroupId combotree (treeDnGroupByTenantId.do)
                            onChange 시 선택 노드의 tenantId 추출 → 업무시간 재조회 */}
                        <Form.Item name="dnGroupId" label="DN그룹">
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="DN그룹 선택"
                            options={[{ label: '사용안함', value: 0 }, ...(Array.isArray(dnGroupOptions) ? dnGroupOptions : []).map((g) => ({ label: g.name, value: g.id }))]}
                            onChange={(val: number | null) => {
                              // SWAT IPR20S1036.jsp:411:
                              // selectedNode.id === "0" → tenantId=1(사용안함), 그 외 → selectedNode.tenantId
                              if (val == null || val === 0) {
                                setDnGroupTenantId(1);
                              } else {
                                const grp = dnGroupOptions.find((g) => g.id === val);
                                setDnGroupTenantId(grp?.tenantId ?? 1);
                              }
                              // 업무시간 초기화 (다른 그룹 선택 시 이전 값 클리어)
                              form.setFieldValue('ieWorktimeId', null);
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        {/* SWAT IPR20S1036.jsp:385: cbCreate('#poIeWorktimeId', 'worktime', 'tenantId='+tenantId)
                            DN그룹 onChange 후 tenantId 기준 재조회 */}
                        <Form.Item name="ieWorktimeId" label="업무시간 설정">
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="업무시간 선택"
                            options={[{ label: '없음', value: 0 }, ...worktimeOptions.map((w) => ({ label: w.name, value: w.id }))]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="anonyCallBlock"
                          label="익명통화 차단"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={24}>
                        <Form.Item name="didrouteDesc" label="비고" rules={[{ max: 256, message: '256자 이내여야 합니다' }]}>
                          <Input.TextArea placeholder="비고" maxLength={256} rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Step 2: 라우팅설정 ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">업무시간 내</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="routeId" label="라우트">
                          <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="dnNo"
                          label="DN번호"
                          rules={[
                            { max: 24, message: '24자 이내여야 합니다' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="DN번호" maxLength={24} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">업무시간 외</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="afterRouteId" label="라우트">
                          <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="afterDnNo"
                          label="DN번호"
                          rules={[
                            { max: 24, message: '24자 이내여야 합니다' },
                            { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                          ]}
                        >
                          <Input placeholder="DN번호" maxLength={24} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Step 3: 블록설정 ── */}
                  <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">블록설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="blockYn"
                          label="블록 여부"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(value: number) => ({ checked: value === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="blockControl" label="블록 제어">
                          <Select options={[...BLOCK_CONTROL_OPTIONS]} disabled={!watchedBlockYn} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      {showBlockMent && watchedBlockYn === 1 && (
                        <Col span={8}>
                          <Form.Item name="blockMentId" label="블록 멘트">
                            <Select
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              placeholder={effectiveNodeId ? '멘트 선택' : '노드 선택 후 조회'}
                              disabled={!effectiveNodeId}
                              options={[
                                { label: '없음', value: 0 },
                                ...mentOptions.map((m) => ({
                                  label: m.fileName ? `${m.name} (${m.fileName})` : m.name,
                                  value: m.id,
                                })),
                              ]}
                            />
                          </Form.Item>
                        </Col>
                      )}
                      {showBlockBypass && watchedBlockYn === 1 && (
                        <>
                          <Col span={8}>
                            <Form.Item
                              name="blockRoutingDnis"
                              label="우회 DNIS"
                              rules={[
                                { max: 24, message: '24자 이내여야 합니다' },
                                { pattern: /^[0-9]*$/, message: '숫자만 가능합니다' },
                              ]}
                            >
                              <Input placeholder="우회 DNIS" maxLength={24} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="blockRouteId" label="우회 라우트">
                              <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
                            </Form.Item>
                          </Col>
                        </>
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

      {/* NumPatternDrawer for ANI pattern */}
      <NumPatternDrawer
        ref={aniPatternDrawerRef}
        onSelect={(pattern) => {
          const current = form.getFieldValue('aniPattern') ?? '';
          const newVal = current ? `${current},${pattern.numPattern}` : pattern.numPattern;
          form.setFieldsValue({ aniPattern: newVal });
          setFormValues((prev: Record<string, unknown>) => ({ ...prev, aniPattern: newVal }));
          aniPatternDrawerRef.current?.close();
        }}
      />

      {/* NumPatternDrawer for DNIS pattern */}
      <NumPatternDrawer
        ref={dnisPatternDrawerRef}
        onSelect={(pattern) => {
          const current = form.getFieldValue('dnisPattern') ?? '';
          const newVal = current ? `${current},${pattern.numPattern}` : pattern.numPattern;
          form.setFieldsValue({ dnisPattern: newVal });
          setFormValues((prev: Record<string, unknown>) => ({ ...prev, dnisPattern: newVal }));
          dnisPatternDrawerRef.current?.close();
        }}
      />
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
