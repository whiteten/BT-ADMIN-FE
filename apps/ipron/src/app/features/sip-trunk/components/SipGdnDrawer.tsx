/**
 * SIP 트렁크 그룹DN (GDN_TYPE=18) 등록/수정 Drawer.
 *
 * SWAT IPR20S3030 poPopup01 정합:
 *  - 수정 시 그룹DN 번호 disabled (:531)
 *  - DR노드 지정 시 Global DN 사용 강제 + disabled (:302)
 *  - 초기구성 탭: blockYn=0(해제)이면 closeType disabled (SWAT :217-224)
 *  - 적용 버튼(수정 모드): 창 닫지 않고 저장 (SWAT btApply :1633)
 *
 * 등록은 헤더 + 버튼 / 수정은 그리드 행 더블클릭(onRowDoubleClicked) 으로 오픈.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select } from 'antd';
import { toast } from '@/shared-util';
import { useGetAcdGdnAccessCodeProfileOptions } from '../../acd-gdn/hooks/useAcdGdnQueries';
import { useCreateSipGdn, useUpdateSipGdn } from '../hooks/useSipTrunkQueries';
import { CLOSE_TYPE_OPTIONS, ROUTING_KIND_OPTIONS, type SipGdnResponse } from '../types';

export interface SipGdnDrawerRef {
  openCreate: () => void;
  openEdit: (data: SipGdnResponse) => void;
  close: () => void;
}

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

interface Props {
  /** 등록 컨텍스트 (선택된 노드/테넌트) */
  nodeId: number | null;
  tenantId: number | null;
  /** DR노드 후보 (현재 노드 제외) */
  drNodeOptions: NodeOption[];
  onSuccess?: () => void;
}

interface FormValues {
  gdnNo: string;
  gdnName: string;
  backUpNodeId: number;
  globalDnYn: number;
  maxWaitcnt: number;
  maxWaittime: number;
  blockYn: number;
  // 초기구성 탭 (SWAT IPR20S3030 GDN_TYPE=18)
  closeType: number | null;
  routingKind: number | null;
  blockRoutingDnis: string | null;
  errorRoutingDnis: string | null;
  busyRoutingDnis: string | null;
  // 접근코드 프로파일 (BE SipGdnCreateRequest:42-43 / SipGdnUpdateRequest 정합)
  accessCodeProfileId: number | null;
  drAccessCodeProfileId: number | null;
}

const DEFAULTS: Partial<FormValues> = {
  backUpNodeId: 0,
  globalDnYn: 0,
  maxWaitcnt: 0,
  maxWaittime: 0,
  blockYn: 0,
  closeType: null,
  routingKind: null,
  blockRoutingDnis: null,
  errorRoutingDnis: null,
  busyRoutingDnis: null,
  accessCodeProfileId: null,
  drAccessCodeProfileId: null,
};

