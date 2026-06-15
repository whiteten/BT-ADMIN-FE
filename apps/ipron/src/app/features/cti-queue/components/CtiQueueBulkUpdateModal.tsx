/**
 * CTI 큐 일괄 설정 모달 (P1).
 *
 * 설계: PLAN-ctiq-bulk-mgmt.md § 2-1 (어드바이저 확정 설계).
 * 목업: C:\bt-admin-ipron-work\ipron-cti-queue\mockups\ctiq-bulk-edit.html
 *
 * 동작:
 *   1. 좌측 필드 체크 목록(field mask) — 체크한 항목만 서버 전송.
 *   2. 우측 값 입력 + 현재 값 분포 (FE 메모리 집계, BE 추가 API 불필요).
 *   3. 테넌트 혼합 선택 시 참조형 항목(스킬/기본라우팅그룹) disabled.
 *   4. 푸터: 적용방식(즉시/예약) + [취소][적용(N)].
 *   5. 적용 후 확인 다이얼로그 → PUT bulk-update → 결과 모달(207).
 *
 * BSR 항목 미탑재: BSR 그룹 관리 화면이 역방향 정본(2경로 금지 — PLAN § 1).
 *
 * UI 규약 준수:
 *   - 라벨 약어 금지 (풀네임 사용)
 *   - 상주 설명 캡션/배너 금지
 *   - 토스트 마침표 없음
 *   - 저장버튼 상시활성 + "변경할 데이터가 존재하지 않습니다" 토스트
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Form, InputNumber, Modal, Radio, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { useBulkUpdateCtiQueues } from '../hooks/useCtiQueueQueries';
import {
  type BulkFieldGroup,
  type BulkFieldKey,
  type CtiQueueBulkItemResult,
  type CtiQueueBulkResult,
  type CtiQueueBulkUpdateRequest,
  type CtiQueueMediaOption,
  type CtiQueueOptionItem,
  type CtiQueueResponse,
  MEDIA_SKILL_FIELD_MAP,
} from '../types';

// ──────────────────────────────────────────────────────────
//  미디어 타입 코드 → BulkFieldKey 매핑 (동적 스킬 섹션)
// ──────────────────────────────────────────────────────────

/** 미디어 타입 코드 → { bulkKey, idField, levelField } */
const MEDIA_BULK_KEY_MAP: Record<number, { bulkKey: BulkFieldKey; idField: string; levelField: string }> = {
  0: { bulkKey: 'voipSkill', idField: 'voipSkillId', levelField: 'voipSkillLevel' },
  10: { bulkKey: 'chatSkill', idField: 'chatSkillId', levelField: 'chatSkillLevel' },
  20: { bulkKey: 'videoVoiceSkill', idField: 'videoVoiceSkillId', levelField: 'videoVoiceSkillLevel' },
  30: { bulkKey: 'videoChatSkill', idField: 'videoChatSkillId', levelField: 'videoChatSkillLevel' },
  40: { bulkKey: 'emailSkill', idField: 'emailSkillId', levelField: 'emailSkillLevel' },
  50: { bulkKey: 'faxSkill', idField: 'faxSkillId', levelField: 'faxSkillLevel' },
  61: { bulkKey: 'mvoipSkill', idField: 'mvoipSkillId', levelField: 'mvoipSkillLevel' },
  80: { bulkKey: 'smsSkill', idField: 'smsSkillId', levelField: 'smsSkillLevel' },
};

/** mediaType → 응답 필드(CtiQueueResponse) idKey/levelKey (분포 집계용). */
const MEDIA_RESPONSE_KEY_MAP: Record<number, { idKey: keyof CtiQueueResponse; levelKey: keyof CtiQueueResponse }> = {
  0: { idKey: 'voipSkillId', levelKey: 'voipSkillLevel' },
  10: { idKey: 'chatSkillId', levelKey: 'chatSkillLevel' },
  20: { idKey: 'videoVoiceSkillId', levelKey: 'videoVoiceSkillLevel' },
  30: { idKey: 'videoChatSkillId', levelKey: 'videoChatSkillLevel' },
  40: { idKey: 'emailSkillId', levelKey: 'emailSkillLevel' },
  50: { idKey: 'faxSkillId', levelKey: 'faxSkillLevel' },
  61: { idKey: 'mvoipSkillId', levelKey: 'mvoipSkillLevel' },
  80: { idKey: 'smsSkillId', levelKey: 'smsSkillLevel' },
};

