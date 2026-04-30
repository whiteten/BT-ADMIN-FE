/**
 * DN 등록/수정 폼 페이지 (IPR20S2020)
 * Pattern: DidRouteFormPage / DnProfileFormPage 표준 (Steps Wizard + 우측 Summary Panel)
 *
 * Step 1 "기본/IP":
 *   - DN번호 / DN유형 / 내선프로파일 / COS
 *   - IP버전 / IP유형(고정/동적 radio) / IPv4 / IPv6 / 포트 / IP업데이트
 *   - DR노드 / Global DN
 *
 * Step 2 "인증/단말기":
 *   - MD5 인증 on/off (조건부 required ID/PW)
 *   - 전송유형 / SRTP
 *   - 사용자명 / 상담원 기본상태 / DN 상태
 *   - 단말기 유형 / MAC 주소 / 라인번호
 *
 * Step 3 "부가설정/IPT":
 *   - 호추적 / 내선블럭 / SNR / 착신금지 / 발신금지 / 자동미디어전달 (SwitchBox grid-cols-3)
 *   - 지정발신번호 / 개별과금번호 / 내선간 발신
 *   - 자동응답 / 벨울림 횟수
 *   - 픽업그룹 / 발신제한그룹 / 그룹DN
 *   - 기본/국선 멘트 (RB / MOH / CO_RB / CO_MOH)
 *
 * 우측: Summary Panel 320px 실시간 요약
 *
 * Validation:
 *  - md5Auth=1 → ID/PW 필수
 *  - extAuthtype=1(고정) → IPv4 or IPv6 중 하나 이상 필수
 *  - nodeId == backUpNodeId 금지
 */
import { useEffect, useMemo, useState } from 'react';

/**
 * MD5 인증 비밀번호 마스킹 더미 — 수정 화면 진입 시 비번 설정됨을 시각적으로 표시하기 위한 sentinel.
 * 8자라 길이 검증(8~16)을 통과한다. 저장 시 이 값 그대로면 변경 없음 → null 로 BE에 전달.
 */
const MD5_PWD_MASK = '__MD5KEEP';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, Input, InputNumber, Row, Select, Steps, Switch, Tooltip } from 'antd';
import { Lock as LockOutlined } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetDnProfileNodeTenants, useGetDnProfileNodes, useGetDnProfileTenants } from '../../dn-profile/hooks/useDnProfileQueries';
import DnCallTransferDrawer from '../components/DnCallTransferDrawer';
import DnScaTab from '../components/DnScaTab';
import DnShortDialDrawer from '../components/DnShortDialDrawer';
import DnSnrTab from '../components/DnSnrTab';
import DnSummaryPanel from '../components/DnSummaryPanel';
import { dnQueryKeys, useCreateDn, useDeleteDns, useGetDnCosEffect, useGetDnDetail, useGetDnOptions, useUpdateDn } from '../hooks/useDnQueries';
import { DN_INITIAL_VALUES, type DnCreateRequest, type DnUpdateRequest } from '../types/dn.types';
import { ADN_DEFAULT_STATE_OPTIONS, DN_STATUS_OPTIONS, DN_TYPE_OPTIONS_PRIMARY, IP_VERSION_OPTIONS, TRANSPORT_TYPE_OPTIONS } from '../utils/dnEnums';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * 공용 SwitchBox — CosFormPage 패턴 복제.
 * 0/1 Integer 값을 Switch로 표현.
 */
function SwitchBox({
  name,
  label,
  disabled,
  cosLocked,
  cosDependent,
}: {
  name: string;
  label: string;
  disabled?: boolean;
  /** COS가 값 강제 (항상 잠김) — 파란색 + 자물쇠 */
  cosLocked?: boolean;
  /** COS 서비스 값=1이면 편집 허용, 아니면 잠김 — 앰버색 */
  cosDependent?: boolean;
}) {
  let containerCls = 'flex items-center justify-between py-2 px-3 rounded-md border border-gray-100 bg-gray-50';
  let textCls = 'text-gray-700';
  let iconCls = '';
  let tipText: string | null = null;
  if (cosLocked) {
    containerCls = 'flex items-center justify-between py-2 px-3 rounded-md border border-blue-200 bg-blue-50';
    textCls = 'text-blue-700';
    iconCls = 'text-blue-500';
    tipText = 'COS 설정을 따릅니다 (내선에서 수정 불가)';
  } else if (cosDependent) {
    containerCls = 'flex items-center justify-between py-2 px-3 rounded-md border border-amber-200 bg-amber-50';
    textCls = 'text-amber-700';
    iconCls = 'text-amber-500';
    tipText = disabled ? 'COS 설정에서 해제되어 편집 불가 (COS에서 허용 시 편집 가능)' : 'COS 설정에 의해 편집 허용됨';
  }
  const row = (
    <div className={containerCls}>
      <span className={`text-sm ${textCls} flex items-center gap-1`}>
        {label}
        {(cosLocked || cosDependent) && <LockOutlined className={`text-[10px] ${iconCls}`} />}
      </span>
      <Form.Item
        name={name}
        valuePropName="checked"
        noStyle
        getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
        getValueProps={(value: number) => ({ checked: value === 1 })}
      >
        <Switch size="small" disabled={disabled} checkedChildren="ON" unCheckedChildren="OFF" />
      </Form.Item>
    </div>
  );
  return tipText ? <Tooltip title={tipText}>{row}</Tooltip> : row;
}

/** COS 잠금 필드의 label을 파란색 + 자물쇠 아이콘으로 꾸미기. (group: 항상 잠김) */
function cosLockedLabel(label: string, locked: boolean) {
  if (!locked) return label;
  return (
    <span className="text-blue-700 inline-flex items-center gap-1">
      {label}
      <LockOutlined className="text-blue-500 text-xs" />
    </span>
  );
}

/** COS 의존 필드(personal: COS=1이면 편집 허용)의 label을 앰버색으로 꾸미기. */
function cosDependentLabel(label: string, dependent: boolean) {
  if (!dependent) return label;
  return (
    <span className="text-amber-700 inline-flex items-center gap-1">
      {label}
      <LockOutlined className="text-amber-500 text-xs" />
    </span>
  );
}

const STEPS_CREATE = [
  { key: 'basic', title: '기본정보' },
  { key: 'feature', title: '부가기능' },
  { key: 'ipt', title: 'IPT서비스' },
  { key: 'term', title: '착신설정' },
];

const STEPS_EDIT_EXTRA = [
  { key: 'snr', title: 'SNR' },
  { key: 'sca', title: 'SCA' },
];

