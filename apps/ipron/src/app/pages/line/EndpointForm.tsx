/**
 * 국선 등록/수정 -- 단일 스크롤 폼(커스텀 아코디언 카드) + 우측 입력 정보 요약
 * AS-IS IPR20S1010.jsp 필드/검증 규칙을 그대로 유지하되, 3단계 위저드를 없애고
 * 필수값만 앞 섹션(기본정보 / DNIS 편집)에 펼쳐 두고, 선택 섹션(장비 등록 /
 * 네트워크·위치 / 모니터링·부가 / 중개 NAT)은 기본 접힘으로 배치.
 * 접이식 UI는 antd Collapse 대신 브랜드 톤 커스텀 카드(FormSection)로 구현.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { Activity, ChevronDown, ClipboardList, Hash, Network, Server, Waypoints } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { endpointApi } from '../../features/endpoint/api/endpointApi';
import {
  endpointQueryKeys,
  useCreateEndpoint,
  useGetCountries,
  useGetEndpointDetail,
  useGetNodes,
  useGetRegnums,
  useUpdateEndpoint,
} from '../../features/endpoint/hooks/useEndpointQueries';
import { ENDPOINT_INITIAL_VALUES, ENDPOINT_TYPE_OPTIONS, type EndpointCreateRequest, SSW_VENDOR_OPTIONS, TRANSPORT_OPTIONS } from '../../features/endpoint/types';
import { msGroupApi } from '../../features/ms-group/api/msGroupApi';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import { type MentOption, type WorktimeOption, routeApi } from '../../features/route/api/routeApi';
import { useGetSipProfiles } from '../../features/sip-profile/hooks/useSipProfileQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// ─── 로컬 옵션 상수 ──────────────────────────────────────────────────────────

const SRTP_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: 'SRTP', value: 1 },
  { label: 'DTLS', value: 2 },
] as const;

const ALLOC_METHOD_OPTIONS = [
  { label: '우선순위', value: 0 },
  { label: '균등', value: 1 },
] as const;

const REG_METHOD_OPTIONS = [
  { label: '우선순위', value: 0 },
  { label: '동시 REG', value: 1 },
] as const;

const EDIT_OPT_OPTIONS = [
  { label: '미사용', value: '0' },
  { label: '삭제+추가', value: '1' },
  { label: '삭제', value: '2' },
  { label: '추가', value: '3' },
] as const;

const WORKTIME_OPT_OPTIONS = [
  { label: '선택안함', value: 0 },
  { label: 'OFF', value: 1 },
  { label: '안내멘트', value: 2 },
  { label: '착신전환', value: 3 },
  { label: '안내+전환', value: 4 },
] as const;

const NAT_OPTION_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: 'SIP 중개', value: 1 },
  { label: 'SIP+RTP 중개', value: 2 },
] as const;

const ENAT_OPTION_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: 'Static NAT', value: 1 },
  { label: 'Dynamic NAT', value: 2 },
] as const;

// ─── 섹션 키 + 필드 소속 매핑 ────────────────────────────────────────────────
// 검증 실패 시 해당 필드가 속한 섹션을 자동으로 펼치기 위한 역방향 맵의 원본.
const SECTION_KEYS = {
  BASIC: 'basic',
  DNIS: 'dnis',
  DEVICE: 'device',
  NETWORK: 'network',
  MONITOR: 'monitor',
  NAT: 'nat',
} as const;

// 필수값만 앞 섹션(basic/dnis)에 두고, 선택 필드는 접힌 섹션으로 이동.
// (sswVendor → device, addDigit → monitor)
const SECTION_FIELDS: Record<string, string[]> = {
  [SECTION_KEYS.BASIC]: ['endptName', 'endptType', 'endptMaxchnl', 'endptDodchnl', 'nodeId', 'srtpYn'],
  [SECTION_KEYS.DNIS]: ['delCount', 'editOpt', 'ieWorktimeId', 'worktimeOpt', 'guideMentId'],
  [SECTION_KEYS.DEVICE]: ['sswVendor', 'regUseYn', 'regNum', 'regId', 'regPwd', 'regInterval'],
  [SECTION_KEYS.NETWORK]: ['drnodeId', 'transportType', 'sipProfileId', 'locationNodeId', 'routingNodeId', 'snmpOid', 'allocMethod', 'regMethod', 'domainName', 'wanNetworkYn'],
  [SECTION_KEYS.MONITOR]: ['monitorYn', 'watchInterval', 'failCnt', 'msgTraceYn', 'blockYn', 'userAgentChk', 'userAgentRegex', 'addDigit', 'countryCodeUseYn', 'countryId'],
  [SECTION_KEYS.NAT]: ['natOption', 'msGroupId', 'drnatOption', 'msDrgroupId', 'enatOption', 'natIpAddress'],
};

// 필드명 → 섹션키
const FIELD_SECTION: Record<string, string> = Object.entries(SECTION_FIELDS).reduce<Record<string, string>>((acc, [section, fields]) => {
  fields.forEach((f) => {
    acc[f] = section;
  });
  return acc;
}, {});

// 선택 섹션 헤더의 "N개 설정됨" 힌트 계산용 시그널 필드 (기본값/off 는 미설정 취급)
const OPTIONAL_SIGNAL_FIELDS: Record<string, string[]> = {
  [SECTION_KEYS.DEVICE]: ['sswVendor', 'regUseYn'],
  [SECTION_KEYS.NETWORK]: ['drnodeId', 'transportType', 'sipProfileId', 'locationNodeId', 'routingNodeId', 'domainName', 'wanNetworkYn', 'allocMethod', 'regMethod'],
  [SECTION_KEYS.MONITOR]: ['msgTraceYn', 'blockYn', 'userAgentChk', 'addDigit', 'countryCodeUseYn'],
  [SECTION_KEYS.NAT]: ['natOption', 'drnatOption', 'enatOption', 'natIpAddress'],
};

// 진입 시 펼쳐두는 필수 섹션
const DEFAULT_ACTIVE_KEYS = [SECTION_KEYS.BASIC, SECTION_KEYS.DNIS];

export default function EndpointForm() {
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
  const endptId = id ? Number(id) : null;

  // ─── Watched values for conditional fields ────────────────────────────────
  const regUseYn = Form.useWatch('regUseYn', form);
  const routingNodeId = Form.useWatch('routingNodeId', form);
  const userAgentChk = Form.useWatch('userAgentChk', form);
  const ieWorktimeId = Form.useWatch('ieWorktimeId', form);
  const worktimeOpt = Form.useWatch('worktimeOpt', form);
  const countryCodeUseYn = Form.useWatch('countryCodeUseYn', form);
  const natOption = Form.useWatch('natOption', form);
  const drnatOption = Form.useWatch('drnatOption', form);
  const endptType = Form.useWatch('endptType', form);
  const watchedDrnodeId = Form.useWatch('drnodeId', form);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetNodes();
  // 노드 셀렉트 스코프: 신규 등록은 일반 모드=로그인 테넌트 노드/운영자=전체, 수정은 기존 노드 표시 위해 전체.
  const scopedNodes = useScopedNodes(allNodes);
  const nodes = isEditMode ? allNodes : scopedNodes;
  const { data: sipProfiles = [] } = useGetSipProfiles();
  const { data: countries = [] } = useGetCountries();
  const { data: endpointDetail, isFetching } = useGetEndpointDetail({
    params: endptId ? { id: endptId } : undefined,
    queryOptions: { enabled: !!endptId },
  });

  // 수정 모드에서 인증번호 존재 여부 확인 (SSW벤더 disabled 판정용)
  // SWAT IPR20S1010.jsp doUpdate() line 911-916: regnumCount>0 → sswVendor disabled
  const { data: editRegnums = [] } = useGetRegnums({
    params: endptId ? { id: endptId } : undefined,
    queryOptions: { enabled: isEditMode && !!endptId },
  });
  const sswVendorDisabled = isEditMode && editRegnums.length > 0;

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (endpointDetail && isEditMode) {
      const vals = {
        endptName: endpointDetail.endptName,
        endptType: endpointDetail.endptType,
        endptMaxchnl: endpointDetail.endptMaxchnl,
        endptDodchnl: endpointDetail.endptDodchnl,
        nodeId: endpointDetail.nodeId,
        drnodeId: endpointDetail.drnodeId,
        transportType: endpointDetail.transportType,
        srtpYn: endpointDetail.srtpYn,
        sswVendor: endpointDetail.sswVendor ?? '0',
        regUseYn: endpointDetail.regUseYn,
        regNum: endpointDetail.regNum ?? '',
        regId: endpointDetail.regId ?? '',
        regPwd: endpointDetail.regPwd ?? '',
        regInterval: endpointDetail.regInterval,
        locationNodeId: endpointDetail.locationNodeId,
        routingNodeId: endpointDetail.routingNodeId,
        snmpOid: endpointDetail.snmpOid ?? '',
        allocMethod: endpointDetail.allocMethod,
        regMethod: endpointDetail.regMethod,
        domainName: endpointDetail.domainName ?? '',
        wanNetworkYn: endpointDetail.wanNetworkYn,
        sipProfileId: endpointDetail.sipProfileId,
        // 부가정보
        monitorYn: endpointDetail.monitorYn,
        watchInterval: endpointDetail.watchInterval,
        failCnt: endpointDetail.failCnt,
        msgTraceYn: endpointDetail.msgTraceYn,
        blockYn: endpointDetail.blockYn,
        userAgentChk: endpointDetail.userAgentChk,
        userAgentRegex: endpointDetail.userAgentRegex ?? '',
        delCount: endpointDetail.delCount,
        addDigit: endpointDetail.addDigit ?? '',
        editOpt: endpointDetail.editOpt ?? '0',
        ieWorktimeId: endpointDetail.ieWorktimeId,
        worktimeOpt: endpointDetail.worktimeOpt,
        guideMentId: endpointDetail.guideMentId,
        countryCodeUseYn: endpointDetail.countryCodeUseYn,
        countryId: endpointDetail.countryId,
        // 중개 NAT
        natOption: endpointDetail.natOption,
        drnatOption: endpointDetail.drnatOption,
        msGroupId: endpointDetail.msGroupId,
        msDrgroupId: endpointDetail.msDrgroupId,
        enatOption: endpointDetail.enatOption,
        natIpAddress: endpointDetail.natIpAddress ?? '',
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [endpointDetail, isEditMode, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createEndpoint, isPending: isCreating } = useCreateEndpoint({
    mutationOptions: {
      onSuccess: (data: any) => {
        toast.success('국선이 등록되었습니다');
        queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
        const nodeId = data?.nodeId || form.getFieldValue('nodeId');
        const epId = data?.endptId;
        navigate(`/ipron/line/endpoint?nodeId=${nodeId}${epId ? `&endptId=${epId}` : ''}`);
      },
    },
  });

  const { mutate: updateEndpoint, isPending: isUpdating } = useUpdateEndpoint({
    mutationOptions: {
      onSuccess: () => {
        toast.success('국선이 수정되었습니다');
        queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
        const nodeId = form.getFieldValue('nodeId');
        navigate(`/ipron/line/endpoint?nodeId=${nodeId}${endptId ? `&endptId=${endptId}` : ''}`);
      },
    },
  });

  const isPending = isCreating || isUpdating;

  // ─── Options ────────────────────────────────────────────────────────────────
  const nodeOptions = nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));
  const sipProfileOptions = sipProfiles.map((p) => ({ label: p.sipProfileName, value: p.sipProfileId }));
  // 국가코드: TB_CC_COUNTRY — "+IDD 국가명" 형식 (SWAT IE_EndPoint.comboCountryId 정합)
  const countryOptions = countries.map((c) => ({ label: c.label, value: c.value }));
  // DR 노드: 선택된 nodeId 기준 같은 클러스터의 다른 노드만 표시
  const [drNodeOptions, setDrNodeOptions] = useState<Array<{ label: string; value: number }>>([{ label: '없음', value: 0 }]);
  const selectedNodeIdForDr = Form.useWatch('nodeId', form);

  // MS그룹(주 노드): nodeId 변경 시 재조회
  // SWAT IPR20S1010.jsp line 787/1008: cbCreate('#poMsGroupId', 'msGroup', 'nodeId='+nodeId)
  const [msGroupOptions, setMsGroupOptions] = useState<Array<{ label: string; value: number }>>([{ label: '미지정', value: 0 }]);
  useEffect(() => {
    const nodeIdVal = selectedNodeIdForDr;
    if (nodeIdVal) {
      msGroupApi
        .getMsGroups({ nodeId: nodeIdVal })
        .then((list) => {
          setMsGroupOptions([{ label: '미지정', value: 0 }, ...list.map((g) => ({ label: g.msGroupName, value: g.msGroupId }))]);
        })
        .catch(() => setMsGroupOptions([{ label: '미지정', value: 0 }]));
    } else {
      setMsGroupOptions([{ label: '미지정', value: 0 }]);
    }
  }, [selectedNodeIdForDr]);

  // 업무시간 콤보: nodeId 변경 시 재조회
  // SWAT IPR20S1010.jsp line 959: cbCreate('#poIeWorktimeId', 'worktime', 'tenantId=0', {text:'사용안함', value:'0'})
  const [worktimeOptions, setWorktimeOptions] = useState<Array<{ label: string; value: number }>>([{ label: '사용안함', value: 0 }]);
  useEffect(() => {
    const nodeIdVal = selectedNodeIdForDr;
    if (nodeIdVal) {
      routeApi
        .getWorktimeOptions(nodeIdVal)
        .then((list: WorktimeOption[]) => {
          setWorktimeOptions([{ label: '사용안함', value: 0 }, ...list.map((w) => ({ label: w.worktimeName, value: w.worktimeId }))]);
        })
        .catch(() => setWorktimeOptions([{ label: '사용안함', value: 0 }]));
    } else {
      setWorktimeOptions([{ label: '사용안함', value: 0 }]);
    }
  }, [selectedNodeIdForDr]);

  // 안내멘트 콤보: nodeId 변경 시 재조회
  // SWAT IPR20S1010.jsp line 961: cbCreate('#poGuideMentId', 'ment', 'tenantId=0&nodeId='+nodeId, {text:'없음', value:'0'})
  const [mentOptions, setMentOptions] = useState<Array<{ label: string; value: number }>>([{ label: '없음', value: 0 }]);
  useEffect(() => {
    const nodeIdVal = selectedNodeIdForDr;
    if (nodeIdVal) {
      routeApi
        .getMentOptions(nodeIdVal)
        .then((list: MentOption[]) => {
          setMentOptions([{ label: '없음', value: 0 }, ...list.map((m) => ({ label: m.name, value: m.id }))]);
        })
        .catch(() => setMentOptions([{ label: '없음', value: 0 }]));
    } else {
      setMentOptions([{ label: '없음', value: 0 }]);
    }
  }, [selectedNodeIdForDr]);
  useEffect(() => {
    if (selectedNodeIdForDr) {
      endpointApi
        .getDrNodes({ nodeId: selectedNodeIdForDr })
        .then((list) => {
          setDrNodeOptions([{ label: '없음', value: 0 }, ...list.map((n) => ({ label: n.nodeName, value: n.nodeId }))]);
        })
        .catch(() => setDrNodeOptions([{ label: '없음', value: 0 }]));
    } else {
      setDrNodeOptions([{ label: '없음', value: 0 }]);
    }
  }, [selectedNodeIdForDr]);

  // MS그룹(DR): DR 노드 변경 시 해당 노드 기준 MS그룹 목록 재조회
  // AS-IS: SWAT IPR20S1010.jsp onChangedDrNode() — cbCreate2("#poMsDrgroupId", url, "nodeId=" + drNodeId + "&type=msDrGroup")
  const [drMsGroupOptions, setDrMsGroupOptions] = useState<Array<{ label: string; value: number }>>([{ label: '미지정', value: 0 }]);
  useEffect(() => {
    const drNodeId = watchedDrnodeId;
    if (drNodeId && drNodeId !== 0) {
      msGroupApi
        .getMsGroups({ nodeId: drNodeId })
        .then((list) => {
          setDrMsGroupOptions([{ label: '미지정', value: 0 }, ...list.map((g) => ({ label: g.msGroupName, value: g.msGroupId }))]);
        })
        .catch(() => setDrMsGroupOptions([{ label: '미지정', value: 0 }]));
    } else {
      // DR 노드 없음(0 또는 null) → MS그룹(DR) 목록 초기화, 값 리셋
      setDrMsGroupOptions([{ label: '미지정', value: 0 }]);
      form.setFieldValue('msDrgroupId', null);
    }
  }, [watchedDrnodeId, form]);

  // ─── 현재 폼 값 (요약 패널용, 변경 전에는 초기값) ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValues: any = formValues ?? { ...ENDPOINT_INITIAL_VALUES, ...(defaultNodeId ? { nodeId: defaultNodeId } : {}) };

  // 값 존재 여부 (0/false 는 채워진 값으로 취급)
  const isFilled = (v: unknown) => v !== null && v !== undefined && v !== '';

  // ─── 섹션 펼침/접힘 헬퍼 ──────────────────────────────────────────────────
  const expandSections = (keys: string[]) => {
    setActiveKeys((prev) => Array.from(new Set([...prev, ...keys])));
  };

  const toggleSection = (key: string) => {
    setActiveKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // 선택 섹션 헤더 힌트: 설정된(기본값 아님) 시그널 필드 개수
  const isConfigured = (v: unknown) => v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0';
  const configuredCount = (key: string) => (OPTIONAL_SIGNAL_FIELDS[key] ?? []).filter((f) => isConfigured(currentValues[f])).length;

  // ─── Submit ───────────────────────────────────────────────────────────────
  // onFinish: antd 필수/패턴 검증 통과 후 비즈니스 교차 검증 + payload 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinish = (values: any) => {
    // SWAT IPR20S1010.jsp callProcess() line 1137-1145: WebRTC(4) 제외 채널 교차 검증
    const currentMaxchnl = values.endptMaxchnl ?? 0;
    const currentDodchnl = values.endptDodchnl ?? 0;
    if (String(values.endptType) !== '4') {
      // 인/아웃 최대채널 min=1 검증 (SWAT line 1142-1145)
      if (currentMaxchnl < 1) {
        toast.error('인/아웃 최대채널은 1 이상 입력해야 합니다');
        expandSections([SECTION_KEYS.BASIC]);
        return;
      }
      // OB할당채널 > 최대채널 교차 검증 (SWAT line 1137-1140)
      if (currentDodchnl > currentMaxchnl) {
        toast.error('아웃할당채널수는 인/아웃최대채널을 초과할 수 없습니다');
        expandSections([SECTION_KEYS.BASIC]);
        return;
      }
    }

    const payload: EndpointCreateRequest = {
      endptName: values.endptName,
      endptType: values.endptType,
      nodeId: values.nodeId,
      endptMaxchnl: values.endptMaxchnl,
      endptDodchnl: values.endptDodchnl ?? 0,
      sipProfileId: values.sipProfileId || null,
      sswVendor: values.sswVendor,
      transportType: values.transportType,
      srtpYn: values.srtpYn ?? 0,
      regUseYn: values.regUseYn ?? 0,
      regNum: values.regUseYn === 1 ? values.regNum : null,
      regId: values.regUseYn === 1 ? values.regId : null,
      regPwd: values.regUseYn === 1 ? values.regPwd : null,
      regInterval: values.regUseYn === 1 ? values.regInterval : 60,
      locationNodeId: values.locationNodeId || null,
      routingNodeId: values.routingNodeId || null,
      snmpOid: values.routingNodeId ? values.snmpOid : null,
      allocMethod: values.allocMethod ?? 0,
      regMethod: values.regMethod ?? 0,
      domainName: values.domainName || null,
      wanNetworkYn: values.wanNetworkYn ?? 0,
      drnodeId: values.drnodeId || null,
      // 부가정보
      monitorYn: values.monitorYn ?? 1,
      watchInterval: values.watchInterval ?? 60,
      failCnt: values.failCnt ?? 8,
      msgTraceYn: values.msgTraceYn ?? 0,
      blockYn: values.blockYn ?? 0,
      userAgentChk: values.userAgentChk ?? 0,
      userAgentRegex: values.userAgentChk === 1 ? values.userAgentRegex : null,
      delCount: values.delCount ?? 0,
      addDigit: values.addDigit || null,
      editOpt: values.editOpt ?? '0',
      ieWorktimeId: values.ieWorktimeId || null,
      worktimeOpt: values.worktimeOpt ?? 0,
      guideMentId: values.guideMentId || null,
      countryCodeUseYn: values.countryCodeUseYn ?? 0,
      countryId: values.countryCodeUseYn === 1 ? values.countryId : null,
      // 중개 NAT
      natOption: values.natOption ?? 0,
      drnatOption: values.drnatOption ?? 0,
      msGroupId: values.natOption !== 0 ? values.msGroupId : null,
      msDrgroupId: values.drnatOption !== 0 ? values.msDrgroupId : null,
      enatOption: values.enatOption ?? 0,
      natIpAddress: values.natIpAddress || null,
      // 기타 기본값
      ipVersion: values.ipVersion ?? 4,
      portNo1: values.portNo1 ?? 5060,
      ipAddress1: values.ipAddress1 ?? '',
      ssRefreshType: values.ssRefreshType ?? 0,
    };
    if (isEditMode && endptId) {
      updateEndpoint({ id: endptId, data: payload });
    } else {
      createEndpoint(payload);
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
      { title: '국선관리', path: '/ipron/line/endpoint' },
      {
        title: isEditMode ? '수정' : '등록',
        path: isEditMode && id ? `/ipron/line/endpoint/${id}` : '/ipron/line/endpoint/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEditMode, id, setBreadcrumb, clearBreadcrumb]);

  // ─── Utils ──────────────────────────────────────────────────────────────────
  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  const getLabelByValue = (options: readonly { label: string; value: string | number }[], val: unknown) => {
    const found = options.find((o) => String(o.value) === String(val));
    return found ? found.label : val;
  };

  // ─── Switch helpers ─────────────────────────────────────────────────────────
  const switchProps = {
    valuePropName: 'checked' as const,
    getValueFromEvent: (checked: boolean) => (checked ? 1 : 0),
    getValueProps: (value: number) => ({ checked: value === 1 }),
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  섹션 렌더 함수 (각 FormSection 카드 children)
  // ══════════════════════════════════════════════════════════════════════════

  // 기본정보 (필수)
  function renderBasicSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="endptName"
              label="국선명"
              required
              hasFeedback
              rules={[
                { required: true, message: '국선명은 필수입니다' },
                { max: 100, message: '100자 이내여야 합니다' },
              ]}
            >
              <Input placeholder="국선명 입력" maxLength={100} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="endptType" label="구분" required rules={[{ required: true, message: '구분은 필수입니다' }]}>
              <Select options={[...ENDPOINT_TYPE_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="endptMaxchnl" label="인/아웃 최대채널" required rules={[{ required: true, message: '최대채널은 필수입니다' }]}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="endptDodchnl" label="아웃할당채널" required rules={[{ required: true, message: '아웃할당채널은 필수입니다' }]}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
              <Select options={nodeOptions} placeholder="노드 선택" disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="srtpYn" label="음성보안" required rules={[{ required: true, message: '음성보안은 필수입니다' }]}>
              <Select options={[...SRTP_OPTIONS]} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // DNIS 편집 (필수) + 업무시간
  function renderDnisSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="delCount" label="DNIS 편집 Digit수" required rules={[{ required: true, message: 'DNIS 편집 Digit수는 필수입니다' }]}>
              <InputNumber min={-1} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="editOpt" label="편집 옵션" required rules={[{ required: true, message: '편집 옵션은 필수입니다' }]}>
              <Select options={[...EDIT_OPT_OPTIONS]} />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">업무시간</h4>

        <Row gutter={20}>
          <Col span={6}>
            {/* SWAT IPR20S1010.jsp line 959: cbCreate('#poIeWorktimeId', 'worktime', 'tenantId=0', {text:'사용안함', value:'0'}) */}
            <Form.Item name="ieWorktimeId" label="업무시간 설정">
              <Select
                options={worktimeOptions}
                placeholder="사용안함"
                allowClear
                onChange={(val) => {
                  // 업무시간 해제 시 하위 필드 초기화
                  if (!val || val === 0) {
                    form.setFieldsValue({ worktimeOpt: 0, guideMentId: null });
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="worktimeOpt" label="업무시간 외 제어" rules={ieWorktimeId && ieWorktimeId !== 0 ? [{ required: true, message: '업무시간 외 제어는 필수입니다' }] : []}>
              <Select options={[...WORKTIME_OPT_OPTIONS]} disabled={!ieWorktimeId || ieWorktimeId === 0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            {/* SWAT IPR20S1010.jsp line 961: cbCreate('#poGuideMentId', 'ment', 'tenantId=0&nodeId='+nodeId, {text:'없음', value:'0'}) */}
            <Form.Item
              name="guideMentId"
              label="업무시간 외 안내멘트"
              rules={ieWorktimeId && ieWorktimeId !== 0 && (worktimeOpt === 2 || worktimeOpt === 4) ? [{ required: true, message: '안내멘트는 필수입니다' }] : []}
            >
              <Select options={mentOptions} placeholder="없음" allowClear disabled={!ieWorktimeId || ieWorktimeId === 0 || (worktimeOpt !== 2 && worktimeOpt !== 4)} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // 장비 등록 (regUseYn===1 일 때만 필수) + SSW 벤더
  function renderDeviceSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            {/* SWAT IPR20S1010.jsp doUpdate() line 911-916: 인증번호 1건 이상이면 SSW벤더 disabled */}
            <Form.Item name="sswVendor" label="SSW 벤더">
              <Select options={[...SSW_VENDOR_OPTIONS]} disabled={sswVendorDisabled} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="regUseYn" label="장비 등록 사용여부" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="regNum"
              label="장비 등록 번호"
              rules={
                regUseYn === 1
                  ? [
                      { required: true, message: '등록번호는 필수입니다' },
                      { max: 50, message: '50자 이내여야 합니다' },
                      // SWAT IPR20S1010.jsp callProcess() line 1157-1161: 숫자+특수문자 패턴
                      { pattern: /^[0-9~!@#$%^&*()_+|<>?:{}]+$/, message: '숫자와 특수문자만 입력 가능합니다' },
                    ]
                  : []
              }
            >
              <Input placeholder="등록번호" maxLength={50} disabled={regUseYn !== 1} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="regId"
              label="장비 등록 아이디"
              rules={
                regUseYn === 1
                  ? [
                      { required: true, message: '등록 아이디는 필수입니다' },
                      { max: 20, message: '20자 이내여야 합니다' },
                      // SWAT IPR20S1010.jsp iValidator line 1102: pattern ^[0-9a-zA-Z_]+$ 한글/특수문자 금지
                      { pattern: /^[0-9a-zA-Z_]+$/, message: '영문자·숫자·_만 입력 가능합니다' },
                    ]
                  : []
              }
            >
              <Input placeholder="등록 아이디" maxLength={20} disabled={regUseYn !== 1} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="regPwd" label="장비 등록 비밀번호" rules={regUseYn === 1 ? [{ required: true, message: '등록 비밀번호는 필수입니다' }] : []}>
              <Input.Password placeholder="비밀번호" disabled={regUseYn !== 1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="regInterval" label="장비 등록 주기(초)" rules={regUseYn === 1 ? [{ required: true, message: '등록 주기는 필수입니다' }] : []}>
              <InputNumber min={0} className="!w-full" disabled={regUseYn !== 1} />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // 네트워크 / 위치
  function renderNetworkSection() {
    return (
      <>
        <Row gutter={20}>
          {/* DR 노드: endptType=4(WebRTC)이면 숨김 → 행 앞쪽에 배치, 숨김 시 열 정렬 유지 위해 뒤 필드가 채움 */}
          {String(endptType) !== '4' && (
            <Col span={6}>
              <Form.Item name="drnodeId" label="DR 노드">
                <Select options={drNodeOptions} allowClear placeholder="선택" />
              </Form.Item>
            </Col>
          )}
          <Col span={6}>
            <Form.Item name="transportType" label="Transport 타입">
              <Select options={[...TRANSPORT_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="sipProfileId" label="SIP 프로파일">
              <Select options={sipProfileOptions} allowClear placeholder="선택" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="locationNodeId" label="장비위치">
              <Select options={nodeOptions} allowClear placeholder="선택" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="routingNodeId" label="라우팅위치">
              <Select options={nodeOptions} allowClear placeholder="선택" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="snmpOid"
              label="라우팅 OID"
              rules={
                routingNodeId
                  ? [
                      { required: true, message: '라우팅 OID는 필수입니다' },
                      { max: 50, message: '50자 이내여야 합니다' },
                    ]
                  : []
              }
            >
              <Input placeholder="OID" maxLength={50} disabled={!routingNodeId} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="allocMethod" label="서버 할당방식">
              <Select options={[...ALLOC_METHOD_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="regMethod" label="등록 방식">
              <Select options={[...REG_METHOD_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="domainName" label="도메인">
              <Input placeholder="도메인" maxLength={63} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="wanNetworkYn" label="WAN IP 사용여부" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // 모니터링 / 부가 (감시·추적 / UserAgent / 국가번호)
  function renderMonitorSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="monitorYn" label="모니터링 여부" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            {/* SWAT IPR20S1010.jsp callProcess() line 1191-1195: 감시주기 1초 이상 */}
            <Form.Item name="watchInterval" label="감시 주기(초)">
              <InputNumber min={1} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="failCnt" label="감시실패 제한수">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="msgTraceYn" label="호추적 여부" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="blockYn" label="블럭 여부" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">UserAgent</h4>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="userAgentChk" label="UserAgent 검사" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="userAgentRegex" label="UA 패턴" rules={[{ max: 256, message: '256자 이내여야 합니다' }]}>
              <Input placeholder="정규식 패턴" maxLength={256} disabled={userAgentChk !== 1} />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">DNIS 추가 / 국가번호</h4>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              name="addDigit"
              label="DNIS 추가 Digit"
              rules={[
                { max: 24, message: '24자 이내여야 합니다' },
                { pattern: /^[0-9]*$/, message: '숫자만 입력 가능합니다' },
              ]}
            >
              <Input placeholder="숫자" maxLength={24} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="countryCodeUseYn" label="국가번호 사용" {...switchProps}>
              <Switch />
            </Form.Item>
          </Col>
          {/* 국가번호: 사용 시에만 노출 → 행 뒤쪽 배치 */}
          {countryCodeUseYn === 1 && (
            <Col span={6}>
              <Form.Item name="countryId" label="국가번호">
                <Select options={countryOptions} showSearch optionFilterProp="label" placeholder="미지정" allowClear className="!w-full" />
              </Form.Item>
            </Col>
          )}
        </Row>
      </>
    );
  }

  // 중개 NAT
  function renderNatSection() {
    return (
      <>
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="natOption" label="중개 옵션">
              <Select options={[...NAT_OPTION_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            {/* SWAT IPR20S1010.jsp line 787/1008: cbCreate('#poMsGroupId', 'msGroup', 'nodeId='+nodeId) */}
            <Form.Item name="msGroupId" label="MS그룹" rules={natOption !== 0 && natOption !== undefined ? [{ required: true, message: 'MS그룹은 필수입니다' }] : []}>
              <Select options={msGroupOptions} placeholder="미지정" disabled={!natOption || natOption === 0} allowClear />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="drnatOption" label="중개 옵션(DR)">
              <Select options={[...NAT_OPTION_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="msDrgroupId" label="MS그룹(DR)" rules={drnatOption !== 0 && drnatOption !== undefined ? [{ required: true, message: 'MS그룹(DR)은 필수입니다' }] : []}>
              {/* AS-IS: SWAT onChangedDrNode() — DR 노드 변경 시 해당 노드의 MS그룹 목록 재조회 */}
              <Select options={drMsGroupOptions} placeholder="미지정" disabled={!drnatOption || drnatOption === 0 || !watchedDrnodeId || watchedDrnodeId === 0} allowClear />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="text-xs text-gray-400 mt-2 mb-2 pb-1 border-b border-gray-100">NAT 설정</h4>

        <Row gutter={20}>
          <Col span={6}>
            <Form.Item name="enatOption" label="NAT 동작옵션">
              <Select options={[...ENAT_OPTION_OPTIONS]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="natIpAddress"
              label="NAT IP 주소"
              rules={[
                {
                  pattern: /^((\d{1,3}\.){3}\d{1,3})?$/,
                  message: '올바른 IPv4 형식이 아닙니다',
                },
              ]}
            >
              <Input placeholder="0.0.0.0" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }

  // ─── 섹션 구성 (필수=펼침 강조, 선택=중립 카드) ─────────────────────────────
  // content 는 항상 렌더 → 접힌 섹션 Form.Item 도 마운트 유지 → 값 등록/검증 정상 동작
  const sections = [
    { key: SECTION_KEYS.BASIC, title: '기본정보', icon: <ClipboardList className="size-4" />, required: true, content: renderBasicSection() },
    { key: SECTION_KEYS.DNIS, title: 'DNIS 편집', icon: <Hash className="size-4" />, required: true, content: renderDnisSection() },
    { key: SECTION_KEYS.DEVICE, title: '장비 등록', icon: <Server className="size-4" />, required: false, content: renderDeviceSection() },
    { key: SECTION_KEYS.NETWORK, title: '네트워크 / 위치', icon: <Network className="size-4" />, required: false, content: renderNetworkSection() },
    { key: SECTION_KEYS.MONITOR, title: '모니터링 / 부가', icon: <Activity className="size-4" />, required: false, content: renderMonitorSection() },
    { key: SECTION_KEYS.NAT, title: '중개 NAT', icon: <Waypoints className="size-4" />, required: false, content: renderNatSection() },
  ];

  // ─── Footer ─────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('/ipron/line/endpoint')}>
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

  // ─── Summary Panel ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const values = currentValues;
    // 필수 항목 미입력 판정 (요약에서 빨간 "미입력" 노출용)
    const missing = (key: string) => !isFilled(values[key]);
    const worktimeOn = !!values.ieWorktimeId && values.ieWorktimeId !== 0;
    const mentRequired = worktimeOn && (values.worktimeOpt === 2 || values.worktimeOpt === 4);

    return (
      <div className="space-y-4 text-sm">
        {/* 기본정보 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">기본정보</div>
          <SummaryRow label="국선명" required missing={missing('endptName')} value={displayValue(values.endptName)} />
          <SummaryRow label="구분" required missing={missing('endptType')} value={displayValue(getLabelByValue(ENDPOINT_TYPE_OPTIONS, values.endptType))} />
          <SummaryRow label="인/아웃 최대채널" required missing={missing('endptMaxchnl')} value={displayValue(values.endptMaxchnl)} />
          <SummaryRow label="아웃할당채널" required missing={missing('endptDodchnl')} value={displayValue(values.endptDodchnl)} />
          <SummaryRow label="노드" required missing={missing('nodeId')} value={displayValue(nodeOptions.find((n) => n.value === values.nodeId)?.label)} />
          <SummaryRow label="음성보안" required missing={missing('srtpYn')} value={displayValue(getLabelByValue(SRTP_OPTIONS, values.srtpYn))} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* DNIS 편집 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">DNIS 편집</div>
          <SummaryRow label="DNIS 편집 Digit수" required missing={missing('delCount')} value={displayValue(values.delCount)} />
          <SummaryRow label="편집 옵션" required missing={missing('editOpt')} value={displayValue(getLabelByValue(EDIT_OPT_OPTIONS, values.editOpt))} />
          <SummaryRow label="업무시간 설정" value={displayValue(worktimeOptions.find((w) => w.value === values.ieWorktimeId)?.label ?? values.ieWorktimeId)} />
          {worktimeOn && (
            <>
              <SummaryRow label="  업무시간 외" required missing={missing('worktimeOpt')} value={displayValue(getLabelByValue(WORKTIME_OPT_OPTIONS, values.worktimeOpt))} />
              {mentRequired && (
                <SummaryRow label="  안내멘트" required missing={missing('guideMentId')} value={displayValue(mentOptions.find((m) => m.value === values.guideMentId)?.label)} />
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 장비 등록 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">장비 등록</div>
          <SummaryRow label="SSW 벤더" value={displayValue(getLabelByValue(SSW_VENDOR_OPTIONS, values.sswVendor))} />
          <SummaryRow label="장비 등록" value={values.regUseYn === 1 ? '사용' : '미사용'} />
          {values.regUseYn === 1 && (
            <>
              <SummaryRow label="  등록번호" required missing={missing('regNum')} value={displayValue(values.regNum)} />
              <SummaryRow label="  등록 아이디" required missing={missing('regId')} value={displayValue(values.regId)} />
              <SummaryRow label="  등록 비밀번호" required missing={missing('regPwd')} value={values.regPwd ? '••••••' : ''} />
              <SummaryRow label="  등록 주기" required missing={missing('regInterval')} value={displayValue(values.regInterval)} />
            </>
          )}
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 네트워크 / 위치 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">네트워크 / 위치</div>
          <SummaryRow label="DR 노드" value={displayValue(drNodeOptions.find((n) => n.value === values.drnodeId)?.label)} />
          <SummaryRow label="Transport 타입" value={displayValue(getLabelByValue(TRANSPORT_OPTIONS, values.transportType))} />
          <SummaryRow label="SIP 프로파일" value={displayValue(sipProfileOptions.find((p) => p.value === values.sipProfileId)?.label)} />
          <SummaryRow label="장비위치" value={displayValue(nodeOptions.find((n) => n.value === values.locationNodeId)?.label)} />
          <SummaryRow label="라우팅위치" value={displayValue(nodeOptions.find((n) => n.value === values.routingNodeId)?.label)} />
          {values.routingNodeId && <SummaryRow label="  라우팅 OID" required missing={missing('snmpOid')} value={displayValue(values.snmpOid)} />}
          <SummaryRow label="서버 할당방식" value={displayValue(getLabelByValue(ALLOC_METHOD_OPTIONS, values.allocMethod))} />
          <SummaryRow label="등록 방식" value={displayValue(getLabelByValue(REG_METHOD_OPTIONS, values.regMethod))} />
          <SummaryRow label="도메인" value={displayValue(values.domainName)} />
          <SummaryRow label="WAN IP" value={values.wanNetworkYn === 1 ? '사용' : '미사용'} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 모니터링 / 부가 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">모니터링 / 부가</div>
          <SummaryRow label="모니터링 여부" value={values.monitorYn === 1 ? '사용' : '미사용'} />
          <SummaryRow label="감시 주기" value={displayValue(values.watchInterval)} />
          <SummaryRow label="감시실패 제한수" value={displayValue(values.failCnt)} />
          <SummaryRow label="호추적 여부" value={values.msgTraceYn === 1 ? '사용' : '미사용'} />
          <SummaryRow label="블럭 여부" value={values.blockYn === 1 ? '설정' : '해제'} />
          <SummaryRow label="UserAgent 검사" value={values.userAgentChk === 1 ? '사용' : '미사용'} />
          {values.userAgentChk === 1 && <SummaryRow label="  UA 패턴" value={displayValue(values.userAgentRegex)} />}
          <SummaryRow label="DNIS 추가 Digit" value={displayValue(values.addDigit)} />
          <SummaryRow label="국가번호" value={values.countryCodeUseYn === 1 ? '사용' : '미사용'} />
        </div>

        <div className="border-t border-gray-100 my-3" />

        {/* 중개 NAT */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">중개 NAT</div>
          <SummaryRow label="중개 옵션" value={displayValue(getLabelByValue(NAT_OPTION_OPTIONS, values.natOption))} />
          <SummaryRow label="중개 옵션(DR)" value={displayValue(getLabelByValue(NAT_OPTION_OPTIONS, values.drnatOption))} />
          {values.natOption !== 0 && (
            <SummaryRow
              label="MS그룹"
              required
              missing={missing('msGroupId')}
              value={displayValue(msGroupOptions.find((g) => g.value === values.msGroupId)?.label ?? values.msGroupId)}
            />
          )}
          {values.drnatOption !== 0 && (
            <SummaryRow
              label="MS그룹(DR)"
              required
              missing={missing('msDrgroupId')}
              value={displayValue(drMsGroupOptions.find((g) => g.value === values.msDrgroupId)?.label ?? values.msDrgroupId)}
            />
          )}
          <SummaryRow label="NAT 동작옵션" value={displayValue(getLabelByValue(ENAT_OPTION_OPTIONS, values.enatOption))} />
          <SummaryRow label="NAT IP 주소" value={displayValue(values.natIpAddress)} />
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Main (left: form, right: summary) */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* Left Form */}
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
                  initialValues={{ ...ENDPOINT_INITIAL_VALUES, ...(defaultNodeId ? { nodeId: defaultNodeId } : {}) }}
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
                        icon={s.icon}
                        required={s.required}
                        open={activeKeys.includes(s.key)}
                        onToggle={toggleSection}
                        hint={s.required ? undefined : renderSectionHint(configuredCount(s.key))}
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

        {/* Right Summary Panel */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 선택 섹션 헤더 힌트 ("N개 설정됨" / "선택 항목") ────────────────────────
function renderSectionHint(count: number) {
  if (count > 0) {
    return <span className="text-xs font-medium text-[#405189]">{count}개 설정됨</span>;
  }
  return <span className="text-xs text-gray-300">선택 항목</span>;
}

// ─── FormSection — 커스텀 아코디언 카드 ─────────────────────────────────────────
// 필수 섹션: 옅은 brand 틴트 보더로 강조 / 선택 섹션: 중립 흰 카드.
// children 은 항상 마운트, grid-rows 트랜지션으로 부드럽게 펼침/접힘 (Form 등록 유지).
interface FormSectionProps {
  sectionKey: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (key: string) => void;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({ sectionKey, title, icon, open, onToggle, required = false, hint, children }: FormSectionProps) {
  const cardClass = required ? 'border-[#405189]/30 bg-[#405189]/[0.02]' : 'border-gray-200 bg-white';
  const iconChipClass = required ? 'bg-[#405189] text-white' : 'bg-gray-100 text-gray-500 group-hover:text-[#405189]';
  const gridClass = open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0';

  return (
    <section className={`rounded-xl border ${cardClass} bt-shadow transition-colors`}>
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={open}
        className="group flex items-center gap-3 w-full px-4 py-3.5 text-left rounded-xl hover:bg-black/[0.015] transition-colors"
      >
        <span className={`flex items-center justify-center size-8 rounded-lg shrink-0 transition-colors ${iconChipClass}`}>{icon}</span>
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-800 text-[15px] truncate">{title}</span>
          {required && <span className="size-1.5 rounded-full bg-[#405189] shrink-0" aria-label="필수 섹션" />}
        </span>
        <span className="ml-auto flex items-center gap-3 shrink-0">
          {hint}
          <ChevronDown className={`size-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${gridClass}`}>
        <div className="overflow-hidden min-h-0">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
// required: 해당 Form.Item 이 필수인 항목 (조건부 필수는 그 조건일 때만 required 전달)
// missing: 필수인데 아직 값이 없는 항목 → 빨간 "미입력" 노출
function SummaryRow({ label, value, required = false, missing = false }: { label: string; value: React.ReactNode; required?: boolean; missing?: boolean }) {
  const isMissing = required && missing;
  const valueClass = isMissing ? 'text-red-500 font-medium flex-1' : 'text-gray-800 font-medium flex-1';

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
