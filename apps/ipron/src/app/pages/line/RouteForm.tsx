/**
 * 발신라우트 등록/수정 -- 아코디언 + 인라인 요약 칩 (국선관리 EndpointForm 과 동일 패턴)
 * AS-IS IPR20S1020.jsp 필드/검증 규칙을 그대로 유지하되, 2단계 위저드를 없애고
 * 필수값을 전부 "기본정보" 한 섹션(펼침)에 통합, 나머지는 접힌 섹션으로 배치.
 *  - 접힌 섹션 헤더: 주요 선택필드의 현재값을 pill 로 미리보기 (+N 오버플로우)
 *  - 기본정보 헤더 우측: 실시간 "필수 N개 미입력" 배지 (다 채우면 "완료")
 *  - 우측 요약 패널: 상단 "필수 입력 N/M" 진행바 + 섹션별 값 나열 (미입력 빨강)
 * 접이식 UI는 antd Collapse 대신 브랜드 톤 커스텀 카드(FormSection)로 구현.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
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
  ROUTE_INITIAL_VALUES,
  ROUTE_TYPE_LABELS,
  ROUTE_TYPE_OPTIONS,
  type RouteCreateRequest,
  WORKTIME_OPT_LABELS,
  WORKTIME_OPT_OPTIONS,
} from '../../features/route/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// ─── 섹션 키 + 필드 소속 매핑 ────────────────────────────────────────────────
// 검증 실패 시 해당 필드가 속한 섹션을 자동으로 펼치기 위한 역방향 맵의 원본.
const SECTION_KEYS = {
  BASIC: 'basic', // 기본정보 (필수 전부)
  ANI: 'ani', // 발신번호 설정 (지역번호 / 과금 / DOD 편집)
  CALL: 'call', // 호 처리 / 우회 라우트
  WORKTIME: 'worktime', // 업무시간 설정
} as const;

// 필수값은 전부 basic 에. 나머지 선택 필드는 성격별 접힌 섹션에.
const SECTION_FIELDS: Record<string, string[]> = {
  [SECTION_KEYS.BASIC]: ['routeName', 'nodeId', 'routeType', 'portNo', 'aniType', 'aniNo', 'delCount', 'editOpt'],
  [SECTION_KEYS.ANI]: ['regionUseYn', 'regionNo', 'localNum', 'chrgType', 'chrgNo', 'vendorAuthnumYn', 'dodTransId', 'addDigit'],
  [SECTION_KEYS.CALL]: ['callFailRetryYn', 'ringbacktoneYn', 'routeBlockYn', 'busyRouteId', 'blockRouteId'],
  [SECTION_KEYS.WORKTIME]: ['ieWorktimeId', 'worktimeOpt', 'worktimeMentId', 'worktimeRouteId'],
};

// 필드명 → 섹션키
const FIELD_SECTION: Record<string, string> = Object.entries(SECTION_FIELDS).reduce<Record<string, string>>((acc, [section, fields]) => {
  fields.forEach((f) => {
    acc[f] = section;
  });
  return acc;
}, {});

// 진행바/미입력 배지 산정 기준 = 기본정보의 8개 필수 필드 (조건부 필수는 제출 시 검증 + 자동 펼침으로 처리)
const REQUIRED_BASE_FIELDS = ['routeName', 'nodeId', 'routeType', 'portNo', 'aniType', 'aniNo', 'delCount', 'editOpt'];

// 진입 시 펼쳐두는 필수 섹션 (기본정보만)
const DEFAULT_ACTIVE_KEYS = [SECTION_KEYS.BASIC];

// 헤더 pill 최대 표시 개수 (초과분은 +N)
const MAX_HEADER_PILLS = 4;

export default function RouteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>([...DEFAULT_ACTIVE_KEYS]);

  const isEditMode = !!id;
  const routeId = id ? Number(id) : null;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetNodes();
  // 노드 셀렉트 스코프: 신규 등록은 일반 모드=로그인 테넌트 노드/운영자=전체, 수정은 기존 노드 표시 위해 전체.
  const scopedNodes = useScopedNodes(allNodes);
  const nodes = isEditMode ? allNodes : scopedNodes;
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
  const dodTransSelectOptions = dodTransOptions.map((o) => ({ label: o.dodTransName, value: o.dodTransId }));
  const worktimeSelectOptions = worktimeOptions.map((o) => ({ label: o.worktimeName, value: o.worktimeId }));
  const mentSelectOptions = mentOptions.map((o) => ({ label: o.name, value: o.id }));

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
        toast.success('라우트가 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: routeQueryKeys.getRoutes().queryKey });
        navigate('/ipron/line/route');
      },
    },
  });

  const { mutate: updateRoute, isPending: isUpdating } = useUpdateRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('라우트가 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: routeQueryKeys.getRoutes().queryKey });
        navigate('/ipron/line/route');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const nodeOptions = nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));

  // ─── 현재 폼 값 (요약 패널 · 헤더 pill 용, 변경 전에는 초기값) ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValues: any = formValues ?? { ...ROUTE_INITIAL_VALUES, ...(defaultNodeId ? { nodeId: defaultNodeId } : {}) };

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

  // ─── 헤더 요약 pill (접힌 선택 섹션의 주요 선택필드 현재값 미리보기) ──────────
  const optLabel = (options: readonly { label: string; value: string | number }[], val: unknown, fallback: string) => {
    const found = options.find((o) => String(o.value) === String(val));
    return found ? found.label : fallback;
  };

  const sectionPills = (key: string): string[] => {
    const v = currentValues;
    if (key === SECTION_KEYS.ANI) {
      return [
        `지역번호 ${v.regionUseYn === 1 ? '설정' : '해제'}`,
        `과금 TYPE ${optLabel(CHARGE_TYPE_OPTIONS, v.chrgType, '대표과금번호')}`,
        `통신사인증번호 ${v.vendorAuthnumYn === 1 ? '설정' : '해제'}`,
        `발신 번호변환 ${optLabel(dodTransSelectOptions, v.dodTransId, '미지정')}`,
        `편집 Digit ${v.addDigit ? v.addDigit : '없음'}`,
      ];
    }
    if (key === SECTION_KEYS.CALL) {
      return [
        `호 실패시 재시도 ${v.callFailRetryYn === 1 ? '설정' : '해제'}`,
        `링백톤 ${v.ringbacktoneYn === 1 ? '설정' : '해제'}`,
        `블록 ${v.routeBlockYn === 1 ? '설정' : '해제'}`,
        `Busy 우회 ${optLabel(routeSelectOptions, v.busyRouteId, '없음')}`,
        `블록 우회 ${optLabel(routeSelectOptions, v.blockRouteId, '없음')}`,
      ];
    }
    if (key === SECTION_KEYS.WORKTIME) {
      return [`업무시간 ${optLabel(worktimeSelectOptions, v.ieWorktimeId, '미지정')}`, `업무시간 외 제어 ${optLabel(WORKTIME_OPT_OPTIONS, v.worktimeOpt, '미지정')}`];
    }
    return [];
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  // onFinish: antd 필수/패턴 검증 통과 후 payload 생성 (payload 구성은 AS-IS 그대로)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinish = (values: any) => {
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

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([
      { title: '회선관리' },
      { title: '호 라우팅' },
      { title: '발신라우트', path: '/ipron/line/route' },
      {
        title: isEditMode ? '발신라우트 수정' : '발신라우트 등록',
        path: isEditMode && id ? `/ipron/line/route/${id}` : '/ipron/line/route/create',
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

  // 기본정보 — 필수값 전부 (라우트 식별 → ANI 대표번호 → DOD 편집 규칙)
  function renderBasicSection() {
    return (
      <>
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
          <Col span={6}>
            <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
              <Select options={nodeOptions} placeholder="노드 선택" disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="routeType" label="라우트 분배방식" required rules={[{ required: true, message: '분배방식은 필수입니다' }]}>
              <Select options={[...ROUTE_TYPE_OPTIONS]} />
            </Form.Item>
          </Col>
          {/* 숫자 입력은 텍스트/셀렉트와 같은 폭을 쓸 이유가 없어 span 을 좁게(4) 잡는다. */}
          <Col span={4}>
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

        <Row gutter={20}>
          <Col span={5}>
            <Form.Item name="aniType" label="ANI TYPE" required rules={[{ required: true, message: 'ANI TYPE은 필수입니다' }]}>
              <Select options={[...ANI_TYPE_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
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
          <Col span={4}>
            <Form.Item
              name="delCount"
              label="편집 Digit 수"
              required
              rules={[
                { required: true, message: '편집 Digit 수는 필수입니다' },
                { type: 'number', min: -1, message: '-1 이상' },
              ]}
            >
              <InputNumber min={-1} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="editOpt" label="편집 옵션" required rules={[{ required: true, message: '편집 옵션은 필수입니다' }]}>
              <Select options={[...EDIT_OPT_OPTIONS]} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // 발신번호 설정 — 지역번호(ANI 부가) / 과금 / DOD 번호변환·편집
  function renderAniSection() {
    return (
      <>
        {/* 스위치는 좁게(4), 짧은 숫자 텍스트는 5 — AS-IS "ANI 번호 설정" 하단부 */}
        <Row gutter={20}>
          <Col span={4}>
            <Form.Item name="regionUseYn" label="지역번호 사용유무" {...switchProps}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
          </Col>
          <Col span={5}>
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
          <Col span={5}>
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

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">발신번호 과금</h4>

        <Row gutter={20}>
          <Col span={5}>
            <Form.Item name="chrgType" label="과금 TYPE">
              <Select options={[...CHARGE_TYPE_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
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
          <Col span={4}>
            <Form.Item name="vendorAuthnumYn" label="통신사인증번호" {...switchProps}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">DOD 발신번호 변환 · 편집</h4>

        <Row gutter={20}>
          <Col span={6}>
            {/* SWAT: cbCreate('dodtrans', search1=nodeId) — 노드 선택 시 갱신 */}
            <Form.Item name="dodTransId" label="발신 번호변환">
              <Select allowClear placeholder="미지정" options={dodTransSelectOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            {/* 편집 Digit 수/옵션은 필수라 기본정보 섹션에 있음 */}
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
        </Row>
      </>
    );
  }

  // 호 처리 / 우회 라우트 — 재시도·링백톤·블록 + Busy/블록 우회
  function renderCallSection() {
    return (
      <Row gutter={20}>
        <Col span={4}>
          <Form.Item name="callFailRetryYn" label="호 실패시 재시도" {...switchProps}>
            <Switch checkedChildren="설정" unCheckedChildren="해제" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="ringbacktoneYn" label="링백톤사용" {...switchProps}>
            <Switch checkedChildren="설정" unCheckedChildren="해제" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="routeBlockYn" label="블록사용" {...switchProps}>
            <Switch checkedChildren="설정" unCheckedChildren="해제" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="busyRouteId" label="Busy 우회 라우트">
            <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="blockRouteId" label="블록 시 우회 라우트">
            <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
          </Form.Item>
        </Col>
      </Row>
    );
  }

  // 업무시간 설정 — 업무시간 지정 시 하위 필드가 조건부 필수/노출
  function renderWorktimeSection() {
    return (
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="ieWorktimeId" label="업무시간 설정">
            <Select allowClear placeholder="미지정" options={worktimeSelectOptions} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="worktimeOpt"
            label="업무시간 외 제어"
            required={isWorktimeSet}
            rules={isWorktimeSet ? [{ required: true, message: '업무시간 외 제어는 필수입니다' }] : []}
          >
            <Select options={[...WORKTIME_OPT_OPTIONS]} disabled={!isWorktimeSet} />
          </Form.Item>
        </Col>
        {showWorktimeMent && (
          <Col span={6}>
            <Form.Item name="worktimeMentId" label="업무시간 외 안내멘트" required rules={[{ required: true, message: '업무시간 외 안내멘트를 선택하십시오.' }]}>
              <Select allowClear placeholder="선택" options={mentSelectOptions} />
            </Form.Item>
          </Col>
        )}
        {showWorktimeRoute && (
          <Col span={6}>
            <Form.Item name="worktimeRouteId" label="업무시간 외 우회라우트" required rules={[{ required: true, message: '업무시간 외 우회라우트를 선택하십시오.' }]}>
              <Select options={[{ label: '없음', value: 0 }, ...routeSelectOptions]} allowClear placeholder="선택" />
            </Form.Item>
          </Col>
        )}
      </Row>
    );
  }

  // ─── 섹션 구성 (기본정보=펼침·필수 / 나머지=접힘·요약 pill) ────────────────────
  // content 는 항상 렌더 → 접힌 섹션 Form.Item 도 마운트 유지 → 값 등록/검증 정상 동작
  const sections = [
    { key: SECTION_KEYS.BASIC, title: '기본정보', required: true, content: renderBasicSection() },
    { key: SECTION_KEYS.ANI, title: '발신번호 설정', required: false, content: renderAniSection() },
    { key: SECTION_KEYS.CALL, title: '호 처리 / 우회 라우트', required: false, content: renderCallSection() },
    { key: SECTION_KEYS.WORKTIME, title: '업무시간 설정', required: false, content: renderWorktimeSection() },
  ];

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/line/route')}>
            취소
          </Button>
        </Col>
        <Col>
          <Button variant="solid" color="primary" onClick={() => form.submit()} loading={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </Col>
      </Row>
    );
  }

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = currentValues;
    // 필수 항목 미입력 판정 (요약에서 빨간 "미입력" 노출용)
    const missing = (key: string) => !isFilled(values[key]);
    const nodeName = nodes.find((n) => n.nodeId === values.nodeId)?.nodeName;
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
          <SummaryRow label="라우트명" required missing={missing('routeName')} value={displayValue(values.routeName)} />
          <SummaryRow label="노드" required missing={missing('nodeId')} value={displayValue(nodeName)} />
          <SummaryRow label="라우트 분배방식" required missing={missing('routeType')} value={displayValue(ROUTE_TYPE_LABELS[values.routeType as string] ?? values.routeType)} />
          <SummaryRow label="포트번호" required missing={missing('portNo')} value={displayValue(values.portNo)} />
          <SummaryRow label="ANI TYPE" required missing={missing('aniType')} value={displayValue(ANI_TYPE_LABELS[values.aniType as string] ?? values.aniType)} />
          <SummaryRow label="대표번호" required missing={missing('aniNo')} value={displayValue(values.aniNo)} />
          <SummaryRow label="편집 Digit 수" required missing={missing('delCount')} value={displayValue(values.delCount)} />
          <SummaryRow label="편집 옵션" required missing={missing('editOpt')} value={displayValue(EDIT_OPT_LABELS[values.editOpt as string] ?? values.editOpt)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 발신번호 설정 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="발신번호 설정" tag={optionalTag} />
          <SummaryRow label="지역번호 사용유무" value={values.regionUseYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="지역번호" value={displayValue(values.regionNo)} />
          {/* ANI TYPE=개별지정번호(2) 일 때만 국번호 필수 */}
          <SummaryRow label="국번호" required={isLocalNumRequired} missing={missing('localNum')} value={displayValue(values.localNum)} />
          <SummaryRow label="과금 TYPE" value={displayValue(CHARGE_TYPE_LABELS[values.chrgType as string] ?? values.chrgType)} />
          <SummaryRow label="대표과금번호" value={displayValue(values.chrgNo)} />
          <SummaryRow label="통신사인증번호" value={values.vendorAuthnumYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="발신 번호변환" value={displayValue(dodTransSelectOptions.find((o) => o.value === values.dodTransId)?.label)} />
          <SummaryRow label="편집 Digit" value={displayValue(values.addDigit)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 호 처리 / 우회 라우트 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="호 처리 / 우회 라우트" tag={optionalTag} />
          <SummaryRow label="호 실패시 재시도" value={values.callFailRetryYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="링백톤사용" value={values.ringbacktoneYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="블록사용" value={values.routeBlockYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="Busy 우회 라우트" value={displayValue(routeSelectOptions.find((r) => r.value === values.busyRouteId)?.label)} />
          <SummaryRow label="블록 시 우회 라우트" value={displayValue(routeSelectOptions.find((r) => r.value === values.blockRouteId)?.label)} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 업무시간 설정 */}
        <div className="space-y-2">
          <SummaryGroupHeader title="업무시간 설정" tag={optionalTag} />
          <SummaryRow label="업무시간 설정" value={displayValue(worktimeSelectOptions.find((o) => o.value === values.ieWorktimeId)?.label)} />
          {isWorktimeSet && (
            <>
              <SummaryRow
                label="  업무시간 외 제어"
                required
                missing={missing('worktimeOpt')}
                value={displayValue(WORKTIME_OPT_LABELS[values.worktimeOpt as string] ?? values.worktimeOpt)}
              />
              {showWorktimeMent && (
                <SummaryRow
                  label="  안내멘트"
                  required
                  missing={missing('worktimeMentId')}
                  value={displayValue(mentSelectOptions.find((o) => o.value === values.worktimeMentId)?.label)}
                />
              )}
              {showWorktimeRoute && (
                <SummaryRow
                  label="  우회라우트"
                  required
                  missing={missing('worktimeRouteId')}
                  value={displayValue(routeSelectOptions.find((r) => r.value === values.worktimeRouteId)?.label)}
                />
              )}
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
                  initialValues={ROUTE_INITIAL_VALUES}
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
