/**
 * IVR DN 그룹 등록/수정 Drawer.
 * forwardRef + useImperativeHandle 패턴.
 *
 * AS-IS IPR20S6012_DnGroup.jsp 분기 로직:
 *  - direction=Inbound(20): outchUsetype/inCount 비활성
 *  - direction=Outbound(10): outchUsetype 활성, inCount 비활성
 *  - direction=Both(30): outchUsetype 활성, inCount 활성
 *  - regKind=GROUP(30): groupDn 활성 (그 외 비활성)
 *
 * 시스템 선택 후 DN Count 입력 시 즉시 잔여 채널 검증 → 초과 시 저장 비활성.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import { Info } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateDnGroup, useGetSubDnQuota, useGetSystemUsage, useUpdateDnGroup } from '../hooks/useIvrDnGroupQueries';
import { DIRECTION_OPTIONS, type IrDnGroup, type IrDnGroupCreateRequest, OUTCH_OPTIONS, PROTOCOL_OPTIONS, REG_KIND_OPTIONS } from '../types';

export interface IvrDnGroupSheetRef {
  open: (data?: IrDnGroup, defaultNodeId?: number, defaultEndptId?: number) => void;
  close: () => void;
}

interface Props {
  /**
   * 노드 카드 슬라이더에서 선택된 노드. 신규 등록 시 시스템 드롭다운을 이 노드 기준으로 필터링.
   * 수정 시에는 editData.nodeId가 우선 사용된다.
   */
  selectedNodeId: number | null;
  nodes: { nodeId: number; nodeName: string }[];
  /**
   * 부모(국선) 후보 — 현재 노드 소속 IVR EndPoint 목록 (페이지에서 전달).
   */
  endpoints: { endptId: number; endptName: string; nodeId: number }[];
  /** 성공 콜백. 신규 등록 시 생성된 DN 그룹을 전달(새 카드 포커싱용), 수정 시 인자 없음. */
  onSuccess: (created?: IrDnGroup) => void;
}

