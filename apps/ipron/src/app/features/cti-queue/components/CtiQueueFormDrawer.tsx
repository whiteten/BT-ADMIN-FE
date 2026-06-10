/**
 * CTI 큐 등록/수정 드로어 (SWAT IPR20S3020 5탭).
 *
 * 탭1 기본정보 / 탭2 초기구성 / 탭3 큐설정 / 탭4 라우팅정보(+BSR 스케쥴 서브그리드) /
 * 탭5 목표 서비스레벨 스케쥴(수정 시 활성).
 *
 * "그룹DN 생성 = 즉시 큐번호" 결합 — 등록 폼에서 테넌트(고정)/노드(고정)/그룹DN번호/이름 입력.
 *
 * 동적 disable (SWAT 정합):
 *  - DR노드 선택 → Global DN 강제 사용 + DR 접근코드 enable (:488-499)
 *  - 재진입=해제 → 강제호전환 disable+해제, 활성화 강제 (:348-358)
 *  - 최대대기=해제 → 시간 disable+0 (:2153-2154)
 *  - 호회수=해제 → 타임아웃 disable (:2138-2139)
 *  - 라우팅기준=Skill-Based → 미디어 스킬행 필수 (:361-368)
 *  - 블럭여부=해제 → 블럭설정 disable (:340-346)
 *  - BSR 사용=설정 → 그룹/가중치 enable + 그룹 필수 (:1195)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Tabs } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetMentOptions } from '../../ment-mgmt/hooks/useMentQueries';
import { ctiQueueApi } from '../api/ctiQueueApi';
import {
  useAssignBsrSchedules,
  useAssignSltSchedules,
  useCreateCtiQueue,
  useGetCtiQueueAccessCodeProfileOptions,
  useGetCtiQueueBsrGroupOptions,
  useGetCtiQueueBsrSchedulePool,
  useGetCtiQueueBsrSchedules,
  useGetCtiQueueGroupOptions,
  useGetCtiQueueMediaOptions,
  useGetCtiQueueSkillsetOptions,
  useGetCtiQueueSltSchedulePool,
  useGetCtiQueueSltSchedules,
  useUnassignBsrSchedule,
  useUnassignSltSchedule,
  useUpdateCtiQueue,
} from '../hooks/useCtiQueueQueries';
import {
  CLOSE_TYPE_OPTIONS,
  type CtiQueueCreateRequest,
  type CtiQueueResponse,
  type CtiQueueUpdateRequest,
  INOUT_KIND_OPTIONS,
  MEDIA_SKILL_FIELD_MAP,
  ROUTING_KIND_OPTIONS,
  ROUTING_TYPE_OPTIONS,
} from '../types';

type Mode = 'create' | 'edit';

export type CtiQueueDrawerState =
  | { open: false }
  | { open: true; mode: Mode; row?: CtiQueueResponse; tenantId: number | null; tenantName: string | null; nodeId: number | null; nodeName: string | null };

interface Props {
  state: CtiQueueDrawerState;
  onClose: () => void;
  /** 등록 모드에서 테넌트/노드를 직접 선택할 수 있도록 전달하는 옵션 (선택된 카드/탭 컨텍스트가 기본값). */
  tenantOptions?: { value: number; label: string }[];
  nodeOptions?: { value: number; label: string }[];
}

interface FormValues {
  tenantId?: number;
  nodeId?: number;
  gdnNo?: string;
  gdnName?: string;
  ctiqName?: string;
  ctiqDesc?: string;
  inoutKind?: number;
  sortSeq?: number;
  activateYn?: number;
  globalDnYn?: number;
  backUpNodeId?: number | null;
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
  // 초기구성
  initMent?: number | null;
  waitMent?: number | null;
  closeMent?: number | null;
  blockMent?: number | null;
  connMent?: number | null;
  holdMent?: number | null;
  coConnMent?: number | null;
  coHoldMent?: number | null;
  blockYn?: number;
  closeType?: number;
  errorRoutingDnis?: string;
  blockRoutingDnis?: string;
  busyRoutingDnis?: string;
  // 큐설정
  maxWaittimeYn?: number;
  maxWaittime?: number;
  collectYn?: number;
  collectTimeout?: number;
  serviceLevelTime?: number;
  abandonAcktime?: number;
  serviceLevelTargetYn?: number;
  serviceLevelTargetValue?: number;
  overflowQid?: string;
  overflowCnt?: number;
  // 라우팅
  firstGroupId?: number | null;
  routingPriority?: number;
  routingType?: number;
  routingKind?: number;
  reconnPriorityYn?: number;
  forceTransYn?: number;
  // BSR
  bsrYn?: number;
  bsrDistributeYn?: number;
  bsrGroupId?: number | null;
  bsrWeight?: number;
  // 예약 적용 (SWAT IPR20S3020 applyType/applyDatetime 정합)
  applyType?: number; // 0=즉시, 1=예약
  applyDate?: string; // 'YYYYMMDD'
  applyHour?: string; // '00'~'23'
  applyMinute?: string; // '00'~'59'
  // 미디어 스킬 (동적: skill_<mediaType> / level_<mediaType>)
  [key: string]: unknown;
}

const skillIdKey = (mt: number) => `skill_${mt}`;
const skillLevelKey = (mt: number) => `level_${mt}`;