export default function DnFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : undefined;
  const defaultTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : undefined;

  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm();
  const [currentTab, setCurrentTab] = useState<string>('basic');
  const [callTransferOpen, setCallTransferOpen] = useState(false);
  const [shortDialOpen, setShortDialOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const isEditMode = !!id;
  const dnId = id ? Number(id) : null;
  const steps = useMemo(() => (isEditMode ? [...STEPS_CREATE, ...STEPS_EDIT_EXTRA] : STEPS_CREATE), [isEditMode]);
  const currentStepIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === currentTab),
  );

  // ─── Watch fields ─────────────────────────────────────────────────────────
  const watchedNodeId = Form.useWatch('nodeId', form);
  const watchedTenantId = Form.useWatch('tenantId', form);
  const watchedDnType = Form.useWatch('dnType', form);
  const watchedMd5Auth = Form.useWatch('md5Auth', form);
  const watchedExtAuthtype = Form.useWatch('extAuthtype', form);
  const watchedShortDialSvc = Form.useWatch('shortDialSvc', form);
  const watchedIpVersion = Form.useWatch('ipVersion', form);
  const watchedAutoanswerYn = Form.useWatch('autoanswerYn', form);
  const watchedBackUpNodeId = Form.useWatch('backUpNodeId', form);
  const watchedCosId = Form.useWatch('cosId', form);

  // 조건부 disabled/required
  const isMd5Required = watchedMd5Auth === 1;
  const isFixedIp = watchedExtAuthtype === '1';
  // 고정IP=IPv4/IPv6/포트 활성, IP업데이트 강제 해제
  // 동적IP=IPv4/IPv6/포트 비활성, IP업데이트 활성
  // ※ IP 버전 선택으로는 IPv4/IPv6 입력 제어하지 않음 (사용자 자유 입력)
  const isIpv4Disabled = !isFixedIp;
  const isIpv6Disabled = !isFixedIp;
  const isPortDisabled = !isFixedIp;
  const isExtIpUpdateDisabled = isFixedIp;

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetDnProfileNodeTenants();
  const { data: dnDetail, isFetching } = useGetDnDetail(dnId);

  // 테넌트 옵션 — 선택 노드 할당된 테넌트만
  const tenantOptions = useMemo(() => {
    if (!watchedNodeId) return [];
    const ids = new Set(nodeTenants.filter((nt) => nt.nodeId === watchedNodeId).map((nt) => nt.tenantId));
    return tenants.filter((t) => ids.has(t.tenantId)).map((t) => ({ label: t.tenantName, value: t.tenantId }));
  }, [watchedNodeId, tenants, nodeTenants]);

  // 노드 옵션 — 할당된 노드만
  const nodeOptions = useMemo(() => {
    const assignedNodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => assignedNodeIds.has(n.nodeId)).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, nodeTenants]);

  // 옵션 일괄 조회
  const optionsParams = useMemo(() => {
    if (watchedNodeId && watchedTenantId) {
      return {
        nodeId: watchedNodeId as number,
        tenantId: watchedTenantId as number,
        dnType: (watchedDnType ?? null) as string | null,
      };
    }
    return null;
  }, [watchedNodeId, watchedTenantId, watchedDnType]);
  const { data: options } = useGetDnOptions(optionsParams);

  // ext IP 유형 전환 시 비활성 필드 값 정리
  useEffect(() => {
    if (watchedExtAuthtype === '1') {
      // 고정 IP: IP 업데이트 강제 해제 + 포트 기본값 5060 보장
      const patch: Record<string, unknown> = {};
      if (form.getFieldValue('extIpUpdate') !== 0) patch.extIpUpdate = 0;
      if (!form.getFieldValue('portNo')) patch.portNo = 5060;
      if (Object.keys(patch).length) form.setFieldsValue(patch);
    } else if (watchedExtAuthtype === '2') {
      // 동적 IP: IPv4/IPv6 서버에서 의미 없으므로 클리어 (포트는 5060 유지)
      form.setFieldsValue({ ipv4Address: null, ipv6Address: null });
    }
  }, [watchedExtAuthtype, form]);

  // 신규 등록: 테넌트 선택되고 cosId 비어있으면 기본 COS(AS-IS: cosId==tenantId)로 자동 세팅
  useEffect(() => {
    if (isEditMode) return;
    if (!options?.defaultCosId) return;
    if (form.getFieldValue('cosId')) return;
    form.setFieldsValue({ cosId: options.defaultCosId });
    setFormValues((prev: Record<string, unknown>) => ({
      ...(prev ?? DN_INITIAL_VALUES),
      cosId: options.defaultCosId,
    }));
  }, [isEditMode, options?.defaultCosId, form]);

  // 단말기 MAC/라인번호 툴팁 — 설정된 값이 있을 때만 노출
  const watchedMacAddress = Form.useWatch('macAddress', form);
  const watchedChnlIdx = Form.useWatch('chnlIdx', form);
  const deviceTooltip = useMemo(() => {
    const parts: string[] = [];
    if (watchedMacAddress) parts.push(`MAC: ${watchedMacAddress}`);
    if (watchedChnlIdx != null && watchedChnlIdx !== '') parts.push(`라인번호: ${watchedChnlIdx}`);
    return parts.length > 0 ? parts.join('\n') : null;
  }, [watchedMacAddress, watchedChnlIdx]);

  // 선택된 프로파일의 DR/MS 요약 (툴팁)
  const watchedDnProfileId = Form.useWatch('dnProfileId', form);
  const selectedProfileTooltip = useMemo(() => {
    const p = (options?.dnProfiles ?? []).find((x) => x.id === watchedDnProfileId);
    if (!p) return null;
    const drNodeName = p.drNodeId ? (nodes.find((n) => n.nodeId === p.drNodeId)?.nodeName ?? `#${p.drNodeId}`) : '미지정';
    const lines = [
      `DR 노드: ${drNodeName}`,
      `Global DN: ${p.globalDnYn === 1 ? '설정' : '해제'}`,
      `RTP 옵션: ${p.rtpOption === 1 ? '사용' : '미사용'} / DR RTP: ${p.drRtpOption === 1 ? '사용' : '미사용'}`,
      `MS 그룹: ${p.msGroupId && p.msGroupId !== 0 ? `#${p.msGroupId}` : '미지정'}`,
      `미디어 전달: ${p.mediaDeliveryId && p.mediaDeliveryId !== 0 ? `#${p.mediaDeliveryId}` : '미지정'}${p.drMediaDeliveryId && p.drMediaDeliveryId !== 0 ? ` / DR #${p.drMediaDeliveryId}` : ''}`,
    ];
    return lines.join('\n');
  }, [options?.dnProfiles, watchedDnProfileId, nodes]);

  // COS 변경 시 서버가 계산한 필드 제어 규칙 조회 (AS-IS applyCosSettings 이전)
  const { data: cosEffect } = useGetDnCosEffect(watchedCosId);

  // cosEffect.group: COS 값을 DN 필드에 강제 복사 + disabled
  useEffect(() => {
    if (cosEffect?.group) {
      form.setFieldsValue(cosEffect.group);
    }
  }, [cosEffect, form]);

  // Group 필드는 항상 disabled (COS가 강제). undefined면 잠그지 않음.
  const groupLocked = (name: keyof NonNullable<typeof cosEffect>['group']) => cosEffect?.group != null && name in cosEffect.group;

  // COS 선택이 DN에 미치는 영향 요약 (드롭다운 툴팁용)
  const cosEffectTooltip = useMemo(() => {
    if (!cosEffect) return null;
    const groupLabels: Record<string, string> = {
      dnTblYn: '착신금지',
      dnOblYn: '발신금지',
      dodLimitId: '발신제한 그룹',
      dodNumAllow: '특정번호 발신허용',
      dodNumPattern: '발신허용 패턴',
      callScreenSvc: '특정번호 착신금지',
      callScreenNum: '착신금지 패턴',
      coachingSvc: '코칭서비스',
      monitorSvc: '감청서비스',
      ignoreBugsCoaching: '피감청/피코칭방지',
    };
    const editableLabels: Record<string, string> = {
      autoanswerYn: '자동 응답',
      shortDialSvc: '단축다이얼',
      callReserveSvc: '통화예약',
      unknownDeny: '익명호 거부',
      dodNameSvc: '발신이름 표시',
      busyWaitSvc: '통화중대기',
      absenceSvc: '부재중안내',
      autoReturnSvc: '자동 호 회수',
      mvaSvc: '모바일 원격접근',
      callAvoidSvc: '호회피',
      cidDenySvc: '발신자정보 표시방지',
      denySvc: '착신거부',
      transSvc: '착신전환',
      moveAnsSvc: '이동 응답',
      intercomOrigSvc: '인터콤 발신',
      intercomTermSvc: '인터콤 착신',
      didReleaseTone: '통화종료음',
      trnsOkTone: '호전환완료음',
      silentTermSvc: '무음착신',
      cidExternSvc: '확장 CID',
    };
    const fmt = (v: unknown) => {
      if (v === 1) return 'ON';
      if (v === 0) return 'OFF';
      if (v == null || v === '') return '미지정';
      return String(v);
    };
    const groupRows = Object.entries(cosEffect.group ?? {})
      .map(([k, v]) => `  • ${groupLabels[k] ?? k}: ${fmt(v)}`)
      .join('\n');
    const editRows = Object.entries(cosEffect.editable ?? {})
      .map(([k, v]) => `  • ${editableLabels[k] ?? k}: ${v ? '편집 허용' : '잠김'}`)
      .join('\n');
    return ['■ 자동 설정 (내선에서 수정 불가)', groupRows || '  (없음)', '', '■ 편집 허용 여부', editRows || '  (없음)'].join('\n');
  }, [cosEffect]);
  // Personal 필드: editable=false면 disabled.
  const personalDisabled = (name: string) => cosEffect?.editable != null && cosEffect.editable[name] === false;
  // Personal 필드 여부: COS 효과가 로드됐고 editable 맵에 키가 있으면 COS 의존 필드
  const cosControlled = (name: string) => cosEffect?.editable != null && name in cosEffect.editable;

  // 드롭다운 옵션 변환 (미지정 prepend)
  const withUnset = <T extends { label: string; value: unknown }>(opts: T[], label = '미지정') => [{ label, value: null } as unknown as T, ...opts];

  const dnProfileOptions = useMemo(() => (options?.dnProfiles ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  // COS 는 테넌트 생성 시 기본 COS 가 자동 생성되므로 "미지정" 옵션 제공하지 않음 (AS-IS 규칙).
  // defaultCosId 로 자동 세팅 + 사용자가 실제 생성된 COS 중에서만 선택.
  const cosOptions = useMemo(() => (options?.cos ?? []).map((o) => ({ label: o.name, value: o.id })), [options]);
  const deviceTypeOptions = useMemo(
    () =>
      withUnset(
        (options?.deviceTypes ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '미사용',
      ),
    [options],
  );
  const pickupGrpOptions = useMemo(() => withUnset((options?.pickupGrps ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const dodLimitOptions = useMemo(
    () =>
      withUnset(
        (options?.dodLimits ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const origGrpdnOptions = useMemo(
    () =>
      withUnset(
        (options?.origGrpdns ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const rbMentOptions = useMemo(
    () =>
      withUnset(
        (options?.rbMents ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const mohMentOptions = useMemo(
    () =>
      withUnset(
        (options?.mohMents ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const coRbMentOptions = useMemo(
    () =>
      withUnset(
        (options?.coRbMents ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const coMohMentOptions = useMemo(
    () =>
      withUnset(
        (options?.coMohMents ?? []).map((o) => ({ label: o.name, value: o.id as number | null })),
        '없음',
      ),
    [options],
  );
  const mediaDeliveryOptions = useMemo(() => withUnset((options?.mediaDeliveries ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const msGroupOptions = useMemo(() => withUnset((options?.msGroups ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);
  const drNodeOptions = useMemo(() => withUnset((options?.drNodes ?? []).map((o) => ({ label: o.name, value: o.id as number | null }))), [options]);

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (dnDetail && isEditMode) {
      const vals: Partial<DnCreateRequest> & { backUpNodeId?: number | null } = {
        nodeId: dnDetail.nodeId,
        tenantId: dnDetail.tenantId,
        dnNo: dnDetail.dnNo,
        dnType: dnDetail.dnType,
        dnProfileId: dnDetail.dnProfileId,
        cosId: dnDetail.cosId,
        devMasterId: dnDetail.devMasterId,
        deviceType: dnDetail.deviceType,
        macAddress: null, // AS-IS 단말 정보 탭은 2차 범위
        ipVersion: dnDetail.ipVersion ?? '4',
        ipv4Address: dnDetail.ipv4Address,
        ipv6Address: dnDetail.ipv6Address,
        portNo: dnDetail.portNo,
        transportType: dnDetail.transportType ?? '1',
        extAuthtype: dnDetail.extAuthtype ?? '2',
        extIpUpdate: dnDetail.extIpUpdate ?? 0,
        backUpNodeId: dnDetail.backUpNodeId,
        globalDnYn: dnDetail.globalDnYn ?? 0,
        md5Auth: dnDetail.md5Auth ?? 0,
        md5Authid: dnDetail.md5Authid,
        // 보안상 복호화 값을 내려보내지 않으나, MD5 인증 사용 중인 수정 화면에서는
        // 비번이 설정되어 있음을 시각적으로 표시하기 위해 마스킹 더미를 채운다.
        // 저장 시 이 값 그대로면 변경 없음(null) 으로 BE에 전달.
        md5Authpwd: dnDetail.md5Auth === 1 ? MD5_PWD_MASK : null,
        srtpYn: dnDetail.srtpYn ?? 0,
        ieUserid: dnDetail.ieUserid,
        ieUserName: dnDetail.ieUserName,
        dnStatus: dnDetail.dnStatus ?? '0',
        adnDftState: dnDetail.adnDftState,
        chnlIdx: dnDetail.chnlIdx,
        provisionSeq: dnDetail.provisionSeq,
        traceYn: dnDetail.traceYn ?? 0,
        extBlockYn: dnDetail.extBlockYn ?? 0,
        snrYn: dnDetail.snrYn ?? 0,
        dnTblYn: dnDetail.dnTblYn ?? 0,
        dnOblYn: dnDetail.dnOblYn ?? 0,
        autoanswerYn: dnDetail.autoanswerYn ?? 0,
        autoanswerBellCnt: dnDetail.autoanswerBellCnt ?? 3,
        autoMdYn: dnDetail.autoMdYn ?? 0,
        dodAni: dnDetail.dodAni,
        chrgAni: dnDetail.chrgAni,
        internalAni: dnDetail.internalAni,
        pickupGrpId: dnDetail.pickupGrpId,
        dodLimitId: dnDetail.dodLimitId,
        origGrpdnId: dnDetail.origGrpdnId,
        rbMentId: dnDetail.rbMentId,
        mohMentId: dnDetail.mohMentId,
        coRbMentId: dnDetail.coRbMentId,
        coMohMentId: dnDetail.coMohMentId,
        mediaDeliveryId: dnDetail.mediaDeliveryId,
        msGroupId: dnDetail.msGroupId,
        msDrgroupId: dnDetail.msDrgroupId,
        // IPT 서비스 — 발신 부가서비스
        dodNumAllow: dnDetail.dodNumAllow ?? 0,
        dodNumPattern: dnDetail.dodNumPattern,
        monitorSvc: dnDetail.monitorSvc ?? 0,
        coachingSvc: dnDetail.coachingSvc ?? 0,
        callResvSvc: dnDetail.callResvSvc ?? 0,
        autoReturnSvc: dnDetail.autoReturnSvc ?? 0,
        intercomOrigSvc: dnDetail.intercomOrigSvc ?? 0,
        shortDialSvc: dnDetail.shortDialSvc ?? 0,
        dodNumSvc: dnDetail.dodNumSvc ?? 1,
        // IPT 서비스 — 착신 부가서비스
        callScreenSvc: dnDetail.callScreenSvc ?? 0,
        callScreenNum: dnDetail.callScreenNum,
        ignoreBugsCoaching: dnDetail.ignoreBugsCoaching ?? 0,
        unknownDeny: dnDetail.unknownDeny ?? 0,
        dodNameSvc: dnDetail.dodNameSvc ?? 0,
        busyWaitSvc: dnDetail.busyWaitSvc ?? 0,
        absenceSvc: dnDetail.absenceSvc ?? 0,
        mvaSvc: dnDetail.mvaSvc ?? 0,
        cidDenySvc: dnDetail.cidDenySvc ?? 0,
        callAvoidSvc: dnDetail.callAvoidSvc ?? 0,
        intercomTermSvc: dnDetail.intercomTermSvc ?? 0,
        didReleaseTone: dnDetail.didReleaseTone ?? 0,
        trnsOkTone: dnDetail.trnsOkTone ?? 0,
        multiCallForking: dnDetail.multiCallForking ?? 0,
        cidExternSvc: dnDetail.cidExternSvc ?? 0,
        silentTermSvc: dnDetail.silentTermSvc ?? 0,
        // 착신거부
        nonDidDeny: dnDetail.nonDidDeny ?? 0,
        caseDenySvc: dnDetail.caseDenySvc ?? 0,
        // 착신전환
        allTransSvc: dnDetail.allTransSvc ?? 0,
        allTransNum: dnDetail.allTransNum,
        noansTransSvc: dnDetail.noansTransSvc ?? 0,
        noansTransNum: dnDetail.noansTransNum,
        busyTransSvc: dnDetail.busyTransSvc ?? 0,
        busyTransNum: dnDetail.busyTransNum,
        caseTransSvc: dnDetail.caseTransSvc ?? 0,
        ctiTransMonSvc: dnDetail.ctiTransMonSvc ?? 0,
        // 기타전환
        moveAnsSvc: dnDetail.moveAnsSvc ?? 0,
        moveAnsNum: dnDetail.moveAnsNum,
        urTransSvc: dnDetail.urTransSvc ?? 0,
        urTransNum: dnDetail.urTransNum,
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [dnDetail, isEditMode, form]);

  // ─── Set default node/tenant (신규 등록 시) ──────────────────────────────
  useEffect(() => {
    if (!isEditMode) {
      const defaults: Record<string, unknown> = {};
      if (defaultNodeId) defaults.nodeId = defaultNodeId;
      if (defaultTenantId) defaults.tenantId = defaultTenantId;
      if (Object.keys(defaults).length > 0) {
        form.setFieldsValue(defaults);
        setFormValues((prev: Record<string, unknown>) => ({
          ...(prev ?? DN_INITIAL_VALUES),
          ...defaults,
        }));
      }
    }
  }, [isEditMode, defaultNodeId, defaultTenantId, form]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  // 등록/수정 후 목록 페이지로 돌아갈 때, 작업한 노드/테넌트 컨텍스트 유지
  const backToListUrl = () => {
    const values = form.getFieldsValue();
    const nodeId = values.nodeId ?? defaultNodeId;
    const tenantId = values.tenantId ?? defaultTenantId;
    const qs = new URLSearchParams();
    if (nodeId) qs.set('nodeId', String(nodeId));
    if (tenantId) qs.set('tenantId', String(tenantId));
    const s = qs.toString();
    return `/ipron/dn${s ? `?${s}` : ''}`;
  };

  const { mutate: createDn, isPending: isCreating } = useCreateDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN이 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
        navigate(backToListUrl());
      },
    },
  });

  const { mutate: updateDn, isPending: isUpdating } = useUpdateDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
        navigate(backToListUrl());
      },
    },
  });

  const { mutate: deleteDns } = useDeleteDns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
        navigate(backToListUrl());
      },
    },
  });

  const isPending = isCreating || isUpdating;

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 교차검증 (실패 시 기본정보 탭으로 이동)
      if (values.nodeId && values.backUpNodeId && values.nodeId === values.backUpNodeId) {
        toast.error('DR 노드는 본 노드와 동일할 수 없습니다.');
        setCurrentTab('basic');
        return;
      }
      if (values.extAuthtype === '1' && !values.ipv4Address && !values.ipv6Address) {
        toast.error('고정 IP 유형에서는 IPv4 또는 IPv6 주소 중 하나는 필수입니다.');
        setCurrentTab('basic');
        return;
      }
      if (values.md5Auth === 1 && (!values.md5Authid || !values.md5Authpwd)) {
        toast.error('MD5 인증 사용 시 인증 ID와 비밀번호는 필수입니다.');
        setCurrentTab('basic');
        return;
      }

      const payload: DnCreateRequest = {
        nodeId: values.nodeId,
        tenantId: values.tenantId,
        dnNo: values.dnNo,
        // 내선관리 화면은 EDN(내선) 전용 — UI에 노출 없이 '11' 고정
        dnType: values.dnType ?? '11',
        dnProfileId: values.dnProfileId,
        cosId: values.cosId ?? null,
        devMasterId: values.devMasterId ?? null,
        deviceType: values.deviceType ?? null,
        macAddress: values.macAddress ?? null,
        provisionSeq: values.provisionSeq ?? null,
        chnlIdx: values.chnlIdx ?? null,
        ipVersion: values.ipVersion ?? null,
        ipv4Address: values.ipv4Address ?? null,
        ipv6Address: values.ipv6Address ?? null,
        portNo: values.portNo ?? null,
        transportType: values.transportType ?? null,
        extAuthtype: values.extAuthtype,
        extIpUpdate: values.extIpUpdate ?? 0,
        backUpNodeId: values.backUpNodeId ?? null,
        globalDnYn: values.globalDnYn ?? 0,
        md5Auth: values.md5Auth ?? 0,
        md5Authid: values.md5Authid ?? null,
        // 마스킹 더미 그대로면 변경 없음 → null (BE는 null 시 기존 암호문 유지)
        md5Authpwd: values.md5Authpwd === MD5_PWD_MASK ? null : (values.md5Authpwd ?? null),
        srtpYn: values.srtpYn ?? 0,
        ieUserid: values.ieUserid ?? null,
        ieUserName: values.ieUserName ?? null,
        dnStatus: values.dnStatus ?? '0',
        adnDftState: values.adnDftState ?? null,
        traceYn: values.traceYn ?? 0,
        extBlockYn: values.extBlockYn ?? 0,
        snrYn: values.snrYn ?? 0,
        dnTblYn: values.dnTblYn ?? 0,
        dnOblYn: values.dnOblYn ?? 0,
        autoanswerYn: values.autoanswerYn ?? 0,
        autoanswerBellCnt: values.autoanswerBellCnt ?? 3,
        autoMdYn: values.autoMdYn ?? 0,
        dodAni: values.dodAni ?? null,
        chrgAni: values.chrgAni ?? null,
        internalAni: values.internalAni ?? null,
        pickupGrpId: values.pickupGrpId ?? null,
        dodLimitId: values.dodLimitId ?? null,
        origGrpdnId: values.origGrpdnId ?? null,
        rbMentId: values.rbMentId ?? null,
        mohMentId: values.mohMentId ?? null,
        coRbMentId: values.coRbMentId ?? null,
        coMohMentId: values.coMohMentId ?? null,
        mediaDeliveryId: values.mediaDeliveryId ?? null,
        msGroupId: values.msGroupId ?? null,
        msDrgroupId: values.msDrgroupId ?? null,
        // IPT 서비스 — 발신 부가서비스
        dodNumAllow: values.dodNumAllow ?? 0,
        dodNumPattern: values.dodNumPattern ?? null,
        monitorSvc: values.monitorSvc ?? 0,
        coachingSvc: values.coachingSvc ?? 0,
        callResvSvc: values.callResvSvc ?? 0,
        autoReturnSvc: values.autoReturnSvc ?? 0,
        intercomOrigSvc: values.intercomOrigSvc ?? 0,
        shortDialSvc: values.shortDialSvc ?? 0,
        dodNumSvc: values.dodNumSvc ?? 1,
        // IPT 서비스 — 착신 부가서비스
        callScreenSvc: values.callScreenSvc ?? 0,
        callScreenNum: values.callScreenNum ?? null,
        ignoreBugsCoaching: values.ignoreBugsCoaching ?? 0,
        unknownDeny: values.unknownDeny ?? 0,
        dodNameSvc: values.dodNameSvc ?? 0,
        busyWaitSvc: values.busyWaitSvc ?? 0,
        absenceSvc: values.absenceSvc ?? 0,
        mvaSvc: values.mvaSvc ?? 0,
        cidDenySvc: values.cidDenySvc ?? 0,
        callAvoidSvc: values.callAvoidSvc ?? 0,
        intercomTermSvc: values.intercomTermSvc ?? 0,
        didReleaseTone: values.didReleaseTone ?? 0,
        trnsOkTone: values.trnsOkTone ?? 0,
        multiCallForking: values.multiCallForking ?? 0,
        cidExternSvc: values.cidExternSvc ?? 0,
        silentTermSvc: values.silentTermSvc ?? 0,
        // 착신거부
        nonDidDeny: values.nonDidDeny ?? 0,
        caseDenySvc: values.caseDenySvc ?? 0,
        // 착신전환
        allTransSvc: values.allTransSvc ?? 0,
        allTransNum: values.allTransNum ?? null,
        noansTransSvc: values.noansTransSvc ?? 0,
        noansTransNum: values.noansTransNum ?? null,
        busyTransSvc: values.busyTransSvc ?? 0,
        busyTransNum: values.busyTransNum ?? null,
        caseTransSvc: values.caseTransSvc ?? 0,
        ctiTransMonSvc: values.ctiTransMonSvc ?? 0,
        // 기타전환
        moveAnsSvc: values.moveAnsSvc ?? 0,
        moveAnsNum: values.moveAnsNum ?? null,
        urTransSvc: values.urTransSvc ?? 0,
        urTransNum: values.urTransNum ?? null,
      };

      if (isEditMode && dnId) {
        const { nodeId: _n, tenantId: _t, dnNo: _d, ...updateData } = payload;
        updateDn({ id: dnId, data: updateData as DnUpdateRequest });
      } else {
        createDn(payload);
      }
    } catch {
      // validation error — 첫 탭으로 이동
      setCurrentTab('basic');
    }
  };

  const handleDeleteConfirm = () => {
    if (!dnId) return;
    modal.confirm.execute({
      onOk: () => deleteDns([dnId]),
      options: {
        title: 'DN 삭제',
        content: `"${dnDetail?.dnNo}" DN을 삭제하시겠습니까?\n(IPT서비스 / 콜전환 / 단축다이얼 / 그룹DN 연관 데이터가 함께 삭제됩니다)`,
      },
    });
  };

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: 'IPRON' },
    { title: '번호자원관리' },
    { title: 'DN관리' },
    { title: '내선관리', href: '../dn' },
    { title: isEditMode ? '수정' : '등록' },
  ];

  // 필수값 충족 여부 — 어느 스텝이든 충족되면 등록 버튼 활성
  const v = formValues ?? DN_INITIAL_VALUES;
  const requiredFilled = Boolean(v.nodeId && v.tenantId && v.dnNo && v.dnProfileId && v.extAuthtype);
  const md5Ok = v.md5Auth !== 1 || (v.md5Authid && (isEditMode || v.md5Authpwd));
  const ipOk = v.extAuthtype !== '1' || v.ipv4Address || v.ipv6Address;
  const drOk = !v.backUpNodeId || v.backUpNodeId !== v.nodeId;
  const canSubmit = requiredFilled && md5Ok && ipOk && drOk;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // 스텝별 검증 필드 (필수 + 조건부)
  const fieldsToValidate = (stepKey: string): string[] => {
    switch (stepKey) {
      case 'basic': {
        const fs = ['nodeId', 'tenantId', 'dnNo', 'dnProfileId', 'extAuthtype'];
        if (v.md5Auth === 1) {
          fs.push('md5Authid');
          if (!isEditMode) fs.push('md5Authpwd');
        }
        if (v.extAuthtype === '1') fs.push('ipv4Address', 'ipv6Address');
        return fs;
      }
      default:
        return [];
    }
  };

  // 현재 스텝이 통과 가능한지 검증 (다음 버튼 + Steps 헤더 전진 클릭 공용)
  const validateCurrentStep = async (): Promise<boolean> => {
    const fs = fieldsToValidate(steps[currentStepIndex].key);
    try {
      if (fs.length > 0) await form.validateFields(fs);
    } catch {
      return false;
    }
    if (steps[currentStepIndex].key === 'basic') {
      if (v.extAuthtype === '1' && !v.ipv4Address && !v.ipv6Address) {
        toast.error('고정 IP 유형에서는 IPv4 또는 IPv6 주소 중 하나는 필수입니다.');
        return false;
      }
      if (v.backUpNodeId && v.backUpNodeId === v.nodeId) {
        toast.error('DR 노드는 본 노드와 동일할 수 없습니다.');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    const next = steps[currentStepIndex + 1];
    if (!next) return;
    if (await validateCurrentStep()) setCurrentTab(next.key);
  };

  // Steps 헤더 클릭: 뒤로는 자유, 앞으로 이동 시에는 현재 스텝 검증 통과 필요
  const handleStepClick = async (targetIndex: number) => {
    if (targetIndex <= currentStepIndex) {
      setCurrentTab(steps[targetIndex].key);
      return;
    }
    if (await validateCurrentStep()) setCurrentTab(steps[targetIndex].key);
  };

  // ─── Footer ──────────────────────────────────────────────────────────────
  function renderFooter() {
    // SNR/SCA 탭: 각자 Drawer에서 즉시 저장되는 독립 엔티티.
    // 이전/다음 네비게이션은 유지하되, '수정/삭제'(DN 본체 저장) 버튼은 숨김.
    const isSubEntityTab = currentTab === 'snr' || currentTab === 'sca';
    // 공통: 기본정보 탭 레이아웃을 기준으로 가운데 정렬 유지.
    // SNR/SCA에서는 삭제/수정 버튼 자리는 visibility:hidden 으로 폭만 유지 (이전/다음 위치 고정).
    // 문구는 절대 위치로 우측 끝에 띄워서 버튼 정렬에 영향 주지 않음.
    return (
      <div className="relative">
        <Row gutter={20} justify="center">
          <Col>
            <Button variant="solid" onClick={() => navigate(backToListUrl())}>
              취소
            </Button>
          </Col>
          {isEditMode && (
            <Col>
              <Button variant="solid" color="danger" onClick={handleDeleteConfirm} style={isSubEntityTab ? { visibility: 'hidden' } : undefined}>
                삭제
              </Button>
            </Col>
          )}
          {!isFirstStep && (
            <Col>
              <Button variant="solid" onClick={() => setCurrentTab(steps[currentStepIndex - 1].key)}>
                이전
              </Button>
            </Col>
          )}
          {!isLastStep && (
            <Col>
              <Button variant="solid" onClick={handleNext}>
                다음
              </Button>
            </Col>
          )}
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmit} loading={isPending} disabled={!canSubmit} style={isSubEntityTab ? { visibility: 'hidden' } : undefined}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </Col>
        </Row>
        {isSubEntityTab && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-400">※ {currentTab === 'snr' ? 'SNR' : 'SCA'}은(는) 각 항목 저장 시 즉시 반영됩니다.</span>
        )}
      </div>
    );
  }

  // DR 노드 중복 경고
  const drNodeWarning = watchedNodeId && watchedBackUpNodeId && watchedNodeId === watchedBackUpNodeId;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Steps bar — 뒤로는 자유, 앞으로는 현재 스텝 필수값 충족 시에만 전진 */}
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStepIndex}
          onChange={handleStepClick}
          items={steps.map((s) => ({ title: s.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${steps.length * 200}px` }}
          responsive={false}
        />
      </div>

      {/* Main: 좌측 폼 + 우측 요약 */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          {isFetching && isEditMode ? (
            <div className="flex items-center justify-center w-full h-full">
              <FallbackSpinner />
            </div>
          ) : (
            <>
              <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
                <Form form={form} initialValues={DN_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ─── Tab 1: 기본정보 (DN기본 + IP + DR + 인증 + 단말기) ─── */}
                  <div style={{ display: currentTab === 'basic' ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">DN 기본</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="dnNo"
                          label="DN 번호"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: 'DN 번호는 필수입니다' },
                            { pattern: /^[0-9]+$/, message: '숫자만 가능합니다' },
                            { max: 24, message: '24자 이내여야 합니다' },
                          ]}
                        >
                          <Input placeholder="예: 1000" maxLength={24} disabled={isEditMode} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
                          <Select
                            options={nodeOptions}
                            placeholder="노드 선택"
                            disabled={isEditMode}
                            showSearch
                            optionFilterProp="label"
                            onChange={() => {
                              if (!isEditMode) {
                                form.setFieldsValue({
                                  tenantId: undefined,
                                  backUpNodeId: null,
                                  dnProfileId: undefined,
                                  cosId: null,
                                  pickupGrpId: null,
                                  dodLimitId: null,
                                  origGrpdnId: null,
                                  rbMentId: null,
                                  mohMentId: null,
                                  coRbMentId: null,
                                  coMohMentId: null,
                                  mediaDeliveryId: null,
                                  msGroupId: null,
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트는 필수입니다' }]}>
                          <Select
                            placeholder={watchedNodeId ? '테넌트 선택' : '노드 선택 필요'}
                            options={tenantOptions}
                            disabled={isEditMode || !watchedNodeId}
                            showSearch
                            optionFilterProp="label"
                            onChange={() => {
                              if (!isEditMode) {
                                form.setFieldsValue({
                                  dnProfileId: undefined,
                                  cosId: null,
                                  pickupGrpId: null,
                                  dodLimitId: null,
                                  origGrpdnId: null,
                                  rbMentId: null,
                                  mohMentId: null,
                                  coRbMentId: null,
                                  coMohMentId: null,
                                  mediaDeliveryId: null,
                                  msGroupId: null,
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="dnProfileId"
                          label="내선 프로파일"
                          required
                          rules={[{ required: true, message: '내선 프로파일은 필수입니다' }]}
                          tooltip={
                            selectedProfileTooltip
                              ? {
                                  title: <span style={{ whiteSpace: 'pre-line' }}>{selectedProfileTooltip}</span>,
                                }
                              : undefined
                          }
                        >
                          <Select options={dnProfileOptions} placeholder="프로파일 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">IP 정보</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="ipVersion" label="IP 버전">
                          <Select options={IP_VERSION_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="extIpUpdate"
                          label="IP 업데이트"
                          tooltip={isExtIpUpdateDisabled ? '고정 IP 유형에서는 사용 불가' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="설정" unCheckedChildren="해제" disabled={isExtIpUpdateDisabled} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="extAuthtype"
                          label="IP 유형"
                          required
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? '1' : '2')}
                          getValueProps={(v: string) => ({ checked: v === '1' })}
                        >
                          <Switch checkedChildren="고정" unCheckedChildren="동적" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="ipv4Address"
                          label="IPv4 주소"
                          tooltip={!isFixedIp ? '동적 IP 유형에서는 사용 불가' : '고정 IP 유형은 IPv4 또는 IPv6 중 하나 필수'}
                          rules={[
                            {
                              pattern: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})$/,
                              message: '올바른 IPv4 주소 형식이 아닙니다',
                            },
                          ]}
                        >
                          <Input placeholder="192.168.1.100" disabled={isIpv4Disabled} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ipv6Address" label="IPv6 주소" tooltip={!isFixedIp ? '동적 IP 유형에서는 사용 불가' : undefined}>
                          <Input placeholder="fe80::..." disabled={isIpv6Disabled} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="portNo"
                          label="포트"
                          tooltip={isPortDisabled ? '동적 IP 유형에서는 사용 불가' : '0 ~ 65535'}
                          rules={[{ type: 'number', min: 0, max: 65535, message: '0~65535 범위여야 합니다' }]}
                        >
                          <InputNumber min={0} max={65535} className="!w-full" disabled={isPortDisabled} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* DR 노드 / Global DN은 내선 프로파일 설정을 따르므로 폼에서 제외 */}

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">인증</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="transportType" label="전송 유형">
                          <Select options={TRANSPORT_TYPE_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="srtpYn"
                          label="SRTP"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={4}>
                        <Form.Item
                          name="md5Auth"
                          label="MD5 인증"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          name="md5Authid"
                          label="MD5 인증 ID"
                          required={isMd5Required}
                          rules={
                            isMd5Required
                              ? [
                                  { required: true, message: 'MD5 사용 시 인증 ID는 필수입니다' },
                                  { max: 64, message: '64자 이내여야 합니다' },
                                ]
                              : [{ max: 64, message: '64자 이내여야 합니다' }]
                          }
                        >
                          <Input placeholder="인증 ID" maxLength={64} disabled={!isMd5Required} />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          name="md5Authpwd"
                          label="MD5 인증 비밀번호"
                          required={isMd5Required}
                          rules={
                            isMd5Required
                              ? [
                                  { required: true, message: 'MD5 사용 시 비밀번호는 필수입니다' },
                                  { min: 8, max: 16, message: '8~16자여야 합니다' },
                                ]
                              : []
                          }
                        >
                          <Input.Password placeholder={isEditMode ? '변경 시에만 입력' : '8~16자'} maxLength={16} disabled={!isMd5Required} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">단말기</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="deviceType"
                          label="단말기 유형"
                          tooltip={
                            deviceTooltip
                              ? {
                                  title: <span style={{ whiteSpace: 'pre-line' }}>{deviceTooltip}</span>,
                                }
                              : undefined
                          }
                        >
                          <Select options={deviceTypeOptions} placeholder="단말기 유형 선택" showSearch optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ─── Tab 2: 부가기능 ─── */}
                  <div style={{ display: currentTab === 'feature' ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">부가 서비스</h4>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <SwitchBox name="traceYn" label="호추적" />
                      <SwitchBox name="extBlockYn" label="내선 블럭" />
                      <SwitchBox name="snrYn" label="SNR 사용" />
                      <SwitchBox name="dnTblYn" label="착신 금지" disabled={groupLocked('dnTblYn')} cosLocked={groupLocked('dnTblYn')} />
                      <SwitchBox name="dnOblYn" label="발신 금지" disabled={groupLocked('dnOblYn')} cosLocked={groupLocked('dnOblYn')} />
                      <SwitchBox name="autoMdYn" label="자동 미디어전달" />
                    </div>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">발신번호 / 과금</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="dodAni" label="지정 발신번호" rules={[{ pattern: /^[0-9*#]*$/, message: '숫자 및 */# 만 가능합니다' }]}>
                          <Input placeholder="지정 발신번호" maxLength={32} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="chrgAni" label="개별 과금번호" rules={[{ pattern: /^[0-9*#]*$/, message: '숫자 및 */# 만 가능합니다' }]}>
                          <Input placeholder="개별 과금번호" maxLength={32} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="internalAni" label="내선간 발신" rules={[{ pattern: /^[0-9*#]*$/, message: '숫자 및 */# 만 가능합니다' }]}>
                          <Input placeholder="내선간 발신번호" maxLength={32} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">자동 응답</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="autoanswerYn"
                          label="자동 응답"
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="사용" unCheckedChildren="사용안함" disabled={personalDisabled('autoanswerYn')} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="autoanswerBellCnt" label="벨울림 횟수" tooltip="0 ~ 100" rules={[{ type: 'number', min: 0, max: 100, message: '0~100 범위여야 합니다' }]}>
                          <InputNumber min={0} max={100} className="!w-full" disabled={watchedAutoanswerYn !== 1 || personalDisabled('autoanswerYn')} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">그룹 설정</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="pickupGrpId" label="픽업 그룹">
                          <Select options={pickupGrpOptions} placeholder="픽업 그룹 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="dodLimitId"
                          label={cosLockedLabel('발신제한 그룹', groupLocked('dodLimitId'))}
                          tooltip={groupLocked('dodLimitId') ? 'COS 설정을 따릅니다 (내선에서 수정 불가)' : undefined}
                        >
                          <Select
                            options={dodLimitOptions}
                            placeholder="발신제한 그룹 선택"
                            showSearch
                            optionFilterProp="label"
                            disabled={!watchedTenantId || groupLocked('dodLimitId')}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="origGrpdnId" label="그룹발신번호용 그룹DN">
                          <Select options={origGrpdnOptions} placeholder="그룹 DN 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">멘트 설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="rbMentId" label="기본 연결멘트(RB)">
                          <Select options={rbMentOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="mohMentId" label="기본 보류멘트(MOH)">
                          <Select options={mohMentOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="coRbMentId" label="국선호 연결멘트">
                          <Select options={coRbMentOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="coMohMentId" label="국선호 보류멘트">
                          <Select options={coMohMentOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">미디어 전달</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="mediaDeliveryId" label="미디어 전달 그룹">
                          <Select options={mediaDeliveryOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="msGroupId" label="MS 그룹">
                          <Select options={msGroupOptions} placeholder="선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ─── Tab 3: IPT서비스 (COS + 발신 부가 + 착신 부가) ─── */}
                  <div style={{ display: currentTab === 'ipt' ? 'block' : 'none' }}>
                    <Row gutter={20}>
                      <Col span={12}>
                        <Form.Item
                          name="cosId"
                          label="COS 설정"
                          rules={[{ required: true, message: 'COS 는 필수입니다' }]}
                          tooltip={
                            cosEffectTooltip
                              ? {
                                  title: <span style={{ whiteSpace: 'pre-line' }}>{cosEffectTooltip}</span>,
                                  overlayStyle: { maxWidth: 420 },
                                }
                              : undefined
                          }
                        >
                          <Select options={cosOptions} placeholder="COS 선택" showSearch optionFilterProp="label" disabled={!watchedTenantId} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-2">발신 부가서비스</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="dodNumAllow"
                          label={cosLockedLabel('특정번호 발신허용', groupLocked('dodNumAllow'))}
                          tooltip={groupLocked('dodNumAllow') ? 'COS 설정을 따릅니다 (내선에서 수정 불가)' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={groupLocked('dodNumAllow')} />
                        </Form.Item>
                      </Col>
                      <Col span={18}>
                        <Form.Item
                          name="dodNumPattern"
                          label={cosLockedLabel('발신허용 패턴', groupLocked('dodNumPattern'))}
                          tooltip={groupLocked('dodNumPattern') ? 'COS 설정을 따릅니다 (내선에서 수정 불가)' : '허용 패턴 (예: 02* / 031*)'}
                          rules={[{ max: 512, message: '512자 이내여야 합니다' }]}
                        >
                          <Input placeholder="예: 02* / 031*" maxLength={512} disabled={groupLocked('dodNumPattern')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <SwitchBox name="monitorSvc" label="감청서비스" disabled={groupLocked('monitorSvc')} cosLocked={groupLocked('monitorSvc')} />
                      <SwitchBox name="coachingSvc" label="코칭서비스" disabled={groupLocked('coachingSvc')} cosLocked={groupLocked('coachingSvc')} />
                      <SwitchBox name="callResvSvc" label="통화예약서비스" disabled={personalDisabled('callReserveSvc')} cosDependent={cosControlled('callReserveSvc')} />
                      <SwitchBox name="autoReturnSvc" label="자동 호 회수" disabled={personalDisabled('autoReturnSvc')} cosDependent={cosControlled('autoReturnSvc')} />
                      <SwitchBox name="intercomOrigSvc" label="인터콤 발신" disabled={personalDisabled('intercomOrigSvc')} cosDependent={cosControlled('intercomOrigSvc')} />
                      <Form.Item
                        name="shortDialSvc"
                        label={
                          <span className="inline-flex items-center gap-2">
                            {cosDependentLabel('단축다이얼', cosControlled('shortDialSvc'))}
                            {isEditMode && dnId && watchedShortDialSvc === 1 && (
                              <Button size="small" type="link" onClick={() => setShortDialOpen(true)} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                                규칙 관리 →
                              </Button>
                            )}
                          </span>
                        }
                        tooltip={cosControlled('shortDialSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        valuePropName="checked"
                        getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                        getValueProps={(v: number) => ({ checked: v === 1 })}
                      >
                        <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('shortDialSvc')} />
                      </Form.Item>
                      <SwitchBox name="dodNumSvc" label="DOD 발신번호표시" />
                    </div>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">착신 부가서비스</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="callScreenSvc"
                          label={cosLockedLabel('특정번호 착신금지', groupLocked('callScreenSvc'))}
                          tooltip={groupLocked('callScreenSvc') ? 'COS 설정을 따릅니다 (내선에서 수정 불가)' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={groupLocked('callScreenSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={18}>
                        <Form.Item
                          name="callScreenNum"
                          label={cosLockedLabel('착신금지 패턴', groupLocked('callScreenNum'))}
                          tooltip={groupLocked('callScreenNum') ? 'COS 설정을 따릅니다 (내선에서 수정 불가)' : undefined}
                          rules={[{ max: 512, message: '512자 이내여야 합니다' }]}
                        >
                          <Input placeholder="차단 패턴" maxLength={512} disabled={groupLocked('callScreenNum')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <SwitchBox name="ignoreBugsCoaching" label="피감청/피코칭방지" disabled={groupLocked('ignoreBugsCoaching')} cosLocked={groupLocked('ignoreBugsCoaching')} />
                      <SwitchBox name="unknownDeny" label="익명호 거부" disabled={personalDisabled('unknownDeny')} cosDependent={cosControlled('unknownDeny')} />
                      <SwitchBox name="dodNameSvc" label="발신이름 표시" disabled={personalDisabled('dodNameSvc')} cosDependent={cosControlled('dodNameSvc')} />
                      <SwitchBox name="busyWaitSvc" label="통화중대기" disabled={personalDisabled('busyWaitSvc')} cosDependent={cosControlled('busyWaitSvc')} />
                      <SwitchBox name="absenceSvc" label="부재중안내" disabled={personalDisabled('absenceSvc')} cosDependent={cosControlled('absenceSvc')} />
                      <SwitchBox name="mvaSvc" label="모바일 원격접근" disabled={personalDisabled('mvaSvc')} cosDependent={cosControlled('mvaSvc')} />
                      <SwitchBox name="cidDenySvc" label="발신자정보 표시방지" disabled={personalDisabled('cidDenySvc')} cosDependent={cosControlled('cidDenySvc')} />
                      <SwitchBox name="callAvoidSvc" label="호회피 서비스" disabled={personalDisabled('callAvoidSvc')} cosDependent={cosControlled('callAvoidSvc')} />
                      <SwitchBox name="intercomTermSvc" label="인터콤 착신허용" disabled={personalDisabled('intercomTermSvc')} cosDependent={cosControlled('intercomTermSvc')} />
                      <SwitchBox name="didReleaseTone" label="통화종료음 사용" disabled={personalDisabled('didReleaseTone')} cosDependent={cosControlled('didReleaseTone')} />
                      <SwitchBox name="trnsOkTone" label="호전환완료음" disabled={personalDisabled('trnsOkTone')} cosDependent={cosControlled('trnsOkTone')} />
                      <SwitchBox name="cidExternSvc" label="확장 CID 서비스" disabled={personalDisabled('cidExternSvc')} cosDependent={cosControlled('cidExternSvc')} />
                      <SwitchBox name="silentTermSvc" label="무음착신서비스" disabled={personalDisabled('silentTermSvc')} cosDependent={cosControlled('silentTermSvc')} />
                    </div>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="multiCallForking"
                          label="SCA 동작방식"
                          tooltip="공유호 출현(SCA) 처리 모드"
                          valuePropName="checked"
                          getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ─── Tab 4: 착신설정 (착신거부 + 착신전환 + 기타전환) ─── */}
                  <div style={{ display: currentTab === 'term' ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">착신거부 설정</h4>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <SwitchBox name="nonDidDeny" label="무조건 착신거부" disabled={personalDisabled('denySvc')} cosDependent={cosControlled('denySvc')} />
                      <SwitchBox name="caseDenySvc" label="조건부 착신거부" disabled={personalDisabled('denySvc')} cosDependent={cosControlled('denySvc')} />
                    </div>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">착신전환 설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="allTransSvc"
                          label={cosDependentLabel('무조건 착신전환', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="allTransNum"
                          label={cosDependentLabel('무조건 착신전환 번호', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        >
                          <Input placeholder="전환 번호" maxLength={48} disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="noansTransSvc"
                          label={cosDependentLabel('무응답 착신전환', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="noansTransNum"
                          label={cosDependentLabel('무응답 착신전환 번호', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        >
                          <Input placeholder="전환 번호" maxLength={48} disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="busyTransSvc"
                          label={cosDependentLabel('통화중 착신전환', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="busyTransNum"
                          label={cosDependentLabel('통화중 착신전환 번호', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        >
                          <Input placeholder="전환 번호" maxLength={48} disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="caseTransSvc"
                          label={cosDependentLabel('조건부 착신전환', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                          extra={
                            isEditMode && dnId ? (
                              <Button size="small" type="link" disabled={form.getFieldValue('caseTransSvc') !== 1} onClick={() => setCallTransferOpen(true)} style={{ padding: 0 }}>
                                규칙 관리 →
                              </Button>
                            ) : undefined
                          }
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="ctiTransMonSvc"
                          label={cosDependentLabel('국선전환시 가상내선모드', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-6">기타전환 설정</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item
                          name="moveAnsSvc"
                          label={cosDependentLabel('이동 응답서비스', cosControlled('moveAnsSvc'))}
                          tooltip={cosControlled('moveAnsSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('moveAnsSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="moveAnsNum"
                          label={cosDependentLabel('이동응답 번호', cosControlled('moveAnsSvc'))}
                          tooltip={cosControlled('moveAnsSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        >
                          <Input placeholder="번호" maxLength={48} disabled={personalDisabled('moveAnsSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="urTransSvc"
                          label={cosDependentLabel('미등록 착신전환', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                          valuePropName="checked"
                          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                          getValueProps={(v: number) => ({ checked: v === 1 })}
                        >
                          <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="urTransNum"
                          label={cosDependentLabel('미등록 착신전환 번호', cosControlled('transSvc'))}
                          tooltip={cosControlled('transSvc') ? 'COS 설정에 의해 편집 허용 여부 결정' : undefined}
                        >
                          <Input placeholder="번호" maxLength={48} disabled={personalDisabled('transSvc')} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* ─── Tab 5: SNR (수정모드만) ─── */}
                  {isEditMode && id && (
                    <div style={{ display: currentTab === 'snr' ? 'block' : 'none' }}>
                      <DnSnrTab dnId={Number(id)} />
                    </div>
                  )}

                  {/* ─── Tab 6: SCA (수정모드만) ─── */}
                  {isEditMode && id && (
                    <div style={{ display: currentTab === 'sca' ? 'block' : 'none' }}>
                      <DnScaTab dnId={Number(id)} nodeId={formValues?.nodeId ?? dnDetail?.nodeId ?? null} tenantId={formValues?.tenantId ?? dnDetail?.tenantId ?? null} />
                    </div>
                  )}
                </Form>
              </div>
              <div className="w-full px-7 pb-7">{renderFooter()}</div>
            </>
          )}
        </div>

        {/* 우측 Summary Panel */}
        <div className="!w-[360px] !min-w-[360px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
            <DnSummaryPanel
              values={formValues ?? DN_INITIAL_VALUES}
              nodes={nodes}
              tenants={tenants}
              options={{
                dnProfiles: options?.dnProfiles ?? [],
                cos: options?.cos ?? [],
                deviceTypes: options?.deviceTypes ?? [],
                pickupGrps: options?.pickupGrps ?? [],
                dodLimits: options?.dodLimits ?? [],
                origGrpdns: options?.origGrpdns ?? [],
                rbMents: options?.rbMents ?? [],
                mohMents: options?.mohMents ?? [],
                coRbMents: options?.coRbMents ?? [],
                coMohMents: options?.coMohMents ?? [],
                mediaDeliveries: options?.mediaDeliveries ?? [],
                msGroups: options?.msGroups ?? [],
                drNodes: options?.drNodes ?? [],
              }}
            />
          </div>
        </div>
      </div>

      {/* 조건부 착신 전환 Drawer (수정 모드만 + caseTransSvc=1 시 활성) */}
      {isEditMode && dnId && <DnCallTransferDrawer open={callTransferOpen} dnId={dnId} dnNo={dnDetail?.dnNo} onClose={() => setCallTransferOpen(false)} />}
      {isEditMode && dnId && <DnShortDialDrawer open={shortDialOpen} dnId={dnId} dnNo={dnDetail?.dnNo} onClose={() => setShortDialOpen(false)} />}
    </div>
  );
}
