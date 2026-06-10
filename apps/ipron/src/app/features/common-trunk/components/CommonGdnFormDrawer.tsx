/**
 * 공용 그룹DN (GDN_TYPE=18) 등록/수정 드로어.
 *
 * 탭 ① 기본정보 — 번호/이름/DR노드/Global/대기/블럭/접근코드 프로파일(갭2)/라우팅기준(갭3)
 * 탭 ② 초기구성 — 멘트 6종(갭1) + 블럭여부→closeType 연동(갭1) + 라우팅 DNIS 3종(갭1)
 *
 * SWAT IPR20S3030 poPopup01 정합:
 *  - DR노드 지정 시 → Global DN 자동 강제 (doDrNode_OnSelect)
 *  - 수정 시 nodeId / gdnNo 불변
 *  - 갭7: GDN 이름 중복 체크 (등록/수정 모두)
 *  - 갭11: 수정 시 DR노드 변경 + 기존 멤버 존재 → 경고 차단
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Tabs } from 'antd';
import { toast } from '@/shared-util';
import { commonTrunkApi } from '../api/commonTrunkApi';
import { useCreateCommonGdn, useUpdateCommonGdn } from '../hooks/useCommonTrunkQueries';
import type { CommonGdnCreateRequest, CommonGdnResponse, CommonGdnUpdateRequest } from '../types';

interface NodeOption {
  value: number;
  label: string;
}

interface CommonGdnFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  detail?: CommonGdnResponse | null;
  /** 현재 선택된 노드 (등록 시 기본값) */
  nodeId: number | null;
  nodeName?: string | null;
  /** DR(백업) 노드 후보 옵션 */
  nodeOptions?: NodeOption[];
  onClose: () => void;
  onSaved: () => void;
}

// CALL_CLOSE_TYPE 코드 — SWAT 정합
const CALL_CLOSE_TYPE_OPTIONS = [
  { value: 0, label: '미지정' },
  { value: 1, label: '종료' },
  { value: 2, label: '대기' },
  { value: 3, label: '전환' },
];

// ACD_ROUTING_KIND 코드 — SWAT 정합
const ACD_ROUTING_KIND_OPTIONS = [
  { value: 1, label: '우선순위' },
  { value: 2, label: '순차' },
  { value: 3, label: '랜덤' },
  { value: 4, label: '직접' },
];

interface FormValues {
  gdnNo?: string;
  gdnName?: string;
  backUpNodeId?: number | null;
  globalDnYn?: number;
  maxWaitcnt?: number;
  maxWaittime?: number;
  blockYn?: number;
  closeType?: number | null;
  routingKind?: number | null;
  blockRoutingDnis?: string;
  errorRoutingDnis?: string;
  busyRoutingDnis?: string;
  initMent?: number | null;
  waitMent?: number | null;
  connMent?: number | null;
  coConnMent?: number | null;
  blockMent?: number | null;
  closeMent?: number | null;
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
}

