/**
 * DN 일괄 등록 Drawer (AS-IS IPR20S2020 insDnMasterList)
 *
 * - 노드/테넌트 고정 + DN 범위 + 공통 설정으로 N개 DN 일괄 생성
 * - 대량(500건 초과) 범위는 자동으로 청크 분할 + Progress 표시 (IDS TCP frame 4MB 제한 회피)
 * - 중간 실패 시 실패 청크 직전까지만 생성된 상태로 중단
 *
 * 파일명은 하위 호환을 위해 유지(DnBatchDialog.tsx) — 내부만 Drawer 구조로 전환.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Col, Drawer, Form, Input, Progress, Row, Select } from 'antd';
import { toast } from '@/shared-util';
import { dnApi } from '../api/dnApi';
import { DN_BATCH_INITIAL_VALUES, type DnBatchCreateRequest, type DnOptionItem, type DnResponse } from '../types';

/** 한 요청당 최대 DN 건수 — IDS TCP frame ~1MB 이하로 유지 (4MB 제한) */
const CHUNK_SIZE = 500;

interface DnBatchDialogProps {
  open: boolean;
  nodeId: number | null;
  tenantId: number | null;
  nodeName?: string | null;
  tenantName?: string | null;
  profileOptions: DnOptionItem[];
  cosOptions: DnOptionItem[];
  /** 테넌트 기본 COS ID — open 시 cosId 비어 있으면 자동 세팅 (AS-IS: 테넌트 생성 시 기본 COS 자동 생성). */
  defaultCosId?: number | null;
  onCancel: () => void;
  onSuccess: (created: DnResponse[]) => void;
}

interface ChunkProgress {
  total: number;
  completed: number;
  currentChunkIndex: number;
  totalChunks: number;
  startNo: string;
  endNo: string;
  failedAt?: { startNo: string; endNo: string; message: string };
}

function padLeft(n: number, len: number) {
  return String(n).padStart(len, '0');
}

function buildChunks(startNo: string, endNo: string, chunkSize: number) {
  const pad = startNo.length;
  const s = Number(startNo);
  const e = Number(endNo);
  const chunks: { startNo: string; endNo: string; count: number }[] = [];
  for (let cur = s; cur <= e; cur += chunkSize) {
    const chunkEnd = Math.min(cur + chunkSize - 1, e);
    chunks.push({
      startNo: padLeft(cur, pad),
      endNo: padLeft(chunkEnd, pad),
      count: chunkEnd - cur + 1,
    });
  }
  return chunks;
}

