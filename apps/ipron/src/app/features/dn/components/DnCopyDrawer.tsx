/**
 * DN 복사 생성 Drawer
 * AS-IS IPR20S2020_Copy.jsp 리뉴얼.
 *
 * - 원본 DN 1건을 템플릿으로 시작~끝 DN 번호 범위에 복제.
 * - 사전 조건: 원본이 MD5 미사용 + 동적 IP 여야 함.
 * - 시작/끝 자릿수 동일 + 시작 ≤ 끝.
 * - 대량 범위는 CHUNK_SIZE 단위로 순차 분할 호출 (IDS TCP 4MB 제한 회피).
 *   각 청크는 독립 @Transactional + 단일 IDS frame. 실패 시 해당 청크 이전까지만
 *   DB/SQLite 반영된 상태로 중단.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Progress } from 'antd';
import { toast } from '@/shared-util';
import { dnApi } from '../api/dnApi';
import type { DnResponse } from '../types';

/** 한 요청당 최대 DN 건수 — IDS TCP frame ~1MB 이하 유지 + 15s readTimeout 내 처리 보장 */
const CHUNK_SIZE = 500;

interface DnCopyDrawerProps {
  open: boolean;
  source: DnResponse | null;
  onCancel: () => void;
  onSuccess: (created: DnResponse[]) => void;
}

interface ChunkProgress {
  total: number; // 전체 생성 예정 건수
  completed: number; // 지금까지 성공한 건수
  currentChunkIndex: number;
  totalChunks: number;
  startNo: string; // 현재 청크 시작
  endNo: string; // 현재 청크 끝
  failedAt?: { startNo: string; endNo: string; message: string };
}

function padLeft(n: number, len: number) {
  return String(n).padStart(len, '0');
}