export default function CommonGdnFormDrawer({ open, mode, detail, nodeId, nodeName: _nodeName, nodeOptions = [], onClose, onSaved }: CommonGdnFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = mode === 'edit';
  const [mentOptions, setMentOptions] = useState<{ value: number; label: string }[]>([]);
  const prevBackUpNodeId = useRef<number | null>(null);

  const initial: FormValues = useMemo(() => {
    if (isEdit && detail) {
      return {
        gdnNo: detail.gdnNo,
        gdnName: detail.gdnName,
        backUpNodeId: detail.backUpNodeId ?? 0,
        globalDnYn: detail.globalDnYn ?? 0,
        maxWaitcnt: detail.maxWaitcnt ?? 0,
        maxWaittime: detail.maxWaittime ?? 0,
        blockYn: detail.blockYn ?? 0,
        closeType: detail.closeType ?? null,
        routingKind: detail.routingKind ?? null,
        blockRoutingDnis: detail.blockRoutingDnis ?? '',
        errorRoutingDnis: detail.errorRoutingDnis ?? '',
        busyRoutingDnis: detail.busyRoutingDnis ?? '',
        initMent: detail.initMent ?? null,
        waitMent: detail.waitMent ?? null,
        connMent: detail.connMent ?? null,
        coConnMent: detail.coConnMent ?? null,
        blockMent: detail.blockMent ?? null,
        closeMent: detail.closeMent ?? null,
        accessCodeProfileId: detail.accessCodeProfileId ?? null,
        drAccessCodeProfileId: detail.drAccessCodeProfileId ?? null,
      };
    }
    return {
      globalDnYn: 0,
      backUpNodeId: 0,
      maxWaitcnt: 0,
      maxWaittime: 0,
      blockYn: 0,
    };
  }, [isEdit, detail]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial);
      prevBackUpNodeId.current = isEdit && detail ? (detail.backUpNodeId ?? 0) : 0;
      // 멘트 옵션 로드
      const effectiveNode = isEdit ? (detail?.nodeId ?? null) : nodeId;
      if (effectiveNode != null) {
        commonTrunkApi
          .getMentOptions({ nodeId: effectiveNode })
          .then((opts) => setMentOptions([{ value: 0, label: '(없음)' }, ...opts.map((o) => ({ value: o.id, label: o.name }))]))
          .catch(() => setMentOptions([{ value: 0, label: '(없음)' }]));
      }
    }
  }, [open, form, initial, isEdit, detail, nodeId]);

  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  const blockYn = Form.useWatch('blockYn', form);
  // DR노드 지정 시 Global DN 자동 강제 (doDrNode_OnSelect)
  const drForced = backUpNodeId != null && Number(backUpNodeId) !== 0;

  useEffect(() => {
    if (drForced) form.setFieldValue('globalDnYn', 1);
  }, [drForced, form]);

  // blockYn=0 이면 closeType disabled (SWAT 정합: 블럭여부 해제 시 종료방법 비활성)
  const closeTypeDisabled = blockYn !== 1;

  const effectiveNodeId = isEdit ? (detail?.nodeId ?? null) : nodeId;

  // DR 후보는 현재 노드 제외
  const drNodeOptions = useMemo(() => [{ value: 0, label: '없음' }, ...nodeOptions.filter((o) => o.value !== effectiveNodeId)], [nodeOptions, effectiveNodeId]);

  const { mutate: createGdn, isPending: isCreating } = useCreateCommonGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN 이 등록되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateGdn, isPending: isUpdating } = useUpdateCommonGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN 이 수정되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  const doSave = (values: FormValues) => {
    const buNode = values.backUpNodeId;
    const normalizedBuNode = buNode != null && Number(buNode) !== 0 ? Number(buNode) : null;

    if (isEdit && detail) {
      const body: CommonGdnUpdateRequest = {
        gdnName: values.gdnName!,
        backUpNodeId: normalizedBuNode,
        globalDnYn: drForced ? 1 : (values.globalDnYn ?? 0),
        maxWaitcnt: values.maxWaitcnt ?? 0,
        maxWaittime: values.maxWaittime ?? 0,
        blockYn: values.blockYn ?? 0,
        closeType: values.blockYn === 1 ? (values.closeType ?? null) : null,
        routingKind: values.routingKind ?? null,
        blockRoutingDnis: values.blockRoutingDnis ?? '',
        errorRoutingDnis: values.errorRoutingDnis ?? '',
        busyRoutingDnis: values.busyRoutingDnis ?? '',
        initMent: values.initMent ?? null,
        waitMent: values.waitMent ?? null,
        connMent: values.connMent ?? null,
        coConnMent: values.coConnMent ?? null,
        blockMent: values.blockMent ?? null,
        closeMent: values.closeMent ?? null,
        accessCodeProfileId: values.accessCodeProfileId ?? null,
        drAccessCodeProfileId: values.drAccessCodeProfileId ?? null,
      };
      updateGdn({ id: detail.gdnId, body });
    } else {
      const body: CommonGdnCreateRequest = {
        nodeId: Number(effectiveNodeId),
        tenantId: 0,
        gdnNo: values.gdnNo!,
        gdnName: values.gdnName!,
        backUpNodeId: normalizedBuNode,
        globalDnYn: drForced ? 1 : (values.globalDnYn ?? 0),
        maxWaitcnt: values.maxWaitcnt ?? 0,
        maxWaittime: values.maxWaittime ?? 0,
        blockYn: values.blockYn ?? 0,
        closeType: values.blockYn === 1 ? (values.closeType ?? null) : null,
        routingKind: values.routingKind ?? null,
        blockRoutingDnis: values.blockRoutingDnis ?? '',
        errorRoutingDnis: values.errorRoutingDnis ?? '',
        busyRoutingDnis: values.busyRoutingDnis ?? '',
        initMent: values.initMent ?? null,
        waitMent: values.waitMent ?? null,
        connMent: values.connMent ?? null,
        coConnMent: values.coConnMent ?? null,
        blockMent: values.blockMent ?? null,
        closeMent: values.closeMent ?? null,
        accessCodeProfileId: values.accessCodeProfileId ?? null,
        drAccessCodeProfileId: values.drAccessCodeProfileId ?? null,
      };
      createGdn(body);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!isEdit && effectiveNodeId == null) {
        toast.error('노드를 먼저 선택하세요');
        return;
      }

      // ─── 그룹DN 번호 중복 검증 (등록 시) ─────────────────────────────
      if (!isEdit && effectiveNodeId != null && values.gdnNo) {
        try {
          const dup = await commonTrunkApi.duplicateCheckGdn({ nodeId: Number(effectiveNodeId), gdnNo: values.gdnNo });
          if (dup) {
            toast.error('동일 노드에 이미 사용 중인 번호입니다 (DN/SIP 트렁크 포함)');
            return;
          }
        } catch {
          // duplicate-check 실패는 등록 진행 (BE 가 최종 차단)
        }
      }

      // ─── 갭7: GDN 이름 중복 검증 (등록/수정 모두) ─────────────────────
      if (effectiveNodeId != null && values.gdnName) {
        try {
          const nameDup = await commonTrunkApi.duplicateCheckGdnName({
            nodeId: Number(effectiveNodeId),
            gdnName: values.gdnName,
            excludeGdnId: isEdit && detail ? detail.gdnId : undefined,
          });
          if (nameDup) {
            toast.error('중복된 그룹DN명이 존재합니다');
            return;
          }
        } catch {
          // 실패 시 진행 (BE 최종 차단)
        }
      }

      // ─── 갭11: 수정 시 DR노드 변경 + 기존 멤버 존재 → 차단 ───────────
      if (isEdit && detail) {
        const newBackUp = values.backUpNodeId ?? 0;
        const origBackUp = prevBackUpNodeId.current ?? 0;
        const drChanged = Number(newBackUp) !== Number(origBackUp);
        // 기존 DR이 0이 아니었거나 새 DR이 0이 아닌 경우에만 체크
        const shouldCheck = drChanged && (origBackUp !== 0 || Number(newBackUp) !== 0);
        if (shouldCheck) {
          try {
            const hasMember = await commonTrunkApi.gdnMembersExist(detail.gdnId);
            if (hasMember) {
              toast.error('멤버가 등록되어 있습니다. 해제 후 DR 설정 하시기 바랍니다');
              return;
            }
          } catch {
            // 체크 실패 시 진행
          }
        }
      }

      doSave(values);
    } catch {
      // antd inline validation
    }
  };

  const basicTab = (
    <div className="grid grid-cols-2 gap-x-4">
      <Form.Item
        label="그룹DN 번호"
        name="gdnNo"
        rules={[
          { required: true, message: '필수' },
          { pattern: /^\d{3,8}$/, message: '3~8자리 숫자' },
        ]}
        extra={!isEdit ? '노드 내 유일 · Global DN이면 전 노드 유일' : undefined}
      >
        <Input disabled={isEdit} placeholder="3~8자리 숫자" maxLength={8} />
      </Form.Item>
      <Form.Item label="그룹DN 이름" name="gdnName" rules={[{ required: true, max: 100, message: '1~100자 필수' }]}>
        <Input maxLength={100} placeholder="1~100자" />
      </Form.Item>

      <Form.Item label="DR노드 (백업 노드)" name="backUpNodeId" extra="DR노드 지정 시 → Global DN 자동 강제">
        <Select options={drNodeOptions} />
      </Form.Item>
      <Form.Item label="Global DN 사용" name="globalDnYn" extra={drForced ? 'DR노드 지정으로 자동 강제됩니다' : undefined}>
        <Radio.Group disabled={drForced}>
          <Radio value={1}>사용</Radio>
          <Radio value={0}>미사용</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="최대수신대기호" name="maxWaitcnt">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Form.Item label="최대수신대기시간" name="maxWaittime">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>

      <Form.Item label="블록 여부" name="blockYn">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>

      {/* 갭3: 라우팅기준 (ACD_ROUTING_KIND) — disabled (SWAT 정합: GDN_TYPE=18 disabled) */}
      <Form.Item label="라우팅 기준" name="routingKind" extra="읽기전용 (시스템 설정)">
        <Select options={ACD_ROUTING_KIND_OPTIONS} disabled placeholder="(시스템 설정)" />
      </Form.Item>

      {/* 갭2: 접근코드 프로파일 */}
      <Form.Item label="접근코드 프로파일" name="accessCodeProfileId">
        <InputNumber style={{ width: '100%' }} min={0} placeholder="프로파일 ID (0=미지정)" />
      </Form.Item>
      <Form.Item label="DR 접근코드 프로파일" name="drAccessCodeProfileId" extra="DR노드 기준">
        <InputNumber style={{ width: '100%' }} min={0} placeholder="프로파일 ID (0=미지정)" disabled={!drForced} />
      </Form.Item>
    </div>
  );

  const configTab = (
    <div className="space-y-4">
      <section>
        <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">멘트 정보</h4>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="초기멘트" name="initMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
          <Form.Item label="대기멘트" name="waitMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
          <Form.Item label="기본 연결멘트" name="connMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
          <Form.Item label="국선호 연결멘트" name="coConnMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
          <Form.Item label="블럭멘트" name="blockMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
          <Form.Item label="종료멘트" name="closeMent">
            <Select options={mentOptions} placeholder="(없음)" allowClear />
          </Form.Item>
        </div>
      </section>

      <section>
        <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">블럭 및 대기 정보</h4>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="블럭 여부" name="blockYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          {/* 갭1: blockYn=1일 때만 활성 (SWAT 정합) */}
          <Form.Item label="종료방법" name="closeType" extra={closeTypeDisabled ? '블럭여부 설정 시 활성' : undefined}>
            <Select options={CALL_CLOSE_TYPE_OPTIONS} disabled={closeTypeDisabled} placeholder="블럭여부 설정 시 선택" allowClear />
          </Form.Item>
        </div>
      </section>

      <section>
        <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">우회 라우팅 정보</h4>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="장애시라우팅 DNIS" name="errorRoutingDnis" rules={[{ max: 24, message: '최대 24자' }]}>
            <Input maxLength={24} placeholder="숫자만" />
          </Form.Item>
          <Form.Item label="블럭시라우팅 DNIS" name="blockRoutingDnis" rules={[{ max: 24, message: '최대 24자' }]}>
            <Input maxLength={24} placeholder="숫자만" />
          </Form.Item>
          <Form.Item label="Busy시라우팅 DNIS" name="busyRoutingDnis" rules={[{ max: 24, message: '최대 24자' }]} className="col-span-2">
            <Input maxLength={24} placeholder="숫자만" />
          </Form.Item>
        </div>
      </section>
    </div>
  );

  return (
    <Drawer
      title={isEdit ? `그룹DN 수정 — ${detail?.gdnNo ?? ''}` : '그룹DN 등록'}
      width={560}
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isCreating || isUpdating}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={initial}>
        <Tabs
          items={[
            { key: 'basic', label: '기본정보', forceRender: true, children: basicTab },
            { key: 'config', label: '초기구성', forceRender: true, children: configTab },
          ]}
        />
      </Form>
    </Drawer>
  );
}
