/**
 * ACD 그룹DN 등록/수정 드로어 (Phase 1).
 *
 * 탭 ① 기본정보 (소속 + 그룹DN + 분배·헌팅)
 * 탭 ② 라우팅 정책 (블럭/장애/Busy DNIS + 블럭/종료 옵션)
 * 탭 ③ 멤버 안내 (편집은 우측 패널 — Phase 1 안내만)
 *
 * 멘트 wizard 제거 (사용자 결정 — ACD 본질 X).
 * 헌팅 다이어그램 / 라우팅 3카드 / CTI큐 미리보기 는 Phase 2.
 */
import { useEffect, useMemo } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Tabs } from 'antd';
import { toast } from '@/shared-util';
import { useCreateAcdGdn, useUpdateAcdGdn } from '../hooks/useAcdGdnQueries';
import { ACD_TYPE_OPTIONS, type GdnCreateRequest, type GdnResponse, type GdnUpdateRequest, HUNTING_TYPE_OPTIONS, ROUTING_KIND_OPTIONS, YN_OPTIONS } from '../types';

interface AcdGdnFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  detail?: GdnResponse | null;
  defaultTenantId?: number | null;
  defaultNodeId?: number | null;
  tenantOptions?: { value: number; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  tenantId?: number;
  nodeId?: number;
  gdnNo?: string;
  gdnName?: string;

  backUpNodeId?: number | null;
  globalDnYn?: number;

  acdYn?: number;
  acdType?: number;
  routingKind?: number;
  skillsetId?: number | null;
  maxWaitcnt?: number;
  maxWaittime?: number;

  huntingYn?: number;
  huntingType?: number;
  huntWaitTime?: number;

  blockYn?: number;
  closeType?: number | null;
  blockRoutingDnis?: string;
  errorRoutingDnis?: string;
  busyRoutingDnis?: string;

  aniNo?: string;
  channelLimitCount?: number | null;
}