// ──────────────────────────────────────────────────────────
//  참조형 스킬 BulkFieldKey 집합 (동적 생성 — 테넌트 혼합 시 disabled)
// ──────────────────────────────────────────────────────────

const ALL_SKILL_BULK_KEYS: Set<BulkFieldKey> = new Set(Object.values(MEDIA_BULK_KEY_MAP).map((m) => m.bulkKey));

// 라우팅·기타 참조형 (비스킬)
const NON_SKILL_REFERENCE_KEYS: Set<BulkFieldKey> = new Set(['firstGroupId'] as BulkFieldKey[]);

// ──────────────────────────────────────────────────────────
//  정적 필드 그룹 (라우팅 + 큐 정책)
// ──────────────────────────────────────────────────────────

const STATIC_BULK_FIELD_GROUPS: BulkFieldGroup[] = [
  {
    groupKey: 'routing',
    label: '라우팅',
    fields: [
      { key: 'firstGroupId', label: '기본 라우팅그룹' },
      // P2: 접근코드 프로파일 — 노드별 콤보 데이터 연동 후 노출
      { key: 'routingType', label: '라우팅 방식' },
      { key: 'routingPriority', label: '라우팅 우선순위' },
    ],
  },
  {
    groupKey: 'policy',
    label: '큐 정책',
    fields: [
      { key: 'maxWaittimeYn', label: '최대대기 사용' },
      { key: 'serviceLevelTime', label: '서비스 레벨(초)' },
      { key: 'abandonAcktime', label: '큐포기 기준(초)' },
      { key: 'collectYn', label: '호회수 T/O 사용' },
      { key: 'overflowQid', label: '오버플로우 큐' },
      { key: 'serviceLevelTargetYn', label: '서비스 레벨 목표 사용' },
      { key: 'activateYn', label: '활성화' },
      { key: 'blockYn', label: '블록' },
      { key: 'reconnPriorityYn', label: '재진입 우선' },
      { key: 'forceTransYn', label: '강제 호전환' },
    ],
  },
];

// ──────────────────────────────────────────────────────────
//  분포 집계 헬퍼
// ──────────────────────────────────────────────────────────

function calcDist<T extends string | number | null>(values: T[]): { value: T; count: number }[] {
  const map = new Map<T, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4) // 최대 4개까지 표시
    .map(([value, count]) => ({ value, count }));
}

function DistBadge({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <span className="text-xs text-gray-400">-</span>;
  return (
    <span className="text-xs text-gray-400 whitespace-nowrap">
      현재:{' '}
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <span className="text-[#405189] font-semibold">{item.label}</span> <span>{item.count}건</span>
        </span>
      ))}
    </span>
  );
}

// ──────────────────────────────────────────────────────────
//  Props
// ──────────────────────────────────────────────────────────

export interface CtiQueueBulkUpdateModalProps {
  open: boolean;
  selectedRows: CtiQueueResponse[];
  skillsetOptions: CtiQueueOptionItem[];
  groupOptions: CtiQueueOptionItem[];
  /** 시스템 라이선스 활성 미디어 목록 (GET /media-options). 없으면 VOIP/Chat/VideoVoice 3종 fallback. */
  mediaOptions?: CtiQueueMediaOption[];
  onClose: () => void;
}

// ──────────────────────────────────────────────────────────
//  컴포넌트
// ──────────────────────────────────────────────────────────

