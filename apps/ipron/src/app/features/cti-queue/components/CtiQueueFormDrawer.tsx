/**
 * CTI 큐 등록/수정 드로어 (Phase 1 — 기본정보 탭).
 *
 * SWAT 5탭 (기본/멘트/라우팅/미디어별스킬/BSR) 중 Phase 1 에서는
 * 기본정보 + 라우팅/BSR 핵심 필드를 단일 폼으로 제공.
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Space } from 'antd';
import { toast } from '@/shared-util';
import { useCreateCtiQueue, useUpdateCtiQueue } from '../hooks/useCtiQueueQueries';
import type { CtiQueueResponse } from '../types';

type Mode = 'create' | 'edit';

export type CtiQueueDrawerState = { open: false } | { open: true; mode: Mode; row?: CtiQueueResponse };

interface Props {
  state: CtiQueueDrawerState;
  onClose: () => void;
}

export default function CtiQueueFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm();

  const { mutate: create, isPending: isCreating } = useCreateCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  const { mutate: update, isPending: isUpdating } = useUpdateCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });

  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      return;
    }
    if (state.mode === 'edit' && state.row) {
      const r = state.row;
      form.setFieldsValue({
        gdnId: r.gdnId,
        ctiqName: r.ctiqName,
        ctiqDesc: r.ctiqDesc,
        inoutKind: r.inoutKind ?? 0,
        sortSeq: r.sortSeq,
        activateYn: r.activateYn ?? 1,
        globalDnYn: r.globalDnYn ?? 0,
        backUpNodeId: r.backUpNodeId,
        maxWaittimeYn: r.maxWaittimeYn ?? 0,
        maxWaittime: r.maxWaittime ?? 120,
        collectYn: r.collectYn ?? 0,
        collectTimeout: r.collectTimeout ?? 10,
        serviceLevelTime: r.serviceLevelTime ?? 20,
        abandonAcktime: r.abandonAcktime ?? 0,
        serviceLevelTargetYn: r.serviceLevelTargetYn ?? 0,
        serviceLevelTargetValue: r.serviceLevelTargetValue ?? 90,
        overflowQid: r.overflowQid,
        overflowCnt: r.overflowCnt,
        firstGroupId: r.firstGroupId,
        routingPriority: r.routingPriority ?? 9,
        reconnPriorityYn: r.reconnPriorityYn ?? 1,
        forceTransYn: r.forceTransYn ?? 1,
        bsrYn: r.bsrYn ?? 0,
        bsrWeight: r.bsrWeight ?? 100,
      });
    } else {
      // create 기본값
      form.setFieldsValue({
        inoutKind: 0,
        activateYn: 1,
        globalDnYn: 0,
        maxWaittimeYn: 1,
        maxWaittime: 120,
        collectYn: 1,
        collectTimeout: 10,
        serviceLevelTime: 20,
        abandonAcktime: 0,
        serviceLevelTargetYn: 0,
        serviceLevelTargetValue: 90,
        routingPriority: 9,
        reconnPriorityYn: 1,
        forceTransYn: 1,
        bsrYn: 0,
        bsrWeight: 100,
      });
    }
  }, [state, form]);

  if (!state.open) return null;

  const { mode } = state;
  const submitting = isCreating || isUpdating;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'create') {
        create({
          gdnId: values.gdnId,
          ctiqName: values.ctiqName,
          ctiqDesc: values.ctiqDesc,
          inoutKind: values.inoutKind,
          sortSeq: values.sortSeq,
          activateYn: values.activateYn,
          globalDnYn: values.globalDnYn,
          backUpNodeId: values.backUpNodeId,
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
          firstGroupId: values.firstGroupId,
          routingPriority: values.routingPriority,
          reconnPriorityYn: values.reconnPriorityYn,
          forceTransYn: values.forceTransYn,
          bsrYn: values.bsrYn,
          bsrWeight: values.bsrWeight,
        });
      } else if (state.mode === 'edit' && state.row) {
        update({
          ctiqId: state.row.ctiqId,
          body: {
            ctiqName: values.ctiqName,
            ctiqDesc: values.ctiqDesc,
            inoutKind: values.inoutKind,
            sortSeq: values.sortSeq,
            activateYn: values.activateYn,
            globalDnYn: values.globalDnYn,
            backUpNodeId: values.backUpNodeId,
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
            firstGroupId: values.firstGroupId,
            routingPriority: values.routingPriority,
            reconnPriorityYn: values.reconnPriorityYn,
            forceTransYn: values.forceTransYn,
            bsrYn: values.bsrYn,
            bsrWeight: values.bsrWeight,
          },
        });
      }
    } catch {
      // form validation error: silent
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Drawer
      title={isEdit ? `CTI 큐 수정 (ID: ${state.row?.ctiqId})` : 'CTI 큐 등록'}
      width={680}
      open={state.open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            저장
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {/* ── 기본정보 ── */}
        <Form.Item label="그룹DN ID" name="gdnId" rules={[{ required: true, message: '그룹DN ID는 필수입니다' }]}>
          <InputNumber style={{ width: '100%' }} disabled={isEdit} placeholder="GDN ID" />
        </Form.Item>
        <Form.Item label="CTI큐 이름" name="ctiqName" rules={[{ required: true, message: 'CTI큐 이름은 필수입니다' }, { max: 200 }]}>
          <Input maxLength={200} placeholder="예: 일반상담큐_서울" />
        </Form.Item>
        <Form.Item label="CTI큐 설명" name="ctiqDesc" rules={[{ max: 512 }]}>
          <Input.TextArea rows={2} maxLength={512} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="IN/OUT 구분" name="inoutKind">
            <Radio.Group>
              <Radio value={0}>INBOUND</Radio>
              <Radio value={1}>OUTBOUND</Radio>
              <Radio value={2}>혼합</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="정렬순서" name="sortSeq">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="활성화" name="activateYn">
            <Radio.Group>
              <Radio value={1}>활성</Radio>
              <Radio value={0}>비활성</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="글로벌 여부" name="globalDnYn">
            <Radio.Group>
              <Radio value={1}>O (사용)</Radio>
              <Radio value={0}>X (사용안함)</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
        <Form.Item label="DR 노드 ID" name="backUpNodeId">
          <InputNumber style={{ width: '100%' }} placeholder="없으면 비워두세요" />
        </Form.Item>

        {/* ── 대기 / 서비스레벨 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="최대대기사용" name="maxWaittimeYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="최대대기시간 (초)" name="maxWaittime">
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="호회수타임아웃 사용" name="collectYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="호회수 타임아웃 (초)" name="collectTimeout">
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="서비스레벨 (초)" name="serviceLevelTime" rules={[{ required: true, message: '필수' }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="큐포기인정시간 (초)" name="abandonAcktime">
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item label="목표SL라우팅" name="serviceLevelTargetYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="목표 달성률 (%)" name="serviceLevelTargetValue">
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
        </div>

        {/* ── 호우회 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="호우회 대상번호" name="overflowQid" rules={[{ max: 48 }]}>
            <Input maxLength={48} placeholder="DN 번호" />
          </Form.Item>
          <Form.Item label="호우회 기준카운트" name="overflowCnt">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </div>

        {/* ── 라우팅 ── */}
        <Form.Item label="기본 라우팅그룹 ID" name="firstGroupId">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="분배우선순위 (1~9)" name="routingPriority">
            <InputNumber style={{ width: '100%' }} min={1} max={9} />
          </Form.Item>
          <Form.Item label="재진입우선순위보장" name="reconnPriorityYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="강제호전환" name="forceTransYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* ── BSR ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="BSR 사용" name="bsrYn">
            <Radio.Group>
              <Radio value={1}>설정</Radio>
              <Radio value={0}>해제</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="BSR 기본가중치 (0~1000)" name="bsrWeight">
            <InputNumber style={{ width: '100%' }} min={0} max={1000} />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