export default function AcdGdnFormDrawer({ open, mode, detail, defaultTenantId, defaultNodeId, tenantOptions = [], onClose, onSaved }: AcdGdnFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = mode === 'edit';

  const initial: FormValues = useMemo(() => {
    if (isEdit && detail) {
      return {
        tenantId: detail.tenantId ?? undefined,
        nodeId: detail.nodeId ?? undefined,
        gdnNo: detail.gdnNo,
        gdnName: detail.gdnName,
        backUpNodeId: detail.backUpNodeId,
        globalDnYn: detail.globalDnYn ?? 0,
        acdYn: detail.acdYn ?? 1,
        acdType: detail.acdType ?? 1,
        routingKind: detail.routingKind ?? 1,
        skillsetId: detail.skillsetId,
        maxWaitcnt: detail.maxWaitcnt ?? 0,
        maxWaittime: detail.maxWaittime ?? 0,
        huntingYn: detail.huntingYn ?? 0,
        huntingType: detail.huntingType ?? 1,
        huntWaitTime: detail.huntWaitTime ?? 10,
        blockYn: detail.blockYn ?? 0,
        closeType: detail.closeType,
        blockRoutingDnis: detail.blockRoutingDnis ?? '',
        errorRoutingDnis: detail.errorRoutingDnis ?? '',
        busyRoutingDnis: detail.busyRoutingDnis ?? '',
        aniNo: detail.aniNo ?? '',
        channelLimitCount: detail.channelLimitCount,
      };
    }
    return {
      tenantId: defaultTenantId ?? undefined,
      nodeId: defaultNodeId ?? 0,
      globalDnYn: 0,
      acdYn: 1,
      acdType: 1,
      routingKind: 1,
      maxWaitcnt: 50,
      maxWaittime: 60,
      huntingYn: 0,
      huntingType: 1,
      huntWaitTime: 10,
      blockYn: 0,
    };
  }, [isEdit, detail, defaultTenantId, defaultNodeId]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial);
    }
  }, [open, form, initial]);

  const routingKind = Form.useWatch('routingKind', form);
  const acdType = Form.useWatch('acdType', form);
  const isDirectRouting = routingKind === 4;

  const { mutate: createGdn, isPending: isCreating } = useCreateAcdGdn({
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

  const { mutate: updateGdn, isPending: isUpdating } = useUpdateAcdGdn({
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && detail) {
        const body: GdnUpdateRequest = {
          gdnName: values.gdnName!,
          backUpNodeId: values.backUpNodeId ?? null,
          globalDnYn: values.globalDnYn ?? 0,
          acdYn: values.acdYn!,
          acdType: values.acdType!,
          routingKind: values.routingKind!,
          skillsetId: values.skillsetId ?? null,
          maxWaitcnt: values.maxWaitcnt ?? 0,
          maxWaittime: values.maxWaittime ?? 0,
          huntingYn: values.huntingYn ?? 0,
          huntingType: values.huntingType ?? null,
          huntWaitTime: values.huntWaitTime ?? null,
          blockYn: values.blockYn ?? 0,
          closeType: values.closeType ?? null,
          blockRoutingDnis: values.blockRoutingDnis ?? '',
          errorRoutingDnis: values.errorRoutingDnis ?? '',
          busyRoutingDnis: values.busyRoutingDnis ?? '',
          aniNo: values.aniNo ?? '',
          channelLimitCount: values.channelLimitCount ?? null,
        };
        updateGdn({ id: detail.gdnId, body });
      } else {
        const body: GdnCreateRequest = {
          tenantId: values.tenantId!,
          nodeId: values.nodeId ?? 0,
          gdnNo: values.gdnNo!,
          gdnName: values.gdnName!,
          backUpNodeId: values.backUpNodeId ?? null,
          globalDnYn: values.globalDnYn ?? 0,
          acdYn: values.acdYn!,
          acdType: values.acdType!,
          routingKind: values.routingKind!,
          skillsetId: values.skillsetId ?? null,
          maxWaitcnt: values.maxWaitcnt ?? 0,
          maxWaittime: values.maxWaittime ?? 0,
          huntingYn: values.huntingYn ?? 0,
          huntingType: values.huntingType ?? null,
          huntWaitTime: values.huntWaitTime ?? null,
          blockYn: values.blockYn ?? 0,
          closeType: values.closeType ?? null,
          blockRoutingDnis: values.blockRoutingDnis,
          errorRoutingDnis: values.errorRoutingDnis,
          busyRoutingDnis: values.busyRoutingDnis,
          aniNo: values.aniNo,
          channelLimitCount: values.channelLimitCount,
        };
        createGdn(body);
      }
    } catch {
      // validation error — antd shows inline
    }
  };

  const tabItems = [
    {
      key: 'basic',
      label: '① 기본정보 (분배·헌팅)',
      children: (
        <div className="space-y-6">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">소속</h4>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트 필수' }]}>
                <Select options={tenantOptions} disabled={isEdit} placeholder="테넌트 선택" />
              </Form.Item>
              <Form.Item label="노드 ID" name="nodeId" rules={[{ required: true, message: '노드 필수' }]}>
                <InputNumber style={{ width: '100%' }} min={0} disabled={isEdit} />
              </Form.Item>
              <Form.Item label="DR 노드 ID" name="backUpNodeId">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="(없음)" />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">그룹DN</h4>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item label="그룹DN 번호" name="gdnNo" rules={[{ required: true, max: 16, message: '1~16자 필수' }]}>
                <Input disabled={isEdit} placeholder="3~8자 권장" maxLength={16} />
              </Form.Item>
              <Form.Item label="그룹DN 이름" name="gdnName" rules={[{ required: true, max: 200, message: '1~200자 필수' }]}>
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item label="발신 대표번호" name="aniNo">
                <Input maxLength={48} placeholder="ANI_NO" />
              </Form.Item>
              <Form.Item label="Global DN" name="globalDnYn">
                <Select options={YN_OPTIONS} />
              </Form.Item>
              <Form.Item label="채널 제한" name="channelLimitCount">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="(미지정)" />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">호분배 / ACD</h4>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item label="호분배 여부" name="acdYn" rules={[{ required: true }]}>
                <Select options={YN_OPTIONS} />
              </Form.Item>
              <Form.Item label="ACD 타입" name="acdType" rules={[{ required: true }]}>
                <Select options={ACD_TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item label="라우팅 스킬셋" name="skillsetId" tooltip="ACD 타입 = Skill 일 때만 사용">
                <InputNumber style={{ width: '100%' }} min={0} disabled={acdType !== 3} />
              </Form.Item>
              <Form.Item label="라우팅 기준" name="routingKind" rules={[{ required: true }]}>
                <Select options={ROUTING_KIND_OPTIONS} />
              </Form.Item>
              <Form.Item label="최대 대기호" name="maxWaitcnt" rules={[{ type: 'number', min: 0, max: 1000 }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={1000} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item label="최대 대기시간(s)" name="maxWaittime" rules={[{ type: 'number', min: 0, max: 3600 }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={3600} disabled={isDirectRouting} />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">
              헌팅
              {isDirectRouting && <span className="text-amber-600 font-normal ml-2">(라우팅기준=직접 — 자동 비활성)</span>}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item label="헌팅 여부" name="huntingYn">
                <Select options={YN_OPTIONS} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item label="헌팅 타입" name="huntingType">
                <Select options={HUNTING_TYPE_OPTIONS} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item label="헌팅 최대대기(s)" name="huntWaitTime" rules={[{ type: 'number', min: 0, max: 3600 }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={3600} disabled={isDirectRouting} />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'routing',
      label: '② 라우팅 정책',
      children: (
        <div className="space-y-6">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">라우팅 DNIS (각 상황별, 24자)</h4>
            <div className="grid grid-cols-1 gap-4">
              <Form.Item label="블럭 시 라우팅" name="blockRoutingDnis" tooltip="블럭여부=설정 + 종료방법 도달 시 → 블럭멘트 재생 후 이 DNIS 로 라우팅" rules={[{ max: 24 }]}>
                <Input maxLength={24} className="font-mono" placeholder="BLOCK_ROUTING_DNIS" />
              </Form.Item>
              <Form.Item label="장애 시 라우팅" name="errorRoutingDnis" tooltip="노드/스킬셋 장애, 멤버 DN 전체 미응답 시 → 즉시 이 DNIS 로 라우팅" rules={[{ max: 24 }]}>
                <Input maxLength={24} className="font-mono" placeholder="ERROR_ROUTING_DNIS" />
              </Form.Item>
              <Form.Item label="Busy 시 라우팅" name="busyRoutingDnis" tooltip="최대대기호 또는 최대대기시간 초과 시 → 종료멘트 재생 후 이 DNIS 로 라우팅" rules={[{ max: 24 }]}>
                <Input maxLength={24} className="font-mono" placeholder="BUSY_ROUTING_DNIS" />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-3 pb-1 border-b border-dashed border-gray-200">블럭 / 종료 옵션</h4>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item label="블록 여부" name="blockYn">
                <Select options={YN_OPTIONS} />
              </Form.Item>
              <Form.Item label="종료 방법" name="closeType">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="CLOSE_TYPE" />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'members',
      label: '③ DN 멤버 / CTI큐',
      children: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-[3px] border-blue-500 px-3 py-2 text-xs text-gray-700">
            <strong>Phase 1 안내</strong> — 멤버 우선순위 인라인 편집은 메인 화면 우측 멤버 패널에서 수행합니다. 등록 후 좌측 목록에서 행을 선택하면 우측 패널에 멤버 목록이
            나타납니다.
            <br />
            ACD 타입 = Skill 인 경우 멤버는 로그인 상담사로 자동 결정되므로 수동 관리 불가.
          </div>
          <div className="bg-amber-50 border-l-[3px] border-amber-500 px-3 py-2 text-xs text-gray-700">
            <strong>CTI 큐 통합 보기</strong> (개선①) 와 헌팅 다이어그램 / 라우팅 3카드 시각화는 Phase 2 에서 활성화됩니다.
          </div>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={isEdit ? `그룹DN 수정 — ${detail?.gdnNo ?? ''}` : '그룹DN 등록'}
      width={880}
      open={open}
      onClose={onClose}
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
        <Tabs items={tabItems} />
      </Form>
    </Drawer>
  );
}