export default function DnBatchDialog({ open, nodeId, tenantId, nodeName, tenantName, profileOptions, cosOptions, defaultCosId, onCancel, onSuccess }: DnBatchDialogProps) {
  const [form] = Form.useForm();
  const startNoVal = Form.useWatch('dnNoStart', form);
  const endNoVal = Form.useWatch('dnNoEnd', form);

  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<ChunkProgress | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        ...DN_BATCH_INITIAL_VALUES,
        // 테넌트 기본 COS 자동 세팅 (AS-IS: cosId == tenantId 규칙). 사용자가 다른 COS 로 변경 가능.
        cosId: defaultCosId ?? undefined,
      });
      setProgress(null);
      cancelRef.current = false;
    }
  }, [open, form, defaultCosId]);

  const rangeValidator = (_: unknown) => {
    const start = form.getFieldValue('dnNoStart');
    const end = form.getFieldValue('dnNoEnd');
    if (!start || !end) return Promise.resolve();
    const startNum = Number(start);
    const endNum = Number(end);
    if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
      return Promise.reject(new Error('DN 범위는 숫자만 가능합니다'));
    }
    if (startNum > endNum) {
      return Promise.reject(new Error('종료 DN은 시작 DN보다 커야 합니다'));
    }
    if (String(startNum).length !== String(endNum).length && start.length !== end.length) {
      // 자릿수 동일성은 padding 로 해결. 엄격 체크는 생략.
    }
    return Promise.resolve();
  };

  const rangeCount = useMemo(() => {
    if (!startNoVal || !endNoVal) return 0;
    const s = Number(startNoVal);
    const e = Number(endNoVal);
    if (Number.isNaN(s) || Number.isNaN(e) || s > e) return 0;
    return e - s + 1;
  }, [startNoVal, endNoVal]);

  const chunkCount = rangeCount > 0 ? Math.ceil(rangeCount / CHUNK_SIZE) : 0;

  const handleClose = () => {
    if (pending) {
      cancelRef.current = true;
      return;
    }
    onCancel();
  };

  const handleSubmit = async () => {
    if (!nodeId || !tenantId || pending) return;
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (values.dnNoStart.length !== values.dnNoEnd.length) {
      toast.error('시작 번호와 끝 번호의 자릿수가 같아야 합니다');
      return;
    }

    const chunks = buildChunks(values.dnNoStart, values.dnNoEnd, CHUNK_SIZE);
    const total = rangeCount;

    setPending(true);
    cancelRef.current = false;
    const aggregated: DnResponse[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelRef.current) {
          toast.info(`사용자 요청으로 중단되었습니다. ${aggregated.length.toLocaleString()}건 등록됨.`);
          break;
        }
        const c = chunks[i];
        setProgress({
          total,
          completed: aggregated.length,
          currentChunkIndex: i,
          totalChunks: chunks.length,
          startNo: c.startNo,
          endNo: c.endNo,
        });
        const payload: DnBatchCreateRequest = {
          nodeId,
          tenantId,
          dnType: values.dnType,
          dnProfileId: values.dnProfileId,
          dnNoStart: c.startNo,
          dnNoEnd: c.endNo,
          cosId: values.cosId ?? null,
          extAuthtype: values.extAuthtype,
          md5Auth: values.md5Auth ? 1 : 0,
          md5Authpwd: values.md5Auth ? values.md5Authpwd : null,
          dnStatus: values.dnStatus ?? '0',
        };
        try {
          const created = await dnApi.batchCreate(payload);
          aggregated.push(...created);
        } catch (err: any) {
          const message = err?.response?.data?.message ?? err?.message ?? '일괄 등록 요청 실패';
          setProgress((p) => (p ? { ...p, failedAt: { startNo: c.startNo, endNo: c.endNo, message } } : p));
          toast.error(`청크 ${c.startNo}~${c.endNo} 실패 (${message}). 이전까지 ${aggregated.length.toLocaleString()}건 등록 완료. 실패 범위부터 재시도 가능.`);
          return;
        }
      }
      if (aggregated.length > 0) {
        toast.success(`${aggregated.length.toLocaleString()}건의 DN이 일괄 등록되었습니다.`);
        onSuccess(aggregated);
      }
    } finally {
      setPending(false);
      setProgress((p) => (p ? { ...p, completed: aggregated.length } : p));
    }
  };

  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 0;

  return (
    <Drawer
      title="DN 일괄 등록"
      open={open}
      onClose={handleClose}
      size={620}
      placement="right"
      mask={{ closable: !pending }}
      closable={{ placement: 'end', disabled: pending }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={pending && cancelRef.current}>
            {pending ? '중단' : '취소'}
          </Button>
          <Button type="primary" onClick={handleSubmit} disabled={!nodeId || !tenantId || pending} loading={pending}>
            등록
          </Button>
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        className="!mb-4"
        message={`${nodeName ?? '-'} / ${tenantName ?? '-'} 로 일괄 등록됩니다`}
        description={`범위 내 이미 존재하는 DN은 건너뛰고 등록 결과는 요약으로 표시됩니다. ${CHUNK_SIZE.toLocaleString()}건 초과 시 자동 청크 분할.`}
      />

      <Form form={form} layout="vertical" initialValues={DN_BATCH_INITIAL_VALUES}>
        {/* DN 유형 / IP 유형 / DN 상태 / MD5 인증은 화면에 노출하지 않고 기본값 사용
            (DN_BATCH_INITIAL_VALUES: dnType=11, extAuthtype=2, md5Auth=0, dnStatus=0) */}
        <Form.Item name="dnType" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="extAuthtype" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="dnStatus" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="md5Auth" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="dnNoStart"
              label="시작 DN"
              rules={[{ required: true, message: '시작 DN은 필수입니다' }, { pattern: /^[0-9]+$/, message: '숫자만 가능합니다' }, { validator: rangeValidator }]}
            >
              <Input placeholder="1000" maxLength={24} disabled={pending} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="dnNoEnd"
              label="종료 DN"
              rules={[{ required: true, message: '종료 DN은 필수입니다' }, { pattern: /^[0-9]+$/, message: '숫자만 가능합니다' }, { validator: rangeValidator }]}
            >
              <Input placeholder="1099" maxLength={24} disabled={pending} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="dnProfileId" label="내선 프로파일" required rules={[{ required: true, message: '내선 프로파일은 필수입니다' }]}>
              <Select placeholder="프로파일 선택" options={profileOptions.map((o) => ({ label: o.name, value: o.id }))} showSearch optionFilterProp="label" disabled={pending} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="cosId" label="COS" rules={[{ required: true, message: 'COS 는 필수입니다' }]}>
              <Select placeholder="COS 선택" options={cosOptions.map((o) => ({ label: o.name, value: o.id }))} showSearch optionFilterProp="label" disabled={pending} />
            </Form.Item>
          </Col>
        </Row>

        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          {rangeCount > 0 && (
            <div className="text-[#405189] font-medium">
              예상 생성 건수: {rangeCount.toLocaleString()}건{chunkCount > 1 && ` (${chunkCount}개 청크로 분할 호출)`}
            </div>
          )}
          {rangeCount > CHUNK_SIZE && (
            <div className="text-amber-600">※ {CHUNK_SIZE.toLocaleString()}건 초과 시 자동으로 여러 번 나누어 호출됩니다. 중간에 실패하면 실패 청크 이전까지만 생성됩니다.</div>
          )}
        </div>
      </Form>

      {progress && (
        <div className="mt-5 p-3 border border-gray-200 rounded-md bg-white">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>
              청크 {progress.currentChunkIndex + 1} / {progress.totalChunks}
              <span className="text-gray-400 ml-2">
                ({progress.startNo} ~ {progress.endNo})
              </span>
            </span>
            <span className="font-semibold text-gray-800">
              {progress.completed.toLocaleString()} / {progress.total.toLocaleString()}
            </span>
          </div>
          <Progress percent={percent} status={progress.failedAt ? 'exception' : pending ? 'active' : 'success'} showInfo />
          {progress.failedAt && (
            <div className="mt-2 text-xs text-red-600">
              실패 범위: {progress.failedAt.startNo} ~ {progress.failedAt.endNo}
              <br />
              원인: {progress.failedAt.message}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
