/**
 * 공용 그룹DN (GDN_TYPE=18) 등록/수정 드로어.
 *
 * 노드 단위 고정(테넌트 차원 없음) — 공용 트렁크 화면 전용. tenantId=0 으로 등록.
 * SWAT IPR20S3030 poPopup01 정합:
 *  - DR노드 지정 시 → Global DN 자동 강제 (doDrNode_OnSelect)
 *  - 수정 시 nodeId / gdnNo 불변
 */
import { useEffect, useMemo } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select } from 'antd';
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

interface FormValues {
  gdnNo?: string;
  gdnName?: string;
  backUpNodeId?: number | null;
  globalDnYn?: number;
  maxWaitcnt?: number;
  maxWaittime?: number;
  blockYn?: number;
}

export default function CommonGdnFormDrawer({ open, mode, detail, nodeId, nodeName, nodeOptions = [], onClose, onSaved }: CommonGdnFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = mode === 'edit';

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
    }
  }, [open, form, initial]);

  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  // DR노드 지정 시 Global DN 자동 강제 (doDrNode_OnSelect)
  const drForced = backUpNodeId != null && Number(backUpNodeId) !== 0;

  useEffect(() => {
    if (drForced) form.setFieldValue('globalDnYn', 1);
  }, [drForced, form]);

  const effectiveNodeId = isEdit ? (detail?.nodeId ?? null) : nodeId;

  // DR 후보는 현재 노드 제외
  const drNodeOptions = useMemo(() => [{ value: 0, label: '없음' }, ...nodeOptions.filter((o) => o.value !== effectiveNodeId)], [nodeOptions, effectiveNodeId]);

  const { mutate: createGdn, isPending: isCreating } = useCreateCommonGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('공용 그룹DN 이 등록되었습니다');
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
        toast.success('공용 그룹DN 이 수정되었습니다');
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

      if (!isEdit && effectiveNodeId == null) {
        toast.error('노드를 먼저 선택하세요');
        return;
      }

      const buNode = values.backUpNodeId;
      const normalizedBuNode = buNode != null && Number(buNode) !== 0 ? Number(buNode) : null;

      // ─── 그룹DN 번호 중복 검증 (동일 노드 GDN+DN+SIP cross-check) ──
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

      if (isEdit && detail) {
        const body: CommonGdnUpdateRequest = {
          gdnName: values.gdnName!,
          backUpNodeId: normalizedBuNode,
          globalDnYn: drForced ? 1 : (values.globalDnYn ?? 0),
          maxWaitcnt: values.maxWaitcnt ?? 0,
          maxWaittime: values.maxWaittime ?? 0,
          blockYn: values.blockYn ?? 0,
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
        };
        createGdn(body);
      }
    } catch {
      // antd inline validation
    }
  };

  return (
    <Drawer
      title={isEdit ? `공용 그룹DN 수정 — ${detail?.gdnNo ?? ''}` : '공용 그룹DN 등록'}
      width={520}
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
        </div>
      </Form>
    </Drawer>
  );
}
