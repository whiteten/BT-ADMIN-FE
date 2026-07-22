/**
 * DID라우트 등록/수정 -- 아코디언 + 인라인 요약 칩 (국선관리 EndpointForm 패턴 이식)
 * AS-IS IPR20S1036.jsp 필드/검증 규칙을 그대로 유지하되, 3단계 위저드를 없애고
 * 필수값을 전부 "기본정보" 한 섹션(펼침)에 통합, 나머지는 접힌 섹션으로 배치.
 *  - 접힌 섹션 헤더: 주요 선택필드의 현재값을 pill 로 미리보기 (+N 오버플로우)
 *  - 기본정보 헤더 우측: 실시간 "필수 N개 미입력" 배지 (다 채우면 "완료")
 *  - 우측 요약 패널: 상단 "필수 입력 N/M" 진행바 + 섹션별 값 나열 (미입력 빨강)
 * 접이식 UI는 antd Collapse 대신 브랜드 톤 커스텀 카드(FormSection)로 구현.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { ChevronDown } from 'lucide-react';
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
import { BLOCK_CONTROL_LABELS, BLOCK_CONTROL_OPTIONS, DID_ROUTE_INITIAL_VALUES, type DidRouteCreateRequest } from '../../features/did-route/types';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../features/did-trans/components/NumPatternDrawer';
import { useGetMentOptions } from '../../features/ment-mgmt/hooks/useMentQueries';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// ─── 섹션 키 + 필드 소속 매핑 ────────────────────────────────────────────────
// 검증 실패 시 해당 필드가 속한 섹션을 자동으로 펼치기 위한 역방향 맵의 원본.
const SECTION_KEYS = {
  BASIC: 'basic', // 기본정보 (필수 전부 + ANI/DNIS)
  EXTRA: 'extra', // 부가 설정 (DN그룹 / 업무시간 / 익명통화 차단 / 비고)
  ROUTING: 'routing', // 라우팅 설정 (업무시간 내/외 라우트+DN번호)
  BLOCK: 'block', // 블록 설정
} as const;

// 필수값은 전부 basic 에. 나머지 선택 필드는 성격별 접힌 섹션에.
const SECTION_FIELDS: Record<string, string[]> = {
  [SECTION_KEYS.BASIC]: ['didrouteName', 'nodeId', 'priority', 'aniPattern', 'dnisPattern'],
  [SECTION_KEYS.EXTRA]: ['dnGroupId', 'ieWorktimeId', 'anonyCallBlock', 'didrouteDesc'],
  [SECTION_KEYS.ROUTING]: ['routeId', 'dnNo', 'afterRouteId', 'afterDnNo'],
  [SECTION_KEYS.BLOCK]: ['blockYn', 'blockControl', 'blockMentId', 'blockRoutingDnis', 'blockRouteId'],
};

// 필드명 → 섹션키
const FIELD_SECTION: Record<string, string> = Object.entries(SECTION_FIELDS).reduce<Record<string, string>>((acc, [section, fields]) => {
  fields.forEach((f) => {
    acc[f] = section;
  });
  return acc;
}, {});

// 진행바/미입력 배지 산정 기준 = 기본정보의 antd 필수 필드 3개.
// ANI/DNIS 는 "둘 중 하나 필수" 교차검증이라 개별 필수 카운트에서 제외(제출 시 검증 + 자동 펼침으로 처리).
const REQUIRED_BASE_FIELDS = ['didrouteName', 'nodeId', 'priority'];

// 진입 시 펼쳐두는 필수 섹션 (기본정보만)
const DEFAULT_ACTIVE_KEYS = [SECTION_KEYS.BASIC];

// 헤더 pill 최대 표시 개수 (초과분은 +N)
const MAX_HEADER_PILLS = 4;

export default function DidRouteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>([...DEFAULT_ACTIVE_KEYS]);

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
  const { data: allNodes = [] } = useGetNodes();
  // 노드 셀렉트 스코프: 신규 등록은 일반 모드=로그인 테넌트 노드/운영자=전체, 수정은 기존 노드 표시 위해 전체.
  const scopedNodes = useScopedNodes(allNodes);
  const nodes = isEditMode ? allNodes : scopedNodes;
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

  // ─── Select options (Form.Item + pill/summary 공용) ──────────────────────────
  const nodeOptions = nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));
  const routeSelectOptions = nodeRoutes.map((r) => ({ label: r.routeName, value: r.routeId }));
  const dnGroupSelectOptions = [{ label: '사용안함', value: 0 }, ...(Array.isArray(dnGroupOptions) ? dnGroupOptions : []).map((g) => ({ label: g.name, value: g.id }))];
  const worktimeSelectOptions = [{ label: '없음', value: 0 }, ...worktimeOptions.map((w) => ({ label: w.name, value: w.id }))];
  const mentSelectOptions = [{ label: '없음', value: 0 }, ...mentOptions.map((m) => ({ label: m.fileName ? `${m.name} (${m.fileName})` : m.name, value: m.id }))];

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

  // ─── 현재 폼 값 (요약 패널 · 헤더 pill 용, 변경 전에는 초기값) ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValues: any = formValues ?? { ...DID_ROUTE_INITIAL_VALUES, ...(defaultNodeId ? { nodeId: defaultNodeId } : {}) };

  // 값 존재 여부 (0/false 는 채워진 값으로 취급)
  const isFilled = (v: unknown) => v !== null && v !== undefined && v !== '';

  // ─── 필수 입력 진행률 ───────────────────────────────────────────────────────
  const totalRequired = REQUIRED_BASE_FIELDS.length;
  const filledRequired = REQUIRED_BASE_FIELDS.filter((f) => isFilled(currentValues[f])).length;
  const requiredMissingCount = totalRequired - filledRequired;
  const progressPct = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 0;

  // ─── 섹션 펼침/접힘 헬퍼 ──────────────────────────────────────────────────
  const expandSections = (keys: string[]) => {
    setActiveKeys((prev) => Array.from(new Set([...prev, ...keys])));
  };

  const toggleSection = (key: string) => {
    setActiveKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // ─── 헤더 요약 pill / 요약 라벨 헬퍼 ──────────────────────────────────────────
  const optLabel = (options: readonly { label: string; value: string | number }[], val: unknown, fallback: string) => {
    const found = options.find((o) => String(o.value) === String(val));
    return found ? found.label : fallback;
  };

  const sectionPills = (key: string): string[] => {
    const v = currentValues;
    if (key === SECTION_KEYS.EXTRA) {
      return [
        `DN그룹 ${optLabel(dnGroupSelectOptions, v.dnGroupId, '사용안함')}`,
        `업무시간 ${optLabel(worktimeSelectOptions, v.ieWorktimeId, '없음')}`,
        `익명통화 차단 ${v.anonyCallBlock === 1 ? '설정' : '해제'}`,
      ];
    }
    if (key === SECTION_KEYS.ROUTING) {
      return [`업무 내 라우트 ${optLabel(routeSelectOptions, v.routeId, '없음')}`, `업무 외 라우트 ${optLabel(routeSelectOptions, v.afterRouteId, '없음')}`];
    }
    if (key === SECTION_KEYS.BLOCK) {
      return [`블록 ${v.blockYn === 1 ? '설정' : '해제'}`, `블록 제어 ${optLabel(BLOCK_CONTROL_OPTIONS, v.blockControl, '정상종료')}`];
    }
    return [];
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  // onFinish: antd 필수/패턴 검증 통과 후 비즈니스 교차 검증(ANI/DNIS 택1) + payload 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinish = (values: any) => {
    // SWAT IPR20S1036: ANI 패턴 또는 DNIS 패턴 중 하나 이상 필수
    if (!values.aniPattern && !values.dnisPattern) {
      toast.error('ANI 패턴 또는 DNIS 패턴 중 하나 이상 입력해야 합니다');
      expandSections([SECTION_KEYS.BASIC]);
      return;
    }

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
  };

  // onFinishFailed: 검증 실패한 필드가 속한 섹션을 자동으로 펼쳐 에러를 노출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinishFailed = (errorInfo: any) => {
    const failedFields = errorInfo?.errorFields ?? [];
    const sections = new Set<string>();
    failedFields.forEach((f: { name: (string | number)[] }) => {
      const fieldName = String(f.name?.[0] ?? '');
      const section = FIELD_SECTION[fieldName];
      if (section) sections.add(section);
    });
    if (sections.size > 0) expandSections(Array.from(sections));
    const firstError = failedFields[0]?.errors?.[0];
    toast.error(firstError ?? '필수 입력값을 확인해주세요');
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
      { title: '회선관리' },
      { title: '호 라우팅' },
      { title: 'DID라우트관리', path: '/ipron/line/did-route' },
      {
        title: isEditMode ? 'DID라우트 수정' : 'DID라우트 등록',
        path: isEditMode && id ? `/ipron/line/did-route/form/${id}` : '/ipron/line/did-route/form',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  // ─── Switch helpers ─────────────────────────────────────────────────────────
  const switchProps = {
    valuePropName: 'checked' as const,
    getValueFromEvent: (checked: boolean) => (checked ? 1 : 0),
    getValueProps: (value: number) => ({ checked: value === 1 }),
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  섹션 렌더 함수 (각 FormSection 카드 children)
  // ══════════════════════════════════════════════════════════════════════════

  // 기본정보 — 필수값(라우트명/노드/우선순위) + ANI/DNIS(택1 필수)
  function renderBasicSection() {
    return (
      <>
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
          <Col span={6}>
            <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
              <Select options={nodeOptions} placeholder="노드 선택" disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={4}>
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
      </>
    );
  }

  // 부가 설정 — DN그룹 / 업무시간 설정 / 익명통화 차단 / 비고
  function renderExtraSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            {/* SWAT IPR20S1036.jsp:14: poDnGroupId combotree (treeDnGroupByTenantId.do)
                onChange 시 선택 노드의 tenantId 추출 → 업무시간 재조회 */}
            <Form.Item name="dnGroupId" label="DN그룹">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="DN그룹 선택"
                options={dnGroupSelectOptions}
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
          <Col span={6}>
            {/* SWAT IPR20S1036.jsp:385: cbCreate('#poIeWorktimeId', 'worktime', 'tenantId='+tenantId)
                DN그룹 onChange 후 tenantId 기준 재조회 */}
            <Form.Item name="ieWorktimeId" label="업무시간 설정">
              <Select allowClear showSearch optionFilterProp="label" placeholder="업무시간 선택" options={worktimeSelectOptions} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="anonyCallBlock" label="익명통화 차단" {...switchProps}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={16}>
            <Form.Item name="didrouteDesc" label="비고" rules={[{ max: 256, message: '256자 이내여야 합니다' }]}>
              <Input.TextArea placeholder="비고" maxLength={256} rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // 라우팅 설정 — 업무시간 내/외 라우트 + DN번호
  function renderRoutingSection() {
    return (
      <>
        <h4 className="text-xs text-gray-400 mt-1 mb-2 pb-1 border-b border-gray-100">업무시간 내</h4>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="routeId" label="라우트">
              <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
            </Form.Item>
          </Col>
          <Col span={6}>
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

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">업무시간 외</h4>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="afterRouteId" label="라우트">
              <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
            </Form.Item>
          </Col>
          <Col span={6}>
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
      </>
    );
  }

  // 블록 설정 — 블록여부/제어 + (조건부) 블록멘트 / 우회 DNIS / 우회 라우트
  function renderBlockSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name="blockYn" label="블록 여부" {...switchProps}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="blockControl" label="블록 제어">
              <Select options={[...BLOCK_CONTROL_OPTIONS]} disabled={!watchedBlockYn} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          {showBlockMent && watchedBlockYn === 1 && (
            <Col span={6}>
              <Form.Item name="blockMentId" label="블록 멘트">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={effectiveNodeId ? '멘트 선택' : '노드 선택 후 조회'}
                  disabled={!effectiveNodeId}
                  options={mentSelectOptions}
                />
              </Form.Item>
            </Col>
          )}
          {showBlockBypass && watchedBlockYn === 1 && (
            <>
              <Col span={6}>
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
              <Col span={6}>
                <Form.Item name="blockRouteId" label="우회 라우트">
                  <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="라우트 선택" />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </>
    );
  }

  // ─── 섹션 구성 (기본정보=펼침·필수 / 나머지=접힘·요약 pill) ────────────────────
  // content 는 항상 렌더 → 접힌 섹션 Form.Item 도 마운트 유지 → 값 등록/검증 정상 동작
  const sections = [
    { key: SECTION_KEYS.BASIC, title: '기본정보', required: true, content: renderBasicSection() },
    { key: SECTION_KEYS.EXTRA, title: '부가 설정', required: false, content: renderExtraSection() },
    { key: SECTION_KEYS.ROUTING, title: '라우팅 설정', required: false, content: renderRoutingSection() },
    { key: SECTION_KEYS.BLOCK, title: '블록 설정', required: false, content: renderBlockSection() },
  ];

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
        <Col>
          <Button variant="solid" color="primary" onClick={() => form.submit()} loading={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </Col>
      </Row>
    );
  }

  // ─── Summary Panel ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = currentValues;
    const missing = (key: string) => !isFilled(values[key]);
    const routeLabel = (rid: unknown) => nodeRoutes.find((r) => r.routeId === rid)?.routeName;
    const basicTag =
      requiredMissingCount > 0 ? (
        <span className="text-xs font-semibold text-red-500">필수 {requiredMissingCount}개 미입력</span>
      ) : (
        <span className="text-xs font-semibold text-emerald-600">입력 완료</span>
      );
    const optionalTag = <span className="text-xs text-gray-300">선택 · 기본값</span>;

    return (
      <div className="space-y-4 text-sm">
        {/* 필수 입력 진행바 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">필수 입력</span>
            <span className={`text-sm font-semibold ${requiredMissingCount > 0 ? 'text-gray-800' : 'text-emerald-600'}`}>
              {filledRequired} / {totalRequired}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${requiredMissingCount > 0 ? 'bg-[#405189]' : 'bg-emerald-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 기본정보 (필수) */}
        <div className="space-y-2">
          <SummaryGroupHeader title="기본정보" tag={basicTag} />
          <SummaryRow label="라우트명" required missing={missing('didrouteName')} value={displayValue(values.didrouteName)} />
          <SummaryRow label="노드" required missing={missing('nodeId')} value={displayValue(nodeOptions.find((n) => n.value === values.nodeId)?.label)} />
          <SummaryRow label="우선순위" required missing={missing('priority')} value={displayValue(values.priority)} />
          <SummaryRow label="ANI 패턴" required value={displayValue(values.aniPattern)} />
          <SummaryRow label="DNIS 패턴" required value={displayValue(values.dnisPattern)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 부가 설정 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="부가 설정" tag={optionalTag} />
          <SummaryRow label="DN그룹" value={displayValue(dnGroupSelectOptions.find((g) => g.value === values.dnGroupId)?.label)} />
          <SummaryRow label="업무시간 설정" value={displayValue(worktimeSelectOptions.find((w) => w.value === values.ieWorktimeId)?.label)} />
          <SummaryRow label="익명통화 차단" value={values.anonyCallBlock === 1 ? '설정' : '해제'} />
          <SummaryRow label="비고" value={displayValue(values.didrouteDesc)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 라우팅 설정 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="라우팅 설정" tag={optionalTag} />
          <div className="text-xs font-medium text-gray-500 mb-1">업무시간 내</div>
          <SummaryRow label="라우트" value={displayValue(routeLabel(values.routeId))} />
          <SummaryRow label="DN번호" value={displayValue(values.dnNo)} />
          <div className="text-xs font-medium text-gray-500 mt-2 mb-1">업무시간 외</div>
          <SummaryRow label="라우트" value={displayValue(routeLabel(values.afterRouteId))} />
          <SummaryRow label="DN번호" value={displayValue(values.afterDnNo)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 블록 설정 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="블록 설정" tag={optionalTag} />
          <SummaryRow label="블록 여부" value={values.blockYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="블록 제어" value={displayValue(BLOCK_CONTROL_LABELS[values.blockControl as number] ?? values.blockControl)} />
          {(values.blockControl === 1 || values.blockControl === 3) && (
            <SummaryRow label="블록 멘트" value={displayValue(mentSelectOptions.find((m) => m.value === values.blockMentId)?.label)} />
          )}
          {(values.blockControl === 2 || values.blockControl === 3) && (
            <>
              <SummaryRow label="우회 DNIS" value={displayValue(values.blockRoutingDnis)} />
              <SummaryRow label="우회 라우트" value={displayValue(routeLabel(values.blockRouteId))} />
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
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
              <div className="w-full flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-7 pb-4">
                <Form
                  form={form}
                  initialValues={{ ...DID_ROUTE_INITIAL_VALUES, ...(defaultNodeId ? { nodeId: defaultNodeId } : {}) }}
                  layout="vertical"
                  onValuesChange={(_, allValues) => setFormValues(allValues)}
                  onFinish={handleFinish}
                  onFinishFailed={handleFinishFailed}
                >
                  <div className="flex flex-col gap-3 pb-2">
                    {sections.map((s) => (
                      <FormSection
                        key={s.key}
                        sectionKey={s.key}
                        title={s.title}
                        required={s.required}
                        open={activeKeys.includes(s.key)}
                        onToggle={toggleSection}
                        missingCount={s.required ? requiredMissingCount : 0}
                        pills={s.required ? [] : sectionPills(s.key)}
                      >
                        {s.content}
                      </FormSection>
                    ))}
                  </div>
                </Form>
              </div>
              <div className="w-full px-7 py-5">{renderFooter()}</div>
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

// ─── FormSection — 커스텀 아코디언 카드 (미니멀·무채색 톤) ───────────────────────
// 모든 섹션 = 흰 카드 + 옅은 그레이 보더. 아이콘 칩 없이 chevron + 섹션명 + 배지만.
// 필수 섹션: 제목 옆 작은 옅은 "필수" 배지 + 우측 "필수 N개 미입력"(옅은 amber) 배지.
// 선택 섹션: (접힘 시) 헤더에 현재값 요약 pill(+N) 미리보기 + 우측 "선택 · 기본값" 힌트.
// children 은 항상 마운트, grid-rows 트랜지션으로 부드럽게 펼침/접힘 (Form 등록 유지).
interface FormSectionProps {
  sectionKey: string;
  title: string;
  open: boolean;
  onToggle: (key: string) => void;
  required?: boolean;
  missingCount?: number;
  pills?: string[];
  children: React.ReactNode;
}

function FormSection({ sectionKey, title, open, onToggle, required = false, missingCount = 0, pills = [], children }: FormSectionProps) {
  const gridClass = open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0';
  const showPills = !required && !open && pills.length > 0;
  const visiblePills = pills.slice(0, MAX_HEADER_PILLS);
  const overflowCount = pills.length - visiblePills.length;

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={open}
        className="flex items-center gap-2.5 w-full px-4 py-3 text-left rounded-lg hover:bg-gray-50/60 transition-colors"
      >
        <ChevronDown className={`size-4 text-gray-400 shrink-0 transition-transform duration-300 ${open ? '' : '-rotate-90'}`} />
        <span className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-gray-700 text-[15px]">{title}</span>
          {required && <span className="text-[11px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">필수</span>}
        </span>

        {/* 접힌 선택 섹션: 현재값 요약 pill 미리보기 */}
        {showPills && (
          <span className="hidden lg:flex items-center gap-1.5 min-w-0 overflow-hidden">
            {visiblePills.map((p) => (
              <span key={p} className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                {p}
              </span>
            ))}
            {overflowCount > 0 && <span className="text-[11px] text-gray-400 whitespace-nowrap">+{overflowCount}</span>}
          </span>
        )}

        {/* 우측: 필수 섹션=미입력 배지 / 선택 섹션=중립 힌트 */}
        <span className="ml-auto shrink-0 pl-3">{required ? <SectionMissingBadge count={missingCount} /> : <span className="text-xs text-gray-400">선택 · 기본값</span>}</span>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${gridClass}`}>
        <div className="overflow-hidden min-h-0">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

// 필수 섹션 헤더 우측 배지 — 미입력 있으면 옅은 amber, 다 채우면 옅은 emerald "완료"
function SectionMissingBadge({ count }: { count: number }) {
  if (count > 0) {
    return <span className="text-xs font-medium text-amber-600 bg-amber-50 rounded px-2 py-0.5 whitespace-nowrap">필수 {count}개 미입력</span>;
  }
  return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded px-2 py-0.5 whitespace-nowrap">완료</span>;
}

// ─── Summary Group Header ──────────────────────────────────────────────────────
function SummaryGroupHeader({ title, tag }: { title: string; tag?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</div>
      {tag}
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
// required: 해당 Form.Item 이 필수인 항목 (조건부 필수는 그 조건일 때만 required 전달)
// missing: 필수인데 아직 값이 없는 항목 → 빨간 "미입력" 노출
function SummaryRow({ label, value, required = false, missing = false }: { label: string; value: React.ReactNode; required?: boolean; missing?: boolean }) {
  const isMissing = required && missing;
  const valueClass = isMissing ? 'text-red-500 font-medium flex-1 text-right' : 'text-gray-800 font-medium flex-1 text-right';

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[140px] shrink-0">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className={valueClass}>{isMissing ? '미입력' : value}</span>
    </div>
  );
}