export default function CtiQueueBulkUpdateModal({ open, selectedRows, skillsetOptions, groupOptions, mediaOptions = [], onClose }: CtiQueueBulkUpdateModalProps) {
  // ─── field mask 상태 ──────────────────────────────────────────────────────
  const [checkedFields, setCheckedFields] = useState<Set<BulkFieldKey>>(new Set());

  // ─── 값 상태 (Form) ──────────────────────────────────────────────────────
  const [form] = Form.useForm();

  // ─── 예약 적용 ───────────────────────────────────────────────────────────
  const [applyType, setApplyType] = useState<0 | 1>(0);
  const [applyDate, setApplyDate] = useState<dayjs.Dayjs | null>(null);
  const [applyHour, setApplyHour] = useState<number>(0);
  const [applyMinute, setApplyMinute] = useState<0 | 30>(0);

  // ─── 결과 모달 ───────────────────────────────────────────────────────────
  const [resultVisible, setResultVisible] = useState(false);
  const [bulkResult, setBulkResult] = useState<CtiQueueBulkResult | null>(null);

  // ─── 초기화 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setCheckedFields(new Set());
      setApplyType(0);
      setApplyDate(null);
      setApplyHour(0);
      setApplyMinute(0);
      form.resetFields();
      setResultVisible(false);
      setBulkResult(null);
    }
  }, [open, form]);

  // ─── 테넌트 혼합 판정 ────────────────────────────────────────────────────
  const isMixedTenant = useMemo(() => {
    const tenantSet = new Set(selectedRows.map((r) => r.tenantId));
    return tenantSet.size > 1;
  }, [selectedRows]);

  // ─── 활성 미디어 항목 (BE mediaOptions 기반, 없으면 VOIP/Chat/VideoVoice fallback) ──
  const activeMediaItems = useMemo(() => {
    const fromBe = mediaOptions.filter((m) => MEDIA_SKILL_FIELD_MAP[m.mediaType] && MEDIA_BULK_KEY_MAP[m.mediaType]);
    if (fromBe.length > 0) return fromBe.map((m) => ({ mediaType: m.mediaType, label: MEDIA_SKILL_FIELD_MAP[m.mediaType].label }));
    return [0, 10, 20].map((mt) => ({ mediaType: mt, label: MEDIA_SKILL_FIELD_MAP[mt].label }));
  }, [mediaOptions]);

  // ─── 스킬 필드 그룹 (동적) ─────────────────────────────────────────────
  const skillFieldGroup: BulkFieldGroup = useMemo(
    () => ({
      groupKey: 'skill',
      label: '스킬',
      fields: activeMediaItems.map((m) => ({
        key: MEDIA_BULK_KEY_MAP[m.mediaType].bulkKey,
        label: m.label.replace(' 기본 SKILL', ' 스킬셋'),
      })),
    }),
    [activeMediaItems],
  );

  // ─── 참조형 키 집합 (테넌트 혼합 시 disabled) ────────────────────────────
  const REFERENCE_FIELD_KEYS = useMemo<Set<BulkFieldKey>>(() => {
    return new Set([...ALL_SKILL_BULK_KEYS, ...NON_SKILL_REFERENCE_KEYS]);
  }, []);

  // ─── 분포 집계 (동적 미디어 기반) ──────────────────────────────────────
  const skillDistMap = useMemo(() => {
    const opts = new Map(skillsetOptions.map((s) => [s.id, s.name]));
    const result = new Map<number, { skillDist: { label: string; count: number }[]; levelDist: { label: string; count: number }[] }>();
    for (const { mediaType } of activeMediaItems) {
      const rk = MEDIA_RESPONSE_KEY_MAP[mediaType];
      if (!rk) continue;
      const skillDist = calcDist(selectedRows.map((r) => r[rk.idKey] as number | null)).map((d) => ({
        label: d.value == null ? '(미사용)' : (opts.get(d.value) ?? String(d.value)),
        count: d.count,
      }));
      const levelDist = calcDist(selectedRows.map((r) => r[rk.levelKey] as number | null)).map((d) => ({
        label: d.value == null ? '-' : String(d.value),
        count: d.count,
      }));
      result.set(mediaType, { skillDist, levelDist });
    }
    return result;
  }, [selectedRows, skillsetOptions, activeMediaItems]);

  const distRoutingType = useMemo(() => {
    const LABELS: Record<number, string> = { 1: '최장대기', 2: '최소콜수', 3: '최소시간', 4: '균등분배', 5: '최장대기(누적)', 6: '최소콜수(큐별)', 7: '최소시간(큐별)' };
    return calcDist(selectedRows.map((r) => r.routingType)).map((d) => ({
      label: d.value == null ? '-' : (LABELS[d.value] ?? String(d.value)),
      count: d.count,
    }));
  }, [selectedRows]);

  const distMaxWaittimeYn = useMemo(
    () =>
      calcDist(selectedRows.map((r) => r.maxWaittimeYn)).map((d) => ({
        label: d.value === 1 ? '사용' : '미사용',
        count: d.count,
      })),
    [selectedRows],
  );

  const distMaxWaittime = useMemo(
    () =>
      calcDist(selectedRows.map((r) => r.maxWaittime)).map((d) => ({
        label: d.value == null ? '-' : `${d.value}초`,
        count: d.count,
      })),
    [selectedRows],
  );

  const distServiceLevel = useMemo(
    () =>
      calcDist(selectedRows.map((r) => r.serviceLevelTime)).map((d) => ({
        label: d.value == null ? '-' : `${d.value}초`,
        count: d.count,
      })),
    [selectedRows],
  );

  const distAbandon = useMemo(
    () =>
      calcDist(selectedRows.map((r) => r.abandonAcktime)).map((d) => ({
        label: d.value == null ? '-' : `${d.value}초`,
        count: d.count,
      })),
    [selectedRows],
  );

  const distFirstGroup = useMemo(() => {
    const opts = new Map(groupOptions.map((g) => [g.id, g.name]));
    return calcDist(selectedRows.map((r) => r.firstGroupId)).map((d) => ({
      label: d.value == null || d.value === 0 ? '없음' : (opts.get(d.value) ?? String(d.value)),
      count: d.count,
    }));
  }, [selectedRows, groupOptions]);

  // ─── toggle field check ───────────────────────────────────────────────────
  const toggleField = useCallback((key: BulkFieldKey) => {
    setCheckedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isChecked = (key: BulkFieldKey) => checkedFields.has(key);
  const isDisabled = (key: BulkFieldKey) => isMixedTenant && REFERENCE_FIELD_KEYS.has(key);

  // ─── mutation ────────────────────────────────────────────────────────────
  const { mutate: bulkUpdate, isPending } = useBulkUpdateCtiQueues({
    mutationOptions: {
      onSuccess: (result) => {
        setBulkResult(result);
        setResultVisible(true);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '일괄 설정 실패';
        toast.error(msg);
      },
    },
  });

  // ─── 적용 핸들러 ──────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (checkedFields.size === 0) {
      toast.warning('변경할 데이터가 존재하지 않습니다');
      return;
    }

    const values = form.getFieldsValue();
    const ctiqIds = selectedRows.map((r) => r.ctiqId);

    // field mask → BE fields 배열 변환
    const fields: string[] = [];
    const body: Partial<CtiQueueBulkUpdateRequest> = {};

    // 미디어 BulkKey → mediaType 역방향 맵
    const bulkKeyToMediaType = new Map<BulkFieldKey, number>(Object.entries(MEDIA_BULK_KEY_MAP).map(([mt, v]) => [v.bulkKey, Number(mt)]));

    for (const key of checkedFields) {
      if (isDisabled(key)) continue; // 테넌트 혼합 시 참조형 스킵

      // 동적 스킬 키 처리
      if (ALL_SKILL_BULK_KEYS.has(key)) {
        const mediaType = bulkKeyToMediaType.get(key);
        if (mediaType != null) {
          const mk = MEDIA_BULK_KEY_MAP[mediaType];
          fields.push(mk.idField, mk.levelField);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (body as any)[mk.idField] = values[mk.idField] ?? null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (body as any)[mk.levelField] = values[mk.levelField] ?? 1;
        }
        continue;
      }

      switch (key) {
        case 'maxWaittimeYn':
          fields.push('maxWaittimeYn', 'maxWaittime');
          body.maxWaittimeYn = values.maxWaittimeYn ?? 0;
          body.maxWaittime = values.maxWaittimeYn === 1 ? (values.maxWaittime ?? 120) : 0;
          break;
        case 'collectYn':
          fields.push('collectYn', 'collectTimeout');
          body.collectYn = values.collectYn ?? 0;
          body.collectTimeout = values.collectYn === 1 ? (values.collectTimeout ?? 10) : 0;
          break;
        default:
          fields.push(key as string);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (body as any)[key] = values[key] ?? null;
      }
    }

    // 예약 적용
    let applyDatetime: string | null = null;
    if (applyType === 1 && applyDate) {
      const d = applyDate.format('YYYYMMDD');
      const h = String(applyHour).padStart(2, '0');
      const m = String(applyMinute).padStart(2, '0');
      applyDatetime = `${d}${h}${m}`;
    }

    Modal.confirm({
      title: '일괄 설정 적용',
      content: `${ctiqIds.length}건의 큐에 ${fields.length}개 항목을 변경합니다.`,
      okText: '확인',
      cancelText: '취소',
      onOk: () => {
        bulkUpdate({
          ctiqIds,
          fields,
          ...body,
          applyType,
          applyDatetime,
        } as CtiQueueBulkUpdateRequest);
      },
    });
  }, [checkedFields, form, selectedRows, isDisabled, applyType, applyDate, applyHour, applyMinute, bulkUpdate]);

  // ─── 결과 모달 닫기 ──────────────────────────────────────────────────────
  const handleResultClose = useCallback(() => {
    setResultVisible(false);
    setBulkResult(null);
    onClose();
  }, [onClose]);

  // ─── 결과 테이블 컬럼 ────────────────────────────────────────────────────
  const resultColumns: ColumnsType<CtiQueueBulkItemResult> = [
    { title: 'CTIQ ID', dataIndex: 'ctiqId', width: 90 },
    {
      title: '사유',
      dataIndex: 'message',
      ellipsis: true,
      render: (v: string | null) => <span className="text-red-500 text-xs">{v ?? '알 수 없는 오류'}</span>,
    },
  ];

  // ─── 스킬셋 Select 옵션 ──────────────────────────────────────────────────
  const skillSelectOptions = useMemo(() => [{ value: null, label: '(미사용)' }, ...skillsetOptions.map((s) => ({ value: s.id, label: s.name }))], [skillsetOptions]);

  const groupSelectOptions = useMemo(() => [{ value: null, label: '없음' }, ...groupOptions.map((g) => ({ value: g.id, label: g.name }))], [groupOptions]);

  // ─── 섹션 렌더 헬퍼 ──────────────────────────────────────────────────────
  const renderSection = (title: string, children: React.ReactNode, disabled = false) => (
    <div className={`border border-gray-200 rounded ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {disabled && <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">항목 미선택 또는 테넌트 혼합</span>}
      </div>
      {!disabled && <div className="p-3 flex flex-col gap-2.5">{children}</div>}
    </div>
  );

  const renderFieldRow = (label: string, children: React.ReactNode, distItems?: { label: string; count: number }[]) => (
    <div className="flex items-center gap-3">
      <span className="w-[130px] flex-shrink-0 text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
        {distItems && <DistBadge items={distItems} />}
      </div>
    </div>
  );

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  const hasAnySkillChecked = useMemo(
    () =>
      activeMediaItems.some(({ mediaType }) => {
        const mk = MEDIA_BULK_KEY_MAP[mediaType];
        return mk ? isChecked(mk.bulkKey) : false;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMediaItems, checkedFields],
  );
  const hasAnyRoutingChecked = isChecked('routingType') || isChecked('routingPriority') || isChecked('firstGroupId') || isChecked('accessCodeProfileId');
  const hasAnyPolicyChecked =
    isChecked('maxWaittimeYn') ||
    isChecked('serviceLevelTime') ||
    isChecked('abandonAcktime') ||
    isChecked('collectYn') ||
    isChecked('overflowQid') ||
    isChecked('serviceLevelTargetYn') ||
    isChecked('activateYn') ||
    isChecked('blockYn') ||
    isChecked('reconnPriorityYn') ||
    isChecked('forceTransYn');

  return (
    <>
      {/* ─── 일괄 설정 모달 ─────────────────────────────────────────── */}
      <Modal
        open={open && !resultVisible}
        title={
          <span>
            일괄 설정 <span className="text-sm font-normal text-gray-500 ml-1">{selectedRows.length}개 큐에 적용</span>
          </span>
        }
        width={900}
        onCancel={onClose}
        destroyOnClose
        footer={
          <div className="flex items-center gap-3">
            {/* 적용방식 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">적용:</span>
              <Radio.Group value={applyType} onChange={(e) => setApplyType(e.target.value)} size="small">
                <Radio value={0}>즉시</Radio>
                <Radio value={1}>예약</Radio>
              </Radio.Group>
              {applyType === 1 && (
                <span className="flex items-center gap-1.5">
                  <DatePicker
                    size="small"
                    style={{ width: 130 }}
                    value={applyDate}
                    onChange={(d) => setApplyDate(d)}
                    disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
                    placeholder="날짜 선택"
                  />
                  <Select
                    size="small"
                    style={{ width: 68 }}
                    value={applyHour}
                    onChange={(v) => setApplyHour(v)}
                    options={Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }))}
                  />
                  <span className="text-xs text-gray-500">:</span>
                  <Select
                    size="small"
                    style={{ width: 68 }}
                    value={applyMinute}
                    onChange={(v) => setApplyMinute(v as 0 | 30)}
                    options={[
                      { value: 0, label: '00' },
                      { value: 30, label: '30' },
                    ]}
                  />
                </span>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button onClick={onClose}>취소</Button>
              <Button type="primary" loading={isPending} onClick={handleApply}>
                적용 ({selectedRows.length})
              </Button>
            </div>
          </div>
        }
        styles={{ body: { padding: 0, height: 540, display: 'flex', overflow: 'hidden' } }}
      >
        {/* ── 좌: 필드 체크 목록 ── */}
        <div className="flex flex-col border-r border-gray-200 overflow-y-auto" style={{ width: 250, flexShrink: 0 }}>
          {[skillFieldGroup, ...STATIC_BULK_FIELD_GROUPS].map((group) => (
            <div key={group.groupKey}>
              <div className="px-3.5 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{group.label}</div>
              {group.fields.map((f) => {
                const disabled = isDisabled(f.key);
                return (
                  <div
                    key={f.key}
                    className={`flex items-center gap-2 px-3.5 py-1.5 cursor-pointer ${
                      isChecked(f.key) ? 'bg-[rgba(64,81,137,0.08)]' : 'hover:bg-gray-50'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={() => !disabled && toggleField(f.key)}
                  >
                    <Checkbox checked={isChecked(f.key)} disabled={disabled} onChange={() => !disabled && toggleField(f.key)} onClick={(e) => e.stopPropagation()} />
                    <span className={`text-xs ${isChecked(f.key) ? 'text-[#405189] font-semibold' : 'text-gray-700'}`}>{f.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── 우: 값 입력 + 분포 ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-3">
          <Form form={form} layout="inline" size="small">
            {/* 스킬 섹션 (동적 미디어 기반) */}
            {renderSection(
              '스킬',
              <>
                {activeMediaItems.map(({ mediaType, label }) => {
                  const mk = MEDIA_BULK_KEY_MAP[mediaType];
                  if (!mk) return null;
                  if (!isChecked(mk.bulkKey)) return null;
                  const dist = skillDistMap.get(mediaType);
                  const skillLabel = label.replace(' 기본 SKILL', ' 스킬셋');
                  const levelLabel = label.replace(' 기본 SKILL', ' 레벨');
                  return (
                    <React.Fragment key={mediaType}>
                      {renderFieldRow(
                        skillLabel,
                        <Form.Item name={mk.idField} style={{ marginBottom: 0 }}>
                          <Select style={{ width: 200 }} options={skillSelectOptions} placeholder="선택" allowClear />
                        </Form.Item>,
                        dist?.skillDist,
                      )}
                      {renderFieldRow(
                        levelLabel,
                        <Form.Item name={mk.levelField} style={{ marginBottom: 0 }} initialValue={1}>
                          <InputNumber min={0} style={{ width: 80 }} />
                        </Form.Item>,
                        dist?.levelDist,
                      )}
                    </React.Fragment>
                  );
                })}
                {!hasAnySkillChecked && <span className="text-xs text-gray-400">좌측에서 스킬 항목을 선택하세요</span>}
              </>,
              !hasAnySkillChecked,
            )}

            {/* 라우팅 섹션 */}
            {renderSection(
              '라우팅',
              <>
                {isChecked('firstGroupId') &&
                  renderFieldRow(
                    '기본 라우팅그룹',
                    <Form.Item name="firstGroupId" style={{ marginBottom: 0 }}>
                      <Select style={{ width: 200 }} options={groupSelectOptions} placeholder="선택" allowClear />
                    </Form.Item>,
                    distFirstGroup,
                  )}
                {isChecked('routingType') &&
                  renderFieldRow(
                    '라우팅 방식',
                    <Form.Item name="routingType" style={{ marginBottom: 0 }}>
                      <Select
                        style={{ width: 220 }}
                        options={[
                          { value: 1, label: '최장대기(직전대기시간)' },
                          { value: 2, label: '최소콜수(전체응대콜수)' },
                          { value: 3, label: '최소시간(전체응대시간)' },
                          { value: 4, label: '균등분배(Round-Robin)' },
                          { value: 5, label: '최장대기(누적대기시간)' },
                          { value: 6, label: '최소콜수(큐별응대콜수)' },
                          { value: 7, label: '최소시간(큐별응대시간)' },
                        ]}
                        placeholder="선택"
                      />
                    </Form.Item>,
                    distRoutingType,
                  )}
                {isChecked('routingPriority') &&
                  renderFieldRow(
                    '라우팅 우선순위',
                    <Form.Item name="routingPriority" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} max={99} style={{ width: 80 }} />
                    </Form.Item>,
                  )}
                {!hasAnyRoutingChecked && <span className="text-xs text-gray-400">좌측에서 라우팅 항목을 선택하세요</span>}
              </>,
              !hasAnyRoutingChecked,
            )}

            {/* 큐 정책 섹션 */}
            {renderSection(
              '큐 정책',
              <>
                {isChecked('maxWaittimeYn') && (
                  <>
                    {renderFieldRow(
                      '최대대기 사용',
                      <Form.Item name="maxWaittimeYn" style={{ marginBottom: 0 }} initialValue={1}>
                        <Radio.Group>
                          <Radio value={1}>사용</Radio>
                          <Radio value={0}>미사용</Radio>
                        </Radio.Group>
                      </Form.Item>,
                      distMaxWaittimeYn,
                    )}
                    {renderFieldRow(
                      '최대대기(초)',
                      <Form.Item name="maxWaittime" style={{ marginBottom: 0 }} initialValue={120}>
                        <InputNumber min={0} max={9999} style={{ width: 90 }} addonAfter="초" />
                      </Form.Item>,
                      distMaxWaittime,
                    )}
                  </>
                )}
                {isChecked('collectYn') && (
                  <>
                    {renderFieldRow(
                      '호회수 T/O 사용',
                      <Form.Item name="collectYn" style={{ marginBottom: 0 }} initialValue={1}>
                        <Radio.Group>
                          <Radio value={1}>사용</Radio>
                          <Radio value={0}>미사용</Radio>
                        </Radio.Group>
                      </Form.Item>,
                    )}
                    {renderFieldRow(
                      '호회수 T/O(초)',
                      <Form.Item name="collectTimeout" style={{ marginBottom: 0 }} initialValue={10}>
                        <InputNumber min={0} max={9999} style={{ width: 90 }} addonAfter="초" />
                      </Form.Item>,
                    )}
                  </>
                )}
                {isChecked('serviceLevelTime') &&
                  renderFieldRow(
                    '서비스 레벨(초)',
                    <Form.Item name="serviceLevelTime" style={{ marginBottom: 0 }} initialValue={20}>
                      <InputNumber min={0} max={9999} style={{ width: 90 }} addonAfter="초" />
                    </Form.Item>,
                    distServiceLevel,
                  )}
                {isChecked('abandonAcktime') &&
                  renderFieldRow(
                    '큐포기 기준(초)',
                    <Form.Item name="abandonAcktime" style={{ marginBottom: 0 }} initialValue={5}>
                      <InputNumber min={0} max={9999} style={{ width: 90 }} addonAfter="초" />
                    </Form.Item>,
                    distAbandon,
                  )}
                {isChecked('activateYn') &&
                  renderFieldRow(
                    '활성화',
                    <Form.Item name="activateYn" style={{ marginBottom: 0 }} initialValue={1}>
                      <Radio.Group>
                        <Radio value={1}>ON</Radio>
                        <Radio value={0}>OFF</Radio>
                      </Radio.Group>
                    </Form.Item>,
                  )}
                {isChecked('blockYn') &&
                  renderFieldRow(
                    '블록',
                    <Form.Item name="blockYn" style={{ marginBottom: 0 }} initialValue={0}>
                      <Radio.Group>
                        <Radio value={1}>설정</Radio>
                        <Radio value={0}>해제</Radio>
                      </Radio.Group>
                    </Form.Item>,
                  )}
                {isChecked('reconnPriorityYn') &&
                  renderFieldRow(
                    '재진입 우선',
                    <Form.Item name="reconnPriorityYn" style={{ marginBottom: 0 }} initialValue={0}>
                      <Radio.Group>
                        <Radio value={1}>사용</Radio>
                        <Radio value={0}>미사용</Radio>
                      </Radio.Group>
                    </Form.Item>,
                  )}
                {isChecked('forceTransYn') &&
                  renderFieldRow(
                    '강제 호전환',
                    <Form.Item name="forceTransYn" style={{ marginBottom: 0 }} initialValue={0}>
                      <Radio.Group>
                        <Radio value={1}>사용</Radio>
                        <Radio value={0}>미사용</Radio>
                      </Radio.Group>
                    </Form.Item>,
                  )}
                {!hasAnyPolicyChecked && <span className="text-xs text-gray-400">좌측에서 큐 정책 항목을 선택하세요</span>}
              </>,
              !hasAnyPolicyChecked,
            )}
          </Form>

          {/* 테넌트 혼합 경고 */}
          {isMixedTenant && (
            <div className="mt-1 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
              <span>⚠</span>
              <span>테넌트가 다른 큐가 포함되어 있습니다. 멘트·스킬셋·접근코드 프로파일 항목은 변경할 수 없습니다.</span>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── 결과 모달 (207 부분 성공) ────────────────────────────── */}
      <Modal
        open={resultVisible}
        title="일괄 설정 결과"
        width={620}
        onCancel={handleResultClose}
        footer={
          <Button type="primary" onClick={handleResultClose}>
            확인
          </Button>
        }
        destroyOnClose
      >
        {bulkResult && (
          <>
            <div className="flex gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded mb-3">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-green-600">{bulkResult.successCount}</span>
                <span className="text-xs text-gray-500">성공</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-700">{bulkResult.totalCount}</span>
                <span className="text-xs text-gray-500">전체</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-red-500">{bulkResult.failures.length}</span>
                <span className="text-xs text-gray-500">실패</span>
              </div>
            </div>
            {bulkResult.failures.length > 0 && (
              <Table<CtiQueueBulkItemResult>
                size="small"
                dataSource={bulkResult.failures.map((item) => ({ ...item, key: item.ctiqId }))}
                columns={resultColumns}
                pagination={false}
                scroll={{ y: 260 }}
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
}