const SipGdnDrawer = forwardRef<SipGdnDrawerRef, Props>(({ nodeId, tenantId, drNodeOptions, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<SipGdnResponse | null>(null);
  const isEdit = !!editData;
  const isApplyRef = useRef(false);

  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  const globalForced = backUpNodeId != null && backUpNodeId !== 0;

  // 접근코드 프로파일 콤보 옵션 (레퍼런스: AcdGdnFormDrawer:349-355)
  const { data: accessCodeProfileOptions = [] } = useGetAcdGdnAccessCodeProfileOptions(nodeId != null ? Number(nodeId) : null);
  const accessCodeProfileSelectOptions = useMemo(
    () => [{ value: 0, label: '(미사용)' }, ...accessCodeProfileOptions.map((o) => ({ value: o.id, label: o.name }))],
    [accessCodeProfileOptions],
  );

  // SWAT :217-224: blockYn=0이면 closeType disabled
  const blockYn = Form.useWatch('blockYn', form);
  const closeTypeDisabled = blockYn === 0 || blockYn == null;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  }, [form]);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setEditData(null);
      setVisible(true);
    },
    openEdit: (data: SipGdnResponse) => {
      setEditData(data);
      setVisible(true);
    },
    close: handleClose,
  }));

  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        gdnNo: editData.gdnNo,
        gdnName: editData.gdnName,
        backUpNodeId: editData.backUpNodeId ?? 0,
        globalDnYn: editData.globalDnYn ?? 0,
        maxWaitcnt: editData.maxWaitcnt ?? 0,
        maxWaittime: editData.maxWaittime ?? 0,
        blockYn: editData.blockYn ?? 0,
        closeType: editData.closeType ?? null,
        routingKind: editData.routingKind ?? null,
        blockRoutingDnis: editData.blockRoutingDnis ?? null,
        errorRoutingDnis: editData.errorRoutingDnis ?? null,
        busyRoutingDnis: editData.busyRoutingDnis ?? null,
        accessCodeProfileId: editData.accessCodeProfileId ?? null,
        drAccessCodeProfileId: editData.drAccessCodeProfileId ?? null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
    }
  }, [visible, editData, form]);

  // DR노드 지정 시 Global DN 사용 강제
  useEffect(() => {
    if (globalForced) form.setFieldValue('globalDnYn', 1);
  }, [globalForced, form]);

  // blockYn=0으로 변경 시 closeType 초기화 (SWAT :217-224 정합)
  useEffect(() => {
    if (closeTypeDisabled) {
      form.setFieldValue('closeType', null);
    }
  }, [closeTypeDisabled, form]);

  const buildBody = useCallback(
    (v: FormValues) => {
      const backUp = v.backUpNodeId && v.backUpNodeId !== 0 ? v.backUpNodeId : null;
      return {
        gdnName: v.gdnName,
        backUpNodeId: backUp,
        globalDnYn: v.globalDnYn,
        maxWaitcnt: v.maxWaitcnt,
        maxWaittime: v.maxWaittime,
        blockYn: v.blockYn,
        closeType: closeTypeDisabled ? null : (v.closeType ?? null),
        routingKind: v.routingKind ?? null,
        blockRoutingDnis: v.blockRoutingDnis || null,
        errorRoutingDnis: v.errorRoutingDnis || null,
        busyRoutingDnis: v.busyRoutingDnis || null,
        accessCodeProfileId: v.accessCodeProfileId ?? null,
        drAccessCodeProfileId: backUp != null ? (v.drAccessCodeProfileId ?? null) : null,
      };
    },
    [closeTypeDisabled],
  );

  const { mutate: createGdn, isPending: creating } = useCreateSipGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN이 등록되었습니다');
        handleClose();
        onSuccess?.();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패'),
    },
  });

  const { mutate: updateGdn, isPending: updating } = useUpdateSipGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN이 수정되었습니다');
        if (!isApplyRef.current) handleClose();
        onSuccess?.();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패'),
    },
  });

  const handleSubmit = useCallback(
    async (isApply = false) => {
      try {
        const v = await form.validateFields();
        if (isEdit && editData) {
          isApplyRef.current = isApply;
          updateGdn({ gdnId: editData.gdnId, body: buildBody(v) });
        } else {
          if (nodeId == null || tenantId == null) {
            toast.warning('노드와 테넌트를 먼저 선택하세요');
            return;
          }
          createGdn({
            nodeId,
            tenantId,
            gdnNo: v.gdnNo,
            ...buildBody(v),
          });
        }
      } catch {
        /* validation failed */
      }
    },
    [form, isEdit, editData, nodeId, tenantId, createGdn, updateGdn, buildBody],
  );

  return (
    <Drawer
      title={isEdit ? '그룹DN 수정' : '그룹DN 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      width={560}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          {/* F-4: 적용 버튼 — 수정 모드에서만, 창 닫지 않고 저장 (SWAT btApply) */}
          {isEdit && (
            <Button onClick={() => handleSubmit(true)} loading={updating}>
              적용
            </Button>
          )}
          <Button type="primary" onClick={() => handleSubmit(false)} loading={creating || updating}>
            {isEdit ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        {/* ── 기본정보 ── */}
        <Form.Item
          name="gdnNo"
          label="그룹DN 번호"
          rules={[
            { required: true, message: '그룹DN 번호는 필수입니다' },
            { pattern: /^[0-9]{3,8}$/, message: '3~8자리 숫자' },
          ]}
        >
          <Input placeholder="3~8자리 숫자" maxLength={8} disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="gdnName"
          label="그룹DN 이름"
          rules={[
            { required: true, message: '그룹DN 이름은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="1~100자" maxLength={100} />
        </Form.Item>

        <Form.Item name="backUpNodeId" label="DR노드 (백업 노드)" extra="DR노드 지정 시 Global DN 자동 강제">
          <Select options={[{ value: 0, label: '없음' }, ...drNodeOptions.map((n) => ({ value: n.nodeId, label: n.nodeName }))]} />
        </Form.Item>

        <Form.Item name="globalDnYn" label="Global DN" extra={globalForced ? 'DR노드 지정으로 자동 강제' : undefined}>
          <Radio.Group disabled={globalForced}>
            <Radio value={1}>사용</Radio>
            <Radio value={0}>미사용</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 접근코드 프로파일 콤보 (레퍼런스: AcdGdnFormDrawer:349-355, BE SipGdnCreateRequest:42-43 정합) */}
        <Form.Item name="accessCodeProfileId" label="접근코드 프로파일" tooltip="메인 노드 기준 접근코드 프로파일">
          <Select options={accessCodeProfileSelectOptions} placeholder="(미사용)" showSearch optionFilterProp="label" allowClear />
        </Form.Item>
        <Form.Item name="drAccessCodeProfileId" label="DR 접근코드 프로파일" tooltip="DR노드 기준 접근코드 프로파일">
          <Select options={accessCodeProfileSelectOptions} placeholder="(미사용)" showSearch optionFilterProp="label" allowClear disabled={!globalForced} />
        </Form.Item>

        {/* F-5: maxWaitcnt / maxWaittime required */}
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="maxWaitcnt" label="최대수신대기호" rules={[{ required: true, message: '필수 입력 항목입니다' }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="maxWaittime" label="최대수신대기시간" rules={[{ required: true, message: '필수 입력 항목입니다' }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item name="blockYn" label="블록 여부">
          <Radio.Group>
            <Radio value={1}>설정</Radio>
            <Radio value={0}>해제</Radio>
          </Radio.Group>
        </Form.Item>

        {/* ── F-1: 초기구성 탭 필드 (SWAT IPR20S3030 GDN_TYPE=18) ── */}
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
          <h4 className="text-xs text-gray-500 font-semibold mb-3">초기구성</h4>

          {/* blockYn=0이면 closeType disabled (SWAT :217-224) */}
          <Form.Item name="closeType" label="종료 방법">
            <Select disabled={closeTypeDisabled} allowClear placeholder="종료 방법 선택" options={[{ value: null, label: '(미지정)' }, ...CLOSE_TYPE_OPTIONS]} />
          </Form.Item>

          {/* routingKind: SWAT에서 disabled로 표시 (읽기 전용) */}
          <Form.Item name="routingKind" label="라우팅 기준" extra="시스템 설정값 (변경 불가)">
            <Select disabled allowClear placeholder="(미지정)" options={[{ value: null, label: '(미지정)' }, ...ROUTING_KIND_OPTIONS]} />
          </Form.Item>

          <Form.Item name="blockRoutingDnis" label="차단 우회 DNIS" rules={[{ max: 24, message: '최대 24자' }]}>
            <Input placeholder="최대 24자" maxLength={24} />
          </Form.Item>

          <Form.Item name="errorRoutingDnis" label="오류 우회 DNIS" rules={[{ max: 24, message: '최대 24자' }]}>
            <Input placeholder="최대 24자" maxLength={24} />
          </Form.Item>

          <Form.Item name="busyRoutingDnis" label="만석 우회 DNIS" rules={[{ max: 24, message: '최대 24자' }]}>
            <Input placeholder="최대 24자" maxLength={24} />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
});

SipGdnDrawer.displayName = 'SipGdnDrawer';
export default SipGdnDrawer;