export default function CtiQueueFormDrawer({ state, onClose, tenantOptions = [], nodeOptions = [] }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [activeTab, setActiveTab] = useState('basic');

  // async 옵션(그룹/BSR그룹/스킬셋) 기반 select 의 "실제 값" 보류 저장소 (BUG-2):
  // 옵션이 늦게 도착하면 그 전에 set 한 값이 매칭 옵션을 못 찾아 antd 가 raw ID 를 잠깐 노출.
  // → 초기에는 0(없음/미사용) 으로 두고, 옵션이 채워진 뒤 실제 값을 set 하여 라벨이 항상 정상 표시되게 함.
  const pendingAsyncValues = useRef<{
    firstGroupId: number;
    bsrGroupId: number;
    accessCodeProfileId: number;
    drAccessCodeProfileId: number;
    skills: Record<string, number>;
    ments: Record<string, number>;
  }>({
    firstGroupId: 0,
    bsrGroupId: 0,
    accessCodeProfileId: 0,
    drAccessCodeProfileId: 0,
    skills: {},
    ments: {},
  });

  const isEdit = state.open && state.mode === 'edit';
  const ctiqId = state.open && state.row ? state.row.ctiqId : null;

  // 등록 모드에서는 폼에서 선택한 테넌트/노드를 우선 사용(미선택 시 카드/탭 컨텍스트 기본값).
  // 수정 모드에서는 행의 테넌트/노드(불변)를 사용.
  const wTenantId = Form.useWatch('tenantId', form);
  const wNodeId = Form.useWatch('nodeId', form);
  const tenantId = isEdit ? (state.open ? state.tenantId : null) : (wTenantId ?? (state.open ? state.tenantId : null));
  const nodeId = isEdit ? (state.open ? state.nodeId : null) : (wNodeId ?? (state.open ? state.nodeId : null));

  // ─── 스케쥴 피커 모달 상태 ────────────────────────────────────────────────────
  const [bsrPickerOpen, setBsrPickerOpen] = useState(false);
  const [sltPickerOpen, setSltPickerOpen] = useState(false);
  const [bsrPickerSelected, setBsrPickerSelected] = useState<number[]>([]);
  const [sltPickerSelected, setSltPickerSelected] = useState<number[]>([]);

  // ─── 옵션 콤보 ──────────────────────────────────────────────────────────────
  const { data: groupOptions = [], isFetching: groupLoading } = useGetCtiQueueGroupOptions(tenantId);
  const { data: skillsetOptions = [], isFetching: skillsetLoading } = useGetCtiQueueSkillsetOptions(tenantId);
  const { data: bsrGroupOptions = [], isFetching: bsrGroupLoading } = useGetCtiQueueBsrGroupOptions(tenantId);
  const { data: mediaOptions = [] } = useGetCtiQueueMediaOptions();
  const { data: bsrSchedules = [], refetch: refetchBsrSchedules } = useGetCtiQueueBsrSchedules(ctiqId);
  const { data: sltSchedules = [], refetch: refetchSltSchedules } = useGetCtiQueueSltSchedules(ctiqId);
  // 스케쥴 풀 — 피커 팝업이 열릴 때 tenantId 가 확정되어 있으므로 상시 조회
  const { data: bsrSchedulePool = [], isFetching: bsrPoolLoading } = useGetCtiQueueBsrSchedulePool(tenantId);
  const { data: sltSchedulePool = [], isFetching: sltPoolLoading } = useGetCtiQueueSltSchedulePool(tenantId);

  // 이미 배정된 BSR/SLT 스케쥴 ID 집합 (피커에서 중복 배정 방지용 disabled 처리)
  const assignedBsrIds = useMemo(() => new Set(bsrSchedules.map((s) => s.quebsrScheduleId)), [bsrSchedules]);
  const assignedSltIds = useMemo(() => new Set(sltSchedules.map((s) => s.sltScheduleId)), [sltSchedules]);

  // ─── 스케쥴 배정/해제 뮤테이션 ─────────────────────────────────────────────
  const { mutate: assignBsr, isPending: bsrAssigning } = useAssignBsrSchedules({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 스케쥴이 배정되었습니다');
        setBsrPickerOpen(false);
        setBsrPickerSelected([]);
        void refetchBsrSchedules();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? 'BSR 스케쥴 배정 실패'),
    },
  });

  const { mutate: unassignBsr, isPending: bsrUnassigning } = useUnassignBsrSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 스케쥴 배정이 해제되었습니다');
        void refetchBsrSchedules();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? 'BSR 스케쥴 해제 실패'),
    },
  });

  const { mutate: assignSlt, isPending: sltAssigning } = useAssignSltSchedules({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SLT 스케쥴이 배정되었습니다');
        setSltPickerOpen(false);
        setSltPickerSelected([]);
        void refetchSltSchedules();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? 'SLT 스케쥴 배정 실패'),
    },
  });

  const { mutate: unassignSlt, isPending: sltUnassigning } = useUnassignSltSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SLT 스케쥴 배정이 해제되었습니다');
        void refetchSltSchedules();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? 'SLT 스케쥴 해제 실패'),
    },
  });

  const groupSelectOptions = useMemo(() => [{ value: 0, label: '없음' }, ...groupOptions.map((g) => ({ value: g.id, label: g.name }))], [groupOptions]);
  const bsrGroupSelectOptions = useMemo(() => [{ value: 0, label: '없음' }, ...bsrGroupOptions.map((g) => ({ value: g.id, label: g.name }))], [bsrGroupOptions]);
  const skillsetSelectOptions = useMemo(() => [{ value: 0, label: '(미사용)' }, ...skillsetOptions.map((s) => ({ value: s.id, label: s.name }))], [skillsetOptions]);

  // 라이선스 활성 미디어 (응답 없으면 VOIP/Chat/VideoVoice 기본 3종)
  const activeMedia = useMemo(() => {
    const fromBe = mediaOptions.filter((m) => MEDIA_SKILL_FIELD_MAP[m.mediaType]);
    if (fromBe.length > 0) return fromBe.map((m) => ({ mediaType: m.mediaType, label: MEDIA_SKILL_FIELD_MAP[m.mediaType].label }));
    return [0, 10, 20].map((mt) => ({ mediaType: mt, label: MEDIA_SKILL_FIELD_MAP[mt].label }));
  }, [mediaOptions]);

  // ─── Watches (동적 disable) ─────────────────────────────────────────────────
  const wDrNode = Form.useWatch('backUpNodeId', form);
  const wReconn = Form.useWatch('reconnPriorityYn', form);
  const wMaxWaitYn = Form.useWatch('maxWaittimeYn', form);
  const wCollectYn = Form.useWatch('collectYn', form);
  const wRoutingKind = Form.useWatch('routingKind', form);
  const wBlockYn = Form.useWatch('blockYn', form);
  const wBsrYn = Form.useWatch('bsrYn', form);
  const wApplyType = Form.useWatch('applyType', form);

  const hasDrNode = wDrNode != null && Number(wDrNode) !== 0;
  const reconnOff = wReconn === 0;

  // ─── 접근코드 프로파일 콤보 (노드/테넌트 단위, SWAT accessCodeProfile 콤보 재사용) ───
  // 본 콤보: 큐 노드 기준. DR 콤보: DR(백업) 노드 기준 (DR노드 미지정 시 비활성).
  const { data: accessProfileOptions = [], isFetching: accessProfileLoading } = useGetCtiQueueAccessCodeProfileOptions(tenantId, nodeId);
  const { data: drAccessProfileOptions = [], isFetching: drAccessProfileLoading } = useGetCtiQueueAccessCodeProfileOptions(tenantId, hasDrNode ? Number(wDrNode) : null);
  const accessProfileSelectOptions = useMemo(() => [{ value: 0, label: '미지정' }, ...accessProfileOptions.map((p) => ({ value: p.id, label: p.name }))], [accessProfileOptions]);
  const drAccessProfileSelectOptions = useMemo(
    () => [{ value: 0, label: '미지정' }, ...drAccessProfileOptions.map((p) => ({ value: p.id, label: p.name }))],
    [drAccessProfileOptions],
  );
  // ─── 멘트 콤보 (노드/테넌트 단위) — 교환기 멘트 관리(ment-mgmt) 옵션 재사용 ───────
  // 초기구성 탭의 초기/대기/종료/블럭/연결/보류 멘트 ID 를 멘트 선택 콤보로 제공.
  const { data: mentOptions = [], isFetching: mentLoading } = useGetMentOptions(nodeId, tenantId);
  const mentSelectOptions = useMemo(
    () => [{ value: 0, label: '없음' }, ...mentOptions.map((m) => ({ value: m.id, label: m.fileName ? `${m.name} (${m.fileName})` : m.name }))],
    [mentOptions],
  );

  const maxWaitOff = wMaxWaitYn !== 1;
  const collectOff = wCollectYn !== 1;
  const skillRequired = wRoutingKind === 1 || wRoutingKind === 3;
  const blockOff = wBlockYn !== 1;
  const bsrOn = wBsrYn === 1;

  // DR노드 → Global DN 강제 사용 (SWAT :488-499)
  useEffect(() => {
    if (!state.open) return;
    if (hasDrNode) form.setFieldsValue({ globalDnYn: 1 });
  }, [hasDrNode, form, state.open]);

  // 재진입=해제 → 강제호전환 해제 + 활성화 강제 (SWAT :348-358)
  useEffect(() => {
    if (!state.open) return;
    if (reconnOff) form.setFieldsValue({ forceTransYn: 0, activateYn: 1 });
  }, [reconnOff, form, state.open]);

  // 최대대기=해제 → 시간 0 (SWAT :2153-2154)
  useEffect(() => {
    if (!state.open) return;
    if (maxWaitOff) form.setFieldsValue({ maxWaittime: 0 });
  }, [maxWaitOff, form, state.open]);

  // 호회수=해제 → 타임아웃 0 (SWAT :2138-2139)
  useEffect(() => {
    if (!state.open) return;
    if (collectOff) form.setFieldsValue({ collectTimeout: 0 });
  }, [collectOff, form, state.open]);

  // 그룹DN이름 → CTI큐이름 자동복사 (입력 시점)
  const copyGdnNameToQueue = (v: string) => {
    if (!form.getFieldValue('ctiqName')) form.setFieldsValue({ ctiqName: v });
  };

  // ─── 초기값 세팅 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      return;
    }
    setActiveTab('basic');
    if (state.mode === 'edit' && state.row) {
      const r = state.row;
      const mediaVals: Record<string, unknown> = {};
      const pendingSkills: Record<string, number> = {};
      for (const { mediaType } of activeMedia) {
        const { idKey, levelKey } = MEDIA_SKILL_FIELD_MAP[mediaType];
        const skillId = (r[idKey] as number | null) ?? 0;
        // 스킬셋 ID 는 옵션 로드 후에 set (raw ID flash 방지). 초기엔 0(미사용).
        pendingSkills[skillIdKey(mediaType)] = skillId;
        mediaVals[skillIdKey(mediaType)] = 0;
        mediaVals[skillLevelKey(mediaType)] = (r[levelKey] as number | null) ?? 0;
      }
      // 그룹/BSR그룹/스킬셋/접근코드프로파일/멘트 실제 값은 옵션 도착 후 적용하도록 보류
      pendingAsyncValues.current = {
        firstGroupId: r.firstGroupId ?? 0,
        bsrGroupId: r.bsrGroupId ?? 0,
        accessCodeProfileId: r.accessCodeProfileId ?? 0,
        drAccessCodeProfileId: r.drAccessCodeProfileId ?? 0,
        skills: pendingSkills,
        ments: {
          initMent: r.initMent ?? 0,
          waitMent: r.waitMent ?? 0,
          closeMent: r.closeMent ?? 0,
          blockMent: r.blockMent ?? 0,
          connMent: r.connMent ?? 0,
          holdMent: r.holdMent ?? 0,
          coConnMent: r.coConnMent ?? 0,
          coHoldMent: r.coHoldMent ?? 0,
        },
      };
      form.setFieldsValue({
        gdnNo: r.gdnNo ?? '',
        gdnName: r.gdnName ?? '',
        ctiqName: r.ctiqName ?? '',
        ctiqDesc: r.ctiqDesc ?? '',
        inoutKind: r.inoutKind ?? 0,
        sortSeq: r.sortSeq ?? 1,
        activateYn: r.activateYn ?? 1,
        globalDnYn: r.globalDnYn ?? 0,
        backUpNodeId: r.backUpNodeId ?? 0,
        accessCodeProfileId: 0, // 옵션 로드 후 실제 값 적용 (deferred)
        drAccessCodeProfileId: 0, // 옵션 로드 후 실제 값 적용 (deferred)
        initMent: 0, // 멘트 옵션 로드 후 실제 값 적용 (deferred)
        waitMent: 0,
        closeMent: 0,
        blockMent: 0,
        connMent: 0,
        holdMent: 0,
        coConnMent: 0,
        coHoldMent: 0,
        blockYn: r.blockYn ?? 0,
        closeType: r.closeType ?? 0,
        errorRoutingDnis: r.errorRoutingDnis ?? '',
        blockRoutingDnis: r.blockRoutingDnis ?? '',
        busyRoutingDnis: r.busyRoutingDnis ?? '',
        maxWaittimeYn: r.maxWaittimeYn ?? 0,
        maxWaittime: r.maxWaittime ?? 0,
        collectYn: r.collectYn ?? 1,
        collectTimeout: r.collectTimeout ?? 10,
        serviceLevelTime: r.serviceLevelTime ?? 20,
        abandonAcktime: r.abandonAcktime ?? 0,
        serviceLevelTargetYn: r.serviceLevelTargetYn ?? 0,
        serviceLevelTargetValue: r.serviceLevelTargetValue ?? 0,
        overflowQid: r.overflowQid ?? '',
        overflowCnt: r.overflowCnt ?? 100,
        firstGroupId: 0, // 옵션 로드 후 실제 값 적용 (deferred)
        routingPriority: r.routingPriority ?? 9,
        routingType: r.routingType ?? 1,
        routingKind: r.routingKind ?? 1,
        reconnPriorityYn: r.reconnPriorityYn ?? 1,
        forceTransYn: r.forceTransYn ?? 1,
        bsrYn: r.bsrYn ?? 0,
        bsrDistributeYn: r.bsrDistributeYn ?? 1,
        bsrGroupId: 0, // 옵션 로드 후 실제 값 적용 (deferred)
        bsrWeight: r.bsrWeight ?? 100,
        // 예약 적용 (SWAT applyType/applyDatetime 정합)
        applyType: r.applyType ?? 0,
        applyDate: r.applyDatetime ? r.applyDatetime.substring(0, 8) : '',
        applyHour: r.applyDatetime ? r.applyDatetime.substring(8, 10) : '00',
        applyMinute: r.applyDatetime ? r.applyDatetime.substring(10, 12) : '00',
        ...mediaVals,
      });
    } else {
      pendingAsyncValues.current = { firstGroupId: 0, bsrGroupId: 0, accessCodeProfileId: 0, drAccessCodeProfileId: 0, skills: {}, ments: {} };
      const mediaVals: Record<string, unknown> = {};
      for (const { mediaType } of activeMedia) {
        mediaVals[skillIdKey(mediaType)] = 0;
        mediaVals[skillLevelKey(mediaType)] = 0;
      }
      form.setFieldsValue({
        tenantId: state.tenantId ?? undefined,
        nodeId: state.nodeId ?? undefined,
        gdnNo: '',
        gdnName: '',
        ctiqName: '',
        inoutKind: 0,
        sortSeq: 1,
        activateYn: 1,
        globalDnYn: 0,
        backUpNodeId: 0,
        accessCodeProfileId: 0,
        drAccessCodeProfileId: 0,
        initMent: 0,
        waitMent: 0,
        closeMent: 0,
        blockMent: 0,
        connMent: 0,
        holdMent: 0,
        coConnMent: 0,
        coHoldMent: 0,
        blockYn: 0,
        closeType: 0,
        maxWaittimeYn: 0,
        maxWaittime: 0,
        collectYn: 1,
        collectTimeout: 10,
        serviceLevelTime: 20,
        abandonAcktime: 0,
        serviceLevelTargetYn: 0,
        serviceLevelTargetValue: 0,
        overflowCnt: 100,
        firstGroupId: 0,
        routingPriority: 9,
        routingType: 1,
        routingKind: 1,
        reconnPriorityYn: 1,
        forceTransYn: 1,
        bsrYn: 0,
        bsrDistributeYn: 1,
        bsrGroupId: 0,
        bsrWeight: 100,
        applyType: 0,
        applyDate: '',
        applyHour: '00',
        applyMinute: '00',
        ...mediaVals,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, form]);

  // ─── 옵션 도착 후 async select 실제 값 적용 (BUG-2: raw ID flash 방지) ──────────
  // 기본라우팅그룹: 옵션에 해당 값이 존재할 때 실제 값 적용 (옵션 없이 set 하면 raw ID 노출)
  useEffect(() => {
    if (!state.open) return;
    const v = pendingAsyncValues.current.firstGroupId;
    if (v && groupSelectOptions.some((o) => o.value === v) && form.getFieldValue('firstGroupId') !== v) {
      form.setFieldsValue({ firstGroupId: v });
    }
  }, [state.open, groupSelectOptions, form]);

  // BSR 그룹: 옵션에 해당 값이 존재할 때 실제 값 적용
  useEffect(() => {
    if (!state.open) return;
    const v = pendingAsyncValues.current.bsrGroupId;
    if (v && bsrGroupSelectOptions.some((o) => o.value === v) && form.getFieldValue('bsrGroupId') !== v) {
      form.setFieldsValue({ bsrGroupId: v });
    }
  }, [state.open, bsrGroupSelectOptions, form]);

  // 미디어별 스킬셋: 옵션에 해당 값이 존재할 때 실제 값 적용
  useEffect(() => {
    if (!state.open) return;
    const skills = pendingAsyncValues.current.skills;
    const patch: Record<string, number> = {};
    for (const [key, v] of Object.entries(skills)) {
      if (v && skillsetSelectOptions.some((o) => o.value === v) && form.getFieldValue(key) !== v) patch[key] = v;
    }
    if (Object.keys(patch).length > 0) form.setFieldsValue(patch as Parameters<typeof form.setFieldsValue>[0]);
  }, [state.open, skillsetSelectOptions, form]);

  // 접근코드 프로파일: 옵션에 해당 값이 존재할 때 실제 값 적용
  useEffect(() => {
    if (!state.open) return;
    const v = pendingAsyncValues.current.accessCodeProfileId;
    if (v && accessProfileSelectOptions.some((o) => o.value === v) && form.getFieldValue('accessCodeProfileId') !== v) {
      form.setFieldsValue({ accessCodeProfileId: v });
    }
  }, [state.open, accessProfileSelectOptions, form]);

  // 접근코드 프로파일(DR): 옵션에 해당 값이 존재할 때 실제 값 적용
  useEffect(() => {
    if (!state.open) return;
    const v = pendingAsyncValues.current.drAccessCodeProfileId;
    if (v && drAccessProfileSelectOptions.some((o) => o.value === v) && form.getFieldValue('drAccessCodeProfileId') !== v) {
      form.setFieldsValue({ drAccessCodeProfileId: v });
    }
  }, [state.open, drAccessProfileSelectOptions, form]);

  // 초기구성 멘트 콤보: 옵션에 해당 값이 존재할 때 실제 값 적용 (raw ID flash 방지)
  useEffect(() => {
    if (!state.open) return;
    const ments = pendingAsyncValues.current.ments;
    const patch: Record<string, number> = {};
    for (const [key, v] of Object.entries(ments)) {
      if (v && mentSelectOptions.some((o) => o.value === v) && form.getFieldValue(key) !== v) patch[key] = v;
    }
    if (Object.keys(patch).length > 0) form.setFieldsValue(patch as Parameters<typeof form.setFieldsValue>[0]);
  }, [state.open, mentSelectOptions, form]);

  const { mutate: create, isPending: isCreating } = useCreateCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  /** 저장 — 성공 시 Drawer 닫음 */
  const { mutate: update, isPending: isUpdating } = useUpdateCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });

  /** 적용 — 성공 시 Drawer 유지 (SWAT btApply 정합: 저장 후 팝업 open 유지) */
  const { mutate: apply, isPending: isApplying } = useUpdateCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 적용되었습니다');
        // onClose() 미호출 — Drawer 유지. 그리드 invalidate 는 useUpdateCtiQueue 내부에서 처리됨.
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '적용 실패'),
    },
  });

  // 미디어 스킬 폼값 → Create/Update 필드로 변환
  const collectMediaSkills = (values: FormValues): Partial<CtiQueueCreateRequest> => {
    const out: Record<string, unknown> = {};
    for (const { mediaType } of activeMedia) {
      const { idKey, levelKey } = MEDIA_SKILL_FIELD_MAP[mediaType];
      const id = values[skillIdKey(mediaType)] as number | undefined;
      const lvl = values[skillLevelKey(mediaType)] as number | undefined;
      out[idKey] = id && id !== 0 ? id : null;
      out[levelKey] = lvl ?? 0;
    }
    return out as Partial<CtiQueueCreateRequest>;
  };

  /**
   * 폼 검증 + body 생성. 검증 실패 시 null 반환.
   * mode 'create' → { type:'create', body }  / 'edit' → { type:'edit', ctiqId, body }.
   */
  type SubmitPayload = { type: 'create'; body: CtiQueueCreateRequest } | { type: 'edit'; ctiqId: number; body: CtiQueueUpdateRequest };

  const buildPayload = async (): Promise<SubmitPayload | null> => {
    if (!state.open) return null;
    try {
      const values = await form.validateFields();

      // BSR 사용=설정 + 그룹 미지정 → 저장 차단 (SWAT :1195)
      if (values.bsrYn === 1 && (!values.bsrGroupId || values.bsrGroupId === 0)) {
        toast.error('BSR 사용 시 BSR 그룹을 선택해야 합니다');
        setActiveTab('routing');
        return null;
      }
      // Skill-Based 라우팅 → 미디어 스킬 1개 이상 필수 (SWAT :361-368)
      if (skillRequired) {
        const anySkill = activeMedia.some(({ mediaType }) => {
          const id = values[skillIdKey(mediaType)] as number | undefined;
          return id && id !== 0;
        });
        if (!anySkill) {
          toast.error('Skill-Based 라우팅은 미디어별 스킬셋을 1개 이상 지정해야 합니다');
          setActiveTab('routing');
          return null;
        }
      }

      const mediaSkills = collectMediaSkills(values);
      const common = {
        ctiqName: values.ctiqName?.trim() || values.gdnName || '',
        ctiqDesc: values.ctiqDesc,
        inoutKind: values.inoutKind,
        sortSeq: values.sortSeq,
        activateYn: values.activateYn,
        globalDnYn: values.globalDnYn,
        backUpNodeId: values.backUpNodeId ?? 0,
        accessCodeProfileId: values.accessCodeProfileId ?? 0,
        drAccessCodeProfileId: values.drAccessCodeProfileId ?? 0,
        initMent: values.initMent ?? 0,
        waitMent: values.waitMent ?? 0,
        closeMent: values.closeMent ?? 0,
        blockMent: values.blockMent ?? 0,
        connMent: values.connMent ?? 0,
        holdMent: values.holdMent ?? 0,
        coConnMent: values.coConnMent ?? 0,
        coHoldMent: values.coHoldMent ?? 0,
        blockYn: values.blockYn,
        closeType: values.closeType,
        errorRoutingDnis: values.errorRoutingDnis,
        blockRoutingDnis: values.blockRoutingDnis,
        busyRoutingDnis: values.busyRoutingDnis,
        maxWaittimeYn: values.maxWaittimeYn,
        maxWaittime: values.maxWaittime,
        collectYn: values.collectYn,
        collectTimeout: values.collectTimeout,
        serviceLevelTime: values.serviceLevelTime,
        abandonAcktime: values.abandonAcktime,
        serviceLevelTargetYn: values.serviceLevelTargetYn,
        serviceLevelTargetValue: values.serviceLevelTargetValue,
        overflowQid: values.overflowQid,
        overflowCnt: values.overflowCnt,
        firstGroupId: values.firstGroupId ?? 0,
        routingPriority: values.routingPriority,
        routingType: values.routingType,
        routingKind: values.routingKind,
        reconnPriorityYn: values.reconnPriorityYn,
        forceTransYn: values.forceTransYn,
        bsrYn: values.bsrYn,
        bsrDistributeYn: values.bsrDistributeYn,
        bsrGroupId: values.bsrGroupId ?? 0,
        bsrWeight: values.bsrWeight,
        // 예약 적용 (SWAT applyType/applyDatetime 정합)
        // FE: applyDate('YYYYMMDD') + applyHour('HH') + applyMinute('mm') → 'YYYYMMDDHHmm' 12자리
        applyType: values.applyType ?? 0,
        applyDatetime:
          values.applyType === 1 && values.applyDate
            ? `${values.applyDate}${String(values.applyHour ?? '00').padStart(2, '0')}${String(values.applyMinute ?? '00').padStart(2, '0')}`
            : null,
        ...mediaSkills,
      };

      if (state.mode === 'create') {
        const createTenantId = values.tenantId ?? state.tenantId;
        const createNodeId = values.nodeId ?? state.nodeId;
        if (createTenantId == null || createNodeId == null) {
          toast.warning('테넌트와 노드를 먼저 선택하세요');
          setActiveTab('basic');
          return null;
        }
        // 그룹DN 번호 중복 검증
        try {
          const dup = await ctiQueueApi.duplicateCheck({ nodeId: createNodeId, gdnNo: values.gdnNo! });
          if (dup) {
            toast.error('동일 노드에 이미 사용 중인 번호입니다 (DN/SIP 트렁크 포함)');
            setActiveTab('basic');
            return null;
          }
        } catch {
          // duplicate-check 실패는 등록 진행 (BE 가 최종 차단)
        }
        const body: CtiQueueCreateRequest = {
          tenantId: createTenantId,
          nodeId: createNodeId,
          gdnNo: values.gdnNo!,
          gdnName: values.gdnName!,
          ...common,
        };
        return { type: 'create', body } satisfies SubmitPayload;
      } else if (state.mode === 'edit' && state.row) {
        const body: CtiQueueUpdateRequest = {
          gdnName: values.gdnName,
          ...common,
        };
        return { type: 'edit', ctiqId: state.row.ctiqId, body } satisfies SubmitPayload;
      }
      return null;
    } catch {
      // antd validation — inline
      return null;
    }
  };

  /** 저장 클릭 — Drawer 닫음 */
  const onSave = async () => {
    const payload = await buildPayload();
    if (!payload) return;
    if (payload.type === 'create') {
      create(payload.body);
    } else {
      update({ ctiqId: payload.ctiqId, body: payload.body });
    }
  };

  /** 적용 클릭 — Drawer 유지 (SWAT btApply 정합) */
  const onApply = async () => {
    const payload = await buildPayload();
    if (!payload || payload.type !== 'edit') return;
    apply({ ctiqId: payload.ctiqId, body: payload.body });
  };

  // ─── YN Radio ───────────────────────────────────────────────────────────────
  const ynRadio = (onLabel = '설정', offLabel = '해제') => (
    <Radio.Group>
      <Radio value={1}>{onLabel}</Radio>
      <Radio value={0}>{offLabel}</Radio>
    </Radio.Group>
  );

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'basic',
      label: '기본정보',
      forceRender: true,
      children: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {isEdit ? (
            <Form.Item label="테넌트명">
              <Input value={(state.open && state.tenantName) || (state.open && state.tenantId != null ? `테넌트 ${state.tenantId}` : '-')} disabled />
            </Form.Item>
          ) : (
            <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
              <Select options={tenantOptions} showSearch optionFilterProp="label" placeholder="테넌트 선택" />
            </Form.Item>
          )}
          {isEdit ? (
            <Form.Item label="노드">
              <Input value={state.open ? (state.nodeName ?? (state.nodeId != null ? `노드 ${state.nodeId}` : '-')) : '-'} disabled />
            </Form.Item>
          ) : (
            <Form.Item label="노드" name="nodeId" rules={[{ required: true, message: '노드를 선택하세요' }]}>
              <Select options={nodeOptions} showSearch optionFilterProp="label" placeholder="노드 선택" />
            </Form.Item>
          )}
          <Form.Item label="DR노드 ID (백업 노드)" name="backUpNodeId" tooltip="DR노드 지정 시 Global DN 사용이 강제됩니다">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="없으면 0" />
          </Form.Item>
          <Form.Item label="Global DN" name="globalDnYn">
            <Radio.Group disabled={hasDrNode}>
              <Radio value={1}>사용</Radio>
              <Radio value={0}>사용안함</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="그룹DN ID">
            <Input value={state.open && state.row ? String(state.row.gdnId ?? '') : ''} placeholder="(저장 후 자동 채번)" disabled />
          </Form.Item>
          <div />
          <Form.Item
            className="col-span-2"
            label="그룹DN번호"
            name="gdnNo"
            rules={[
              { required: true, message: '그룹DN번호는 필수입니다' },
              { pattern: /^\d{3,8}$/, message: '숫자 3~8자리만 입력 (SWAT 정합)' },
            ]}
            extra="숫자만 입력 · 3~8자리 · 저장 시 중복체크"
          >
            <Input maxLength={8} disabled={isEdit} placeholder="숫자 3~8자리" style={{ width: 240 }} />
          </Form.Item>
          <Form.Item className="col-span-2" label="그룹DN이름" name="gdnName" rules={[{ required: true, max: 200, message: '1~200자 필수' }]}>
            <Input maxLength={200} placeholder="입력 시 큐설정 탭의 CTI큐이름에 자동복사" onChange={(e) => copyGdnNameToQueue(e.target.value)} />
          </Form.Item>
          <Form.Item label="접근코드 프로파일" name="accessCodeProfileId" tooltip="큐 노드 기준 접근코드 프로파일 (미지정=0)">
            <Select options={accessProfileSelectOptions} loading={accessProfileLoading} showSearch optionFilterProp="label" placeholder="미지정" />
          </Form.Item>
          <Form.Item label="접근코드 프로파일(DR)" name="drAccessCodeProfileId" tooltip="DR노드 지정 시 활성 — DR노드 기준 접근코드 프로파일">
            <Select
              options={drAccessProfileSelectOptions}
              loading={drAccessProfileLoading}
              disabled={!hasDrNode}
              showSearch
              optionFilterProp="label"
              placeholder={hasDrNode ? '미지정' : 'DR노드 지정 시 활성'}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'init',
      label: '초기구성',
      forceRender: true,
      children: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <Form.Item label="초기멘트" name="initMent" tooltip="교환기 멘트 관리에 등록된 멘트(노드/테넌트 기준)">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="장애시라우팅 DN" name="errorRoutingDnis" rules={[{ max: 24 }]}>
            <Input maxLength={24} className="font-mono" placeholder="DN 숫자" />
          </Form.Item>
          <Form.Item label="대기멘트" name="waitMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="블럭시라우팅 DN" name="blockRoutingDnis" rules={[{ max: 24 }]}>
            <Input maxLength={24} className="font-mono" placeholder="DN 숫자" />
          </Form.Item>
          <Form.Item label="종료멘트" name="closeMent">
            <Select options={mentSelectOptions} loading={mentLoading} disabled={blockOff} showSearch optionFilterProp="label" placeholder="블럭=설정 시 활성" />
          </Form.Item>
          <Form.Item label="Busy시라우팅 DN" name="busyRoutingDnis" rules={[{ max: 24 }]}>
            <Input maxLength={24} className="font-mono" disabled={blockOff} placeholder="DN 숫자" />
          </Form.Item>
          <Form.Item label="블럭멘트" name="blockMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="기본연결멘트" name="connMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="기본보류멘트" name="holdMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="국선호연결멘트" name="coConnMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <Form.Item label="국선호보류멘트" name="coHoldMent">
            <Select options={mentSelectOptions} loading={mentLoading} showSearch optionFilterProp="label" placeholder="없음" />
          </Form.Item>
          <div className="col-span-2 my-2 border-t border-dashed border-gray-200" />
          <Form.Item label="블럭여부" name="blockYn">
            {ynRadio('설정', '해제')}
          </Form.Item>
          <Form.Item label="블럭설정(종료방법)" name="closeType">
            <Select options={CLOSE_TYPE_OPTIONS} disabled={blockOff} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'queue',
      label: '큐설정',
      forceRender: true,
      children: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <Form.Item label="IN/OUT구분" name="inoutKind">
            <Select options={INOUT_KIND_OPTIONS} />
          </Form.Item>
          <Form.Item label="정렬순서" name="sortSeq">
            <InputNumber style={{ width: '100%' }} min={1} max={9999} />
          </Form.Item>
          <Form.Item className="col-span-2" label="CTI큐이름" name="ctiqName" rules={[{ required: true, max: 200, message: '1~200자 필수' }]}>
            <Input maxLength={200} placeholder="그룹DN이름 자동복사" />
          </Form.Item>
          <Form.Item label="호회수사용여부" name="collectYn">
            {ynRadio()}
          </Form.Item>
          <Form.Item label="호회수타임아웃(초)" name="collectTimeout">
            <InputNumber style={{ width: '100%' }} min={0} max={9999} disabled={collectOff} />
          </Form.Item>
          <Form.Item label="호우회대상번호" name="overflowQid" rules={[{ max: 48 }]}>
            <Input maxLength={48} className="font-mono" placeholder="DN 숫자" />
          </Form.Item>
          <Form.Item label="호우회기준수" name="overflowCnt">
            <InputNumber style={{ width: '100%' }} min={0} max={99999} />
          </Form.Item>
          <Form.Item label="최대대기시간사용유무" name="maxWaittimeYn">
            {ynRadio()}
          </Form.Item>
          <Form.Item label="최대대기시간(초)" name="maxWaittime">
            <InputNumber style={{ width: '100%' }} min={0} max={9999} disabled={maxWaitOff} />
          </Form.Item>
          <Form.Item label="큐포기인정(초)" name="abandonAcktime" rules={[{ required: true, message: '필수' }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="서비스레벨(초)" name="serviceLevelTime" rules={[{ required: true, message: '필수' }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="목표 SL 라우팅 사용" name="serviceLevelTargetYn">
            {ynRadio()}
          </Form.Item>
          <Form.Item label="목표 서비스레벨(%)" name="serviceLevelTargetValue">
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item className="col-span-2" label="CTI큐설명" name="ctiqDesc" rules={[{ max: 512 }]}>
            <Input maxLength={512} />
          </Form.Item>
          {/* 예약 적용 (SWAT IPR20S3020 applyType/applyDatetime 정합) */}
          <div className="col-span-2 border-t border-dashed border-gray-200 mt-1 pt-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Form.Item label="적용방식" name="applyType" className="!mb-0">
                <Radio.Group>
                  <Radio value={0}>즉시 적용</Radio>
                  <Radio value={1}>예약 적용</Radio>
                </Radio.Group>
              </Form.Item>
              {wApplyType === 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Form.Item
                    label="예약일자"
                    name="applyDate"
                    className="!mb-0"
                    rules={[
                      { required: wApplyType === 1, message: '날짜 필수 (YYYYMMDD)' },
                      { pattern: /^\d{8}$/, message: 'YYYYMMDD 형식' },
                    ]}
                  >
                    <Input maxLength={8} className="font-mono w-28" placeholder="YYYYMMDD" />
                  </Form.Item>
                  <Form.Item label="시" name="applyHour" className="!mb-0" rules={[{ pattern: /^\d{2}$/, message: 'HH' }]}>
                    <Input maxLength={2} className="font-mono w-14" placeholder="HH" />
                  </Form.Item>
                  <Form.Item label="분" name="applyMinute" className="!mb-0" rules={[{ pattern: /^\d{2}$/, message: 'mm' }]}>
                    <Input maxLength={2} className="font-mono w-14" placeholder="mm" />
                  </Form.Item>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'routing',
      label: '라우팅정보',
      forceRender: true,
      children: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Form.Item label="기본라우팅그룹" name="firstGroupId" rules={[{ required: true, message: '필수' }]}>
              <Select options={groupSelectOptions} loading={groupLoading} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item label="분배우선순위 (0~9)" name="routingPriority">
              <InputNumber style={{ width: '100%' }} min={0} max={9} />
            </Form.Item>
            <Form.Item label="라우팅타입" name="routingType">
              <Select options={ROUTING_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item label="라우팅기준" name="routingKind">
              <Select options={ROUTING_KIND_OPTIONS} />
            </Form.Item>
            <Form.Item label="재진입우선순위보장" name="reconnPriorityYn">
              {ynRadio()}
            </Form.Item>
            <Form.Item label="활성화여부" name="activateYn">
              <Radio.Group disabled={reconnOff}>
                <Radio value={1}>설정</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="강제호전환사용유무" name="forceTransYn">
              <Radio.Group disabled={reconnOff}>
                <Radio value={1}>설정</Radio>
                <Radio value={0}>해제</Radio>
              </Radio.Group>
            </Form.Item>
          </div>

          {/* 미디어별 SKILL */}
          <section className="border-t border-dashed border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-semibold text-gray-600">미디어별 기본 SKILL</h4>
              <span className="text-[11px] text-gray-400">(테넌트 라이선스 활성 미디어만 노출)</span>
              {skillRequired && <span className="text-[11px] bg-red-50 text-red-500 border border-red-200 rounded px-1.5 py-0.5">Skill-Based — 스킬셋 필수</span>}
            </div>
            <div className="space-y-1.5">
              {activeMedia.map(({ mediaType, label }) => (
                <div key={mediaType} className={`grid grid-cols-[180px_1fr_120px] gap-3 items-center py-1 px-2 rounded ${skillRequired ? 'bg-red-50/40' : ''}`}>
                  <span className="text-[12.5px] text-gray-700">{label}</span>
                  <Form.Item name={skillIdKey(mediaType)} className="!mb-0">
                    <Select options={skillsetSelectOptions} loading={skillsetLoading} showSearch optionFilterProp="label" size="small" />
                  </Form.Item>
                  <Form.Item name={skillLevelKey(mediaType)} className="!mb-0">
                    <InputNumber style={{ width: '100%' }} min={0} max={99} size="small" placeholder="레벨 (0=미사용)" />
                  </Form.Item>
                </div>
              ))}
            </div>
          </section>

          {/* BSR */}
          <section className="border-t border-dashed border-gray-200 pt-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-3">BSR (Best Skill Routing)</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Form.Item label="BSR 사용여부" name="bsrYn">
                {ynRadio()}
              </Form.Item>
              <Form.Item label="BSR 분배여부" name="bsrDistributeYn">
                {ynRadio()}
              </Form.Item>
              <Form.Item label="BSR 그룹" name="bsrGroupId" required={bsrOn}>
                <Select options={bsrGroupSelectOptions} loading={bsrGroupLoading} disabled={!bsrOn} showSearch optionFilterProp="label" />
              </Form.Item>
              <Form.Item label="BSR 가중치 (0~1000)" name="bsrWeight">
                <InputNumber style={{ width: '100%' }} min={0} max={1000} disabled={!bsrOn} />
              </Form.Item>
            </div>
          </section>

          {/* BSR Schedule 서브그리드 */}
          <section className="border-t border-dashed border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500">
                BSR Schedule 설정 <span className="text-gray-400 font-normal">{isEdit ? '' : '(저장 후 활성)'}</span>
              </h4>
              {isEdit && (
                <Button
                  size="small"
                  icon={<Plus className="size-3" />}
                  onClick={() => {
                    setBsrPickerSelected([]);
                    setBsrPickerOpen(true);
                  }}
                  disabled={bsrAssigning || bsrUnassigning}
                >
                  추가
                </Button>
              )}
            </div>
            {isEdit ? (
              <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full border-collapse text-[11.5px] whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-2 h-8 border-b text-left">스케쥴명</th>
                      <th className="px-2 h-8 border-b text-left">시작일자</th>
                      <th className="px-2 h-8 border-b text-left">종료일자</th>
                      <th className="px-2 h-8 border-b text-right">시작</th>
                      <th className="px-2 h-8 border-b text-right">종료</th>
                      <th className="px-2 h-8 border-b text-center">요일</th>
                      <th className="px-2 h-8 border-b text-right">가중치</th>
                      <th className="px-2 h-8 border-b text-center">인입/전환</th>
                      <th className="px-2 h-8 border-b text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bsrSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-2 h-10 text-center text-gray-400">
                          배정된 BSR 스케쥴이 없습니다
                        </td>
                      </tr>
                    ) : (
                      bsrSchedules.map((s) => (
                        <tr key={s.quebsrScheduleId} className="hover:bg-gray-50">
                          <td className="px-2 h-8 border-b">{s.quebsrScheduleName ?? '-'}</td>
                          <td className="px-2 h-8 border-b">{s.startDate ?? '-'}</td>
                          <td className="px-2 h-8 border-b">{s.endDate ?? '-'}</td>
                          <td className="px-2 h-8 border-b text-right">{s.startTime ?? '-'}</td>
                          <td className="px-2 h-8 border-b text-right">{s.finishTime ?? '-'}</td>
                          <td className="px-2 h-8 border-b text-center">{dayString(s)}</td>
                          <td className="px-2 h-8 border-b text-right">{s.bsrWeight ?? '-'}</td>
                          <td className="px-2 h-8 border-b text-center">
                            {ynChar(s.useBsrIncomYn)} / {ynChar(s.useBsrRdyrouteYn)}
                          </td>
                          <td className="px-2 h-8 border-b text-center">
                            <button
                              type="button"
                              disabled={bsrUnassigning}
                              onClick={() => ctiqId != null && unassignBsr({ ctiqId, scheduleId: s.quebsrScheduleId })}
                              className="text-red-400 hover:text-red-600 disabled:opacity-40"
                              title="배정 해제"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11.5px] text-gray-400">큐 저장 후 BSR 스케쥴을 배정할 수 있습니다.</p>
            )}
          </section>
        </div>
      ),
    },
    {
      key: 'slt',
      label: '목표SLT스케쥴',
      disabled: !isEdit,
      forceRender: true,
      children: (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gray-700">목표 서비스레벨 스케쥴</h4>
            <Button
              size="small"
              icon={<Plus className="size-3" />}
              onClick={() => {
                setSltPickerSelected([]);
                setSltPickerOpen(true);
              }}
              disabled={sltAssigning || sltUnassigning}
            >
              추가
            </Button>
          </div>
          <div className="border border-gray-200 rounded overflow-x-auto">
            <table className="w-full border-collapse text-[12px] whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2.5 h-8 border-b text-left">스케쥴명</th>
                  <th className="px-2.5 h-8 border-b text-left">시작일자</th>
                  <th className="px-2.5 h-8 border-b text-right">시작시간</th>
                  <th className="px-2.5 h-8 border-b text-right">종료시간</th>
                  <th className="px-2 h-8 border-b text-center">요일</th>
                  <th className="px-2 h-8 border-b text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sltSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2.5 h-10 text-center text-gray-400">
                      배정된 목표 SLT 스케쥴이 없습니다
                    </td>
                  </tr>
                ) : (
                  sltSchedules.map((s) => (
                    <tr key={s.sltScheduleId} className="hover:bg-gray-50">
                      <td className="px-2.5 h-9 border-b">{s.sltScheduleName ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b">{s.startDate ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b text-right">{s.startTime ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b text-right">{s.finshTime ?? '-'}</td>
                      <td className="px-2 h-9 border-b text-center">{dayString(s)}</td>
                      <td className="px-2 h-9 border-b text-center">
                        <button
                          type="button"
                          disabled={sltUnassigning}
                          onClick={() => ctiqId != null && unassignSlt({ ctiqId, scheduleId: s.sltScheduleId })}
                          className="text-red-400 hover:text-red-600 disabled:opacity-40"
                          title="배정 해제"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={isEdit ? 'CTI 큐 수정' : 'CTI 큐 등록'}
        closable={{ placement: 'end' }}
        width={880}
        open={state.open}
        onClose={onClose}
        destroyOnClose
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button onClick={onClose}>취소</Button>
            {isEdit && (
              <Button loading={isApplying} disabled={isCreating || isUpdating} onClick={onApply}>
                적용
              </Button>
            )}
            <Button type="primary" loading={isCreating || isUpdating} disabled={isApplying} onClick={onSave}>
              저장
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Form>
      </Drawer>

      {/* BSR 스케쥴 배정 피커 (SWAT IPR20S3020SIL.do 정합) */}
      <Modal
        title="BSR 스케쥴 배정"
        open={bsrPickerOpen}
        onCancel={() => {
          setBsrPickerOpen(false);
          setBsrPickerSelected([]);
        }}
        onOk={() => {
          if (bsrPickerSelected.length === 0) {
            toast.warning('배정할 스케쥴을 1개 이상 선택하세요');
            return;
          }
          if (ctiqId == null) return;
          assignBsr({ ctiqId, body: { scheduleIds: bsrPickerSelected } });
        }}
        okText="배정"
        cancelText="취소"
        confirmLoading={bsrAssigning}
        width={780}
      >
        <p className="text-[11.5px] text-gray-500 mb-2">이미 배정된 스케쥴은 비활성(선택 불가)입니다.</p>
        <div className="border border-gray-200 rounded overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full border-collapse text-[11.5px] whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 sticky top-0">
              <tr>
                <th className="px-2 h-8 border-b text-center w-8"></th>
                <th className="px-2 h-8 border-b text-left">스케쥴명</th>
                <th className="px-2 h-8 border-b text-left">시작일자</th>
                <th className="px-2 h-8 border-b text-left">종료일자</th>
                <th className="px-2 h-8 border-b text-right">시작</th>
                <th className="px-2 h-8 border-b text-right">종료</th>
                <th className="px-2 h-8 border-b text-center">요일</th>
                <th className="px-2 h-8 border-b text-right">가중치</th>
                <th className="px-2 h-8 border-b text-center">인입/전환</th>
              </tr>
            </thead>
            <tbody>
              {bsrPoolLoading ? (
                <tr>
                  <td colSpan={9} className="px-2 h-10 text-center text-gray-400">
                    로딩중…
                  </td>
                </tr>
              ) : bsrSchedulePool.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 h-10 text-center text-gray-400">
                    조회된 BSR 스케쥴이 없습니다
                  </td>
                </tr>
              ) : (
                bsrSchedulePool.map((s) => {
                  const alreadyAssigned = assignedBsrIds.has(s.quebsrScheduleId);
                  const checked = bsrPickerSelected.includes(s.quebsrScheduleId);
                  return (
                    <tr
                      key={s.quebsrScheduleId}
                      className={alreadyAssigned ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50 cursor-pointer'}
                      onClick={() => {
                        if (alreadyAssigned) return;
                        setBsrPickerSelected((prev) => (checked ? prev.filter((id) => id !== s.quebsrScheduleId) : [...prev, s.quebsrScheduleId]));
                      }}
                    >
                      <td className="px-2 h-8 border-b text-center">
                        <Checkbox
                          checked={checked || alreadyAssigned}
                          disabled={alreadyAssigned}
                          onChange={() => {
                            if (alreadyAssigned) return;
                            setBsrPickerSelected((prev) => (checked ? prev.filter((id) => id !== s.quebsrScheduleId) : [...prev, s.quebsrScheduleId]));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-2 h-8 border-b">{s.quebsrScheduleName ?? '-'}</td>
                      <td className="px-2 h-8 border-b">{s.startDate ?? '-'}</td>
                      <td className="px-2 h-8 border-b">{s.endDate ?? '-'}</td>
                      <td className="px-2 h-8 border-b text-right">{s.startTime ?? '-'}</td>
                      <td className="px-2 h-8 border-b text-right">{s.finishTime ?? '-'}</td>
                      <td className="px-2 h-8 border-b text-center">{dayString(s)}</td>
                      <td className="px-2 h-8 border-b text-right">{s.bsrWeight ?? '-'}</td>
                      <td className="px-2 h-8 border-b text-center">
                        {ynChar(s.useBsrIncomYn)} / {ynChar(s.useBsrRdyrouteYn)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* SLT 스케쥴 배정 피커 */}
      <Modal
        title="SLT 스케쥴 배정"
        open={sltPickerOpen}
        onCancel={() => {
          setSltPickerOpen(false);
          setSltPickerSelected([]);
        }}
        onOk={() => {
          if (sltPickerSelected.length === 0) {
            toast.warning('배정할 스케쥴을 1개 이상 선택하세요');
            return;
          }
          if (ctiqId == null) return;
          assignSlt({ ctiqId, body: { scheduleIds: sltPickerSelected } });
        }}
        okText="배정"
        cancelText="취소"
        confirmLoading={sltAssigning}
        width={680}
      >
        <p className="text-[11.5px] text-gray-500 mb-2">이미 배정된 스케쥴은 비활성(선택 불가)입니다.</p>
        <div className="border border-gray-200 rounded overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full border-collapse text-[12px] whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 sticky top-0">
              <tr>
                <th className="px-2 h-8 border-b text-center w-8"></th>
                <th className="px-2.5 h-8 border-b text-left">스케쥴명</th>
                <th className="px-2.5 h-8 border-b text-left">시작일자</th>
                <th className="px-2.5 h-8 border-b text-right">시작시간</th>
                <th className="px-2.5 h-8 border-b text-right">종료시간</th>
                <th className="px-2 h-8 border-b text-center">요일</th>
              </tr>
            </thead>
            <tbody>
              {sltPoolLoading ? (
                <tr>
                  <td colSpan={6} className="px-2.5 h-10 text-center text-gray-400">
                    로딩중…
                  </td>
                </tr>
              ) : sltSchedulePool.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2.5 h-10 text-center text-gray-400">
                    조회된 SLT 스케쥴이 없습니다
                  </td>
                </tr>
              ) : (
                sltSchedulePool.map((s) => {
                  const alreadyAssigned = assignedSltIds.has(s.sltScheduleId);
                  const checked = sltPickerSelected.includes(s.sltScheduleId);
                  return (
                    <tr
                      key={s.sltScheduleId}
                      className={alreadyAssigned ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50 cursor-pointer'}
                      onClick={() => {
                        if (alreadyAssigned) return;
                        setSltPickerSelected((prev) => (checked ? prev.filter((id) => id !== s.sltScheduleId) : [...prev, s.sltScheduleId]));
                      }}
                    >
                      <td className="px-2 h-8 border-b text-center">
                        <Checkbox
                          checked={checked || alreadyAssigned}
                          disabled={alreadyAssigned}
                          onChange={() => {
                            if (alreadyAssigned) return;
                            setSltPickerSelected((prev) => (checked ? prev.filter((id) => id !== s.sltScheduleId) : [...prev, s.sltScheduleId]));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-2.5 h-9 border-b">{s.sltScheduleName ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b">{s.startDate ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b text-right">{s.startTime ?? '-'}</td>
                      <td className="px-2.5 h-9 border-b text-right">{s.finshTime ?? '-'}</td>
                      <td className="px-2 h-9 border-b text-center">{dayString(s)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

function ynChar(v: number | null | undefined): string {
  return v === 1 ? 'Y' : 'N';
}

function dayString(s: { mon: number | null; tue: number | null; wed: number | null; thu: number | null; fri: number | null; sat: number | null; sun: number | null }): string {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const vals = [s.mon, s.tue, s.wed, s.thu, s.fri, s.sat, s.sun];
  const on = labels.filter((_, i) => vals[i] === 1);
  return on.length === 0 ? '-' : on.join('');
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