const IvrDnGroupSheet = forwardRef<IvrDnGroupSheetRef, Props>(({ selectedNodeId, nodes, endpoints, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IrDnGroup | null>(null);
  const direction = Form.useWatch('direction', form);
  const regKind = Form.useWatch('regKind', form);
  const systemId = Form.useWatch('systemId', form);
  const dnCount = Form.useWatch('dnCount', form);
  const formNodeId = Form.useWatch('nodeId', form);

  const isEditMode = !!editData;
  const isInbound = direction === '20';
  const isBoth = direction === '30';
  const isRegGroup = regKind === '30';
  // outchUsetype: Inbound면 비활성, 나머지(Outbound/Both)는 활성
  const outchDisabled = isInbound;
  // inCount: Both에서만 활성
  const inCountDisabled = !isBoth;

  useImperativeHandle(ref, () => ({
    open: (data?: IrDnGroup, defaultNodeId?: number, defaultEndptId?: number) => {
      setEditData(data ?? null);
      setVisible(true);
      if (!data) {
        const nid = defaultNodeId ?? selectedNodeId ?? nodes[0]?.nodeId;
        setTimeout(() => {
          form.setFieldsValue({
            nodeId: nid,
            endptId: defaultEndptId,
          });
        }, 0);
      }
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  // ─── System usage (잔여 채널 안내용) ────────────────────────────────────
  const effectiveNodeId = formNodeId ?? editData?.nodeId ?? selectedNodeId ?? null;
  const { data: systemUsages = [] } = useGetSystemUsage({
    params: effectiveNodeId ? { nodeId: effectiveNodeId } : undefined,
    queryOptions: { enabled: !!effectiveNodeId && visible },
  });

  const selectedSystemUsage = useMemo(() => systemUsages.find((s) => s.systemId === systemId) ?? null, [systemUsages, systemId]);

  // 수정 모드: 자기 자신의 dnCount는 이미 used에 포함되어 있으므로 빼서 비교
  const ownUsed = isEditMode && editData ? editData.dnCount : 0;
  const availableForThis = selectedSystemUsage ? selectedSystemUsage.availableDnCount + ownUsed : null;
  const exceedsAvailable = availableForThis !== null && typeof dnCount === 'number' && dnCount > availableForThis;

  // ─── Sub DN 채널 합계 (수정 모드에서 DN Count 감소 시 차단) ────────────────
  const { data: subDnQuota } = useGetSubDnQuota({
    params: editData ? { id: editData.dnGroupId } : undefined,
    queryOptions: { enabled: !!editData && visible },
  });
  const subDnUsedSum = subDnQuota?.usedChannelCount ?? 0;
  const dnCountBelowSubDn = isEditMode && typeof dnCount === 'number' && subDnUsedSum > 0 && dnCount < subDnUsedSum;

  // ─── Edit mode: 초기값 세팅 ──────────────────────────────────────────────
  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        nodeId: editData.nodeId,
        endptId: editData.endptId,
        systemId: editData.systemId,
        dnGroupName: editData.dnGroupName,
        protocol: editData.protocol,
        direction: editData.direction,
        dnisNo: editData.dnisNo ?? '',
        groupDn: editData.groupDn ?? '',
        startDn: editData.startDn,
        dnCount: editData.dnCount,
        regKind: editData.regKind,
        outchUsetype: editData.outchUsetype ?? undefined,
        inCount: editData.inCount ?? 0,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // direction / regKind 변경 시에도 폼 값은 유지한다 (AS-IS와 동일 UX).
  // 비활성 필드의 값은 handleSubmit에서 조건에 맞게 정리되어 전송된다.

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: createDnGroup, isPending: isCreating } = useCreateDnGroup({
    mutationOptions: {
      onSuccess: (created) => {
        toast.success('DN 그룹이 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess(created as IrDnGroup | undefined);
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updateDnGroup, isPending: isUpdating } = useUpdateDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN 그룹이 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  // ─── Endpoint 옵션: 선택된 노드 소속만 노출 ─────────────────────────────
  const endpointOptions = useMemo(() => {
    const nid = effectiveNodeId;
    if (!nid) return [];
    return endpoints.filter((ep) => ep.nodeId === nid).map((ep) => ({ label: ep.endptName, value: ep.endptId }));
  }, [endpoints, effectiveNodeId]);

  // ─── System 옵션: 잔여 안내 포함 ─────────────────────────────────────────
  const systemOptions = useMemo(
    () =>
      systemUsages.map((s) => ({
        label: `${s.systemName} (잔여 ${s.availableDnCount}/${s.maxDnCount})`,
        value: s.systemId,
        disabled: !isEditMode && s.availableDnCount <= 0,
      })),
    [systemUsages, isEditMode],
  );

  const handleSubmit = useCallback(async () => {
    if (exceedsAvailable) {
      toast.error('시스템의 잔여 DN을 초과합니다.');
      return;
    }
    if (dnCountBelowSubDn) {
      toast.error(`DN Count는 이미 등록된 Sub DN 채널 합계(${subDnUsedSum}) 이상이어야 합니다.`);
      return;
    }
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; /* validation failed */
    }

    // OutType ACS(5) → 다른 값으로 변경 + Sub DN 보유 시 안내 (옵션 2: 데이터 유지, 변경 허용)
    const wasAcs = isEditMode && editData?.outchUsetype === '5';
    const isStillAcs = values.outchUsetype === '5' && values.direction !== '20';
    if (wasAcs && !isStillAcs && subDnUsedSum > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'OB 채널용도 변경',
          content:
            '이 DN 그룹에 등록된 Sub DN Group이 있습니다.\n' +
            'OB 채널용도를 ACS 외 값으로 변경하면 Sub DN은 더 이상 사용되지 않으나, ' +
            '데이터는 유지됩니다 (추후 다시 ACS로 변경하면 복원).\n\n진행하시겠습니까?',
          okText: '변경 진행',
          cancelText: '취소',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }

    const payload: IrDnGroupCreateRequest = {
      endptId: values.endptId as number,
      systemId: values.systemId as number,
      dnGroupName: values.dnGroupName as string,
      protocol: values.protocol as IrDnGroupCreateRequest['protocol'],
      direction: values.direction as IrDnGroupCreateRequest['direction'],
      dnisNo: (values.dnisNo as string) || undefined,
      groupDn: values.regKind === '30' ? (values.groupDn as string) || undefined : undefined,
      startDn: values.startDn as string,
      dnCount: values.dnCount as number,
      // startChannel/channelCount: 화면 비노출 — 백엔드에서 자동 설정 (channelCount=dnCount, startChannel=0)
      startChannel: undefined as unknown as number,
      channelCount: undefined as unknown as number,
      regKind: values.regKind as IrDnGroupCreateRequest['regKind'],
      outchUsetype: values.direction === '20' ? undefined : (values.outchUsetype as IrDnGroupCreateRequest['outchUsetype']),
      inCount: values.direction === '30' ? (values.inCount as number) : 0,
    };
    if (isEditMode && editData) {
      updateDnGroup({ id: editData.dnGroupId, data: payload });
    } else {
      createDnGroup(payload);
    }
  }, [exceedsAvailable, dnCountBelowSubDn, subDnUsedSum, form, isEditMode, editData, createDnGroup, updateDnGroup]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'DN 그룹 수정' : 'DN 그룹 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 640 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending} disabled={exceedsAvailable || dnCountBelowSubDn}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          protocol: '1',
          direction: '10',
          regKind: '10',
          outchUsetype: '1', // 기본: 상담원 연결 (AS-IS는 미설정이나, UX상 첫 옵션 노출)
          dnCount: 1,
          inCount: 0,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
              <Select options={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))} placeholder="노드 선택" disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="systemId" label="시스템" required rules={[{ required: true, message: '시스템은 필수입니다' }]}>
              <Select
                options={systemOptions}
                placeholder={effectiveNodeId ? '시스템 선택' : '노드 먼저 선택'}
                disabled={isEditMode || !effectiveNodeId}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* DN Name */}
        <Form.Item
          name="dnGroupName"
          label="DN Name"
          required
          rules={[
            { required: true, message: 'DN Name은 필수입니다' },
            { max: 64, message: '64자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="예: DG_Seoul_Out_01" maxLength={64} />
        </Form.Item>

        {/* 연동 EP — AS-IS와 동일하게 수정 시에도 변경 가능 */}
        <Form.Item name="endptId" label="연동 EP" required rules={[{ required: true, message: '연동 EP는 필수입니다' }]}>
          <Select options={endpointOptions} placeholder={effectiveNodeId ? '연동 EP 선택' : '노드 먼저 선택'} disabled={!effectiveNodeId} showSearch optionFilterProp="label" />
        </Form.Item>

        {/* 시스템 사용량 안내 — DN Count 위에 배치 */}
        {selectedSystemUsage && (
          <Alert
            type="info"
            showIcon
            icon={<Info className="size-4" />}
            className="mb-3"
            message={
              <span className="text-[12px]">
                <b>{selectedSystemUsage.systemName}</b> 현재 사용량{' '}
                <b>
                  {selectedSystemUsage.usedDnCount}/{selectedSystemUsage.maxDnCount}
                </b>{' '}
                (잔여 <b>{availableForThis ?? selectedSystemUsage.availableDnCount}</b>)
              </span>
            }
          />
        )}

        {/* 시작 DN + DN Count */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="startDn"
              label="시작 DN"
              required
              rules={[
                { required: true, message: '시작 DN은 필수입니다' },
                { max: 32, message: '32자 이내' },
                { pattern: /^[0-9]+$/, message: '숫자만 가능합니다' },
              ]}
            >
              <Input placeholder="예: 20000" maxLength={32} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="dnCount"
              label="DN Count"
              required
              rules={[{ required: true, type: 'number', min: 1, max: 100000, message: '1 이상' }]}
              validateStatus={exceedsAvailable || dnCountBelowSubDn ? 'error' : undefined}
              help={exceedsAvailable ? `시스템 잔여 ${availableForThis} 초과` : dnCountBelowSubDn ? `Sub DN 채널 합계(${subDnUsedSum}) 이상이어야 함` : undefined}
            >
              <InputNumber min={1} max={100000} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* 시작 CHANNEL / Channel Count: 화면 비노출 — 백엔드에서 자동 설정 (channelCount=dnCount) */}

        {/* DNIS NO */}
        <Form.Item
          name="dnisNo"
          label="DNIS NO"
          rules={[
            { max: 32, message: '32자 이내' },
            { pattern: /^[0-9*#]*$/, message: '숫자, *, # 만 가능합니다' },
          ]}
        >
          <Input placeholder="(선택)" maxLength={32} />
        </Form.Item>

        {/* REG 처리 + 그룹 Regist 번호 (한 행) */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="regKind" label="REG 처리" required>
              <Select options={REG_KIND_OPTIONS as unknown as { label: string; value: string }[]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="groupDn"
              label="그룹 Regist 번호"
              extra={!isRegGroup ? "REG 처리가 'Group Regist'일 때만 사용" : undefined}
              rules={
                isRegGroup
                  ? [
                      { required: true, message: '그룹 방식일 때 그룹 Regist 번호는 필수입니다' },
                      { max: 32, message: '32자 이내' },
                    ]
                  : [{ max: 32, message: '32자 이내' }]
              }
            >
              <Input placeholder={isRegGroup ? '그룹 Regist 번호 입력' : ''} maxLength={32} disabled={!isRegGroup} />
            </Form.Item>
          </Col>
        </Row>

        {/* 프로토콜 (단독) */}
        <Form.Item name="protocol" label="프로토콜" required>
          <Select options={PROTOCOL_OPTIONS as unknown as { label: string; value: string }[]} />
        </Form.Item>

        {/* Direction + OB 채널용도 (한 행) */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="direction" label="Direction" required>
              <Select options={DIRECTION_OPTIONS as unknown as { label: string; value: string }[]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="outchUsetype" label="OB 채널용도" extra={outchDisabled ? "Direction이 'Inbound'가 아닐 때만 사용" : undefined}>
              <Select options={OUTCH_OPTIONS as unknown as { label: string; value: string }[]} disabled={outchDisabled} />
            </Form.Item>
          </Col>
        </Row>

        {/* Inbound Count (단독) */}
        <Form.Item
          name="inCount"
          label="Inbound Count"
          extra={inCountDisabled ? "Direction이 'Both'일 때만 사용" : undefined}
          rules={[{ type: 'number', min: 0, max: 100000, message: '0 이상' }]}
        >
          <InputNumber min={0} max={100000} className="!w-full" disabled={inCountDisabled} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

IvrDnGroupSheet.displayName = 'IvrDnGroupSheet';
export default IvrDnGroupSheet;