function buildChunks(startNo: string, endNo: string, pad: number, chunkSize: number) {
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

export default function DnCopyDrawer({ open, source, onCancel, onSuccess }: DnCopyDrawerProps) {
  const [form] = Form.useForm<{ startNo: string; endNo: string }>();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<ChunkProgress | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ startNo: '', endNo: '' });
      setProgress(null);
      cancelRef.current = false;
    }
  }, [open, form]);

  // 원본 DN의 사전 조건 평가
  const md5On = source?.md5Auth === 1;
  const staticIp = source?.extAuthtype === '1';
  const blocked = md5On || staticIp;
  const blockedReason = md5On ? '원본 DN이 MD5 인증을 사용 중이어서 복사할 수 없습니다.' : staticIp ? '원본 DN이 고정 IP 유형이어서 복사할 수 없습니다.' : '';

  const handleClose = () => {
    if (pending) {
      cancelRef.current = true; // 진행 중이면 중단 플래그만 set, 현재 청크는 완주
      return;
    }
    onCancel();
  };

  const handleSave = async () => {
    if (!source || blocked || pending) return;
    const v = await form.validateFields();
    if (v.startNo.length !== v.endNo.length) {
      toast.error('시작 번호와 끝 번호의 자릿수가 같아야 합니다.');
      return;
    }
    const s = Number(v.startNo);
    const e = Number(v.endNo);
    if (s > e) {
      toast.error('끝 번호는 시작 번호보다 커야 합니다.');
      return;
    }
    const pad = v.startNo.length;
    const chunks = buildChunks(v.startNo, v.endNo, pad, CHUNK_SIZE);
    const total = e - s + 1;

    setPending(true);
    cancelRef.current = false;
    const aggregated: DnResponse[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelRef.current) {
          toast.info(`사용자 요청으로 중단되었습니다. ${aggregated.length.toLocaleString()}건 생성됨.`);
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
        try {
          const created = await dnApi.copy({
            id: source.dnId,
            data: { startNo: c.startNo, endNo: c.endNo },
          });
          aggregated.push(...created);
        } catch (err: any) {
          const message = err?.response?.data?.message ?? err?.message ?? '복사 요청 실패';
          setProgress((p) => (p ? { ...p, failedAt: { startNo: c.startNo, endNo: c.endNo, message } } : p));
          toast.error(`청크 ${c.startNo}~${c.endNo} 실패 (${message}). 이전까지 ${aggregated.length.toLocaleString()}건 생성 완료. 실패 범위부터 재시도 가능.`);
          return;
        }
      }
      if (aggregated.length > 0) {
        toast.success(`${aggregated.length.toLocaleString()}건의 DN이 복사 생성되었습니다.`);
        onSuccess(aggregated);
      }
    } finally {
      setPending(false);
      setProgress((p) => (p ? { ...p, completed: aggregated.length } : p));
    }
  };

  const startNoVal = Form.useWatch('startNo', form);
  const endNoVal = Form.useWatch('endNo', form);
  const rangeCount = startNoVal && endNoVal ? Math.max(0, Number(endNoVal) - Number(startNoVal) + 1) : 0;
  const chunkCount = rangeCount > 0 ? Math.ceil(rangeCount / CHUNK_SIZE) : 0;

  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 0;

  return (
    <Drawer
      title={source ? `DN 복사 생성 — 원본: ${source.dnNo}` : 'DN 복사 생성'}
      open={open}
      onClose={handleClose}
      width={520}
      placement="right"
      maskClosable={!pending}
      closable={{ placement: 'end', disabled: pending }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={pending && cancelRef.current}>
            {pending ? '중단' : '취소'}
          </Button>
          <Button type="primary" onClick={handleSave} disabled={blocked || !source || pending} loading={pending}>
            복사 생성
          </Button>
        </div>
      }
    >
      {blocked && <Alert type="warning" showIcon message={blockedReason} className="!mb-4" />}

      {source && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-3 text-xs space-y-1.5">
          <div className="flex">
            <span className="text-gray-400 w-[90px]">원본 DN</span>
            <span className="font-semibold text-gray-800">{source.dnNo}</span>
          </div>
          <div className="flex">
            <span className="text-gray-400 w-[90px]">노드 / 테넌트</span>
            <span className="text-gray-700">
              {source.nodeName ?? '-'} / {source.tenantName ?? '-'}
            </span>
          </div>
          <div className="flex">
            <span className="text-gray-400 w-[90px]">내선 프로파일</span>
            <span className="text-gray-700">{source.dnProfileName ?? '-'}</span>
          </div>
          <div className="flex">
            <span className="text-gray-400 w-[90px]">COS</span>
            <span className="text-gray-700">{source.cosName ?? '-'}</span>
          </div>
          <div className="flex">
            <span className="text-gray-400 w-[90px]">IP 유형</span>
            <span className="text-gray-700">
              {source.extAuthtype === '1' ? '고정 IP' : '동적 IP'}
              {source.md5Auth === 1 ? ' · MD5 사용' : ''}
            </span>
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" initialValues={{ startNo: '', endNo: '' }}>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            label="시작 DN 번호"
            name="startNo"
            rules={[
              { required: true, message: '시작 번호는 필수입니다' },
              { pattern: /^[0-9]+$/, message: '숫자만 입력' },
              { max: 10, message: '10자리까지 가능' },
            ]}
          >
            <Input placeholder="예: 1001" maxLength={10} disabled={blocked || pending} />
          </Form.Item>
          <Form.Item
            label="끝 DN 번호"
            name="endNo"
            rules={[
              { required: true, message: '끝 번호는 필수입니다' },
              { pattern: /^[0-9]+$/, message: '숫자만 입력' },
              { max: 10, message: '10자리까지 가능' },
            ]}
          >
            <Input placeholder="예: 1020" maxLength={10} disabled={blocked || pending} />
          </Form.Item>
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <div>※ 시작·끝 번호의 자릿수는 동일해야 합니다.</div>
          <div>※ 원본 설정이 그대로 복제되며, 사용자/MAC/인증/단말기 할당 정보는 초기화됩니다.</div>
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
