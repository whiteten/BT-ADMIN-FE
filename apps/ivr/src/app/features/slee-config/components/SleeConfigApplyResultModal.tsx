/**
 * SLEE 환경설정 즉시 적용 결과 모달.
 *
 * <p>시나리오 배포 결과 모달과 동일 패턴 — 시스템별 결과를 3-state 로 표시한다:</p>
 * <ul>
 *   <li><b>적용됨</b> (success && changed): 신규/변경/삭제 카운트 노출</li>
 *   <li><b>변경사항 없음</b> (success && !changed): 전부 동일 — 중립 표시</li>
 *   <li><b>실패</b> (!success): errorCode/message 노출</li>
 * </ul>
 *
 * <p>백엔드 SleeConfigApplyResultDto 가 inserted/updated/deleted/skipped + changed 를
 * 구조화해 내려주므로 문자열 파싱 없이 판정한다.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, MinusCircle, XCircle } from 'lucide-react';
import type { SleeConfigApplyResult } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SleeConfigApplyResultModalRef {
  open: (results: SleeConfigApplyResult[]) => void;
  close: () => void;
}

type RowState = 'applied' | 'nochange' | 'failed';

interface ModalState {
  open: boolean;
  results: SleeConfigApplyResult[];
}

function rowState(r: SleeConfigApplyResult): RowState {
  if (!r.success) return 'failed';
  return r.changed ? 'applied' : 'nochange';
}

const STATE_TAG: Record<RowState, { label: string; className: string }> = {
  applied: { label: '적용됨', className: 'text-emerald-600 bg-emerald-50' },
  nochange: { label: '변경사항 없음', className: 'text-gray-500 bg-gray-100' },
  failed: { label: '실패', className: 'text-red-500 bg-red-50' },
};

const SleeConfigApplyResultModal = forwardRef<SleeConfigApplyResultModalRef>((_, ref) => {
  const [{ open, results }, setModalState] = useState<ModalState>({ open: false, results: [] });

  useImperativeHandle(ref, () => ({
    open: (data: SleeConfigApplyResult[]) => setModalState({ open: true, results: data }),
    close: () => setModalState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setModalState((prev) => ({ ...prev, open: false }));

  const appliedCount = results.filter((r) => rowState(r) === 'applied').length;
  const nochangeCount = results.filter((r) => rowState(r) === 'nochange').length;
  const failedCount = results.filter((r) => rowState(r) === 'failed').length;

  // 집계 헤더 — 실패 우선, 그다음 적용, 전부 변경없음이면 중립.
  const header =
    failedCount > 0
      ? { icon: <XCircle className="size-6 text-red-500" />, text: appliedCount + nochangeCount > 0 ? '일부 실패' : '적용 실패' }
      : appliedCount > 0
        ? { icon: <CheckCircle className="size-6 text-green-500" />, text: '적용 완료' }
        : { icon: <MinusCircle className="size-6 text-gray-400" />, text: '변경사항 없음' };

  const columns: ColumnsType<SleeConfigApplyResult> = [
    {
      title: '시스템',
      dataIndex: 'systemName',
      key: 'systemName',
      width: 160,
      render: (name: string, row) => name ?? `시스템 ${row.systemId}`,
    },
    {
      title: '상태',
      key: 'state',
      width: 110,
      align: 'center',
      render: (_v, row) => {
        const meta = STATE_TAG[rowState(row)];
        return (
          <Badge variant="secondary" className={cn('text-[13px] leading-[13px] font-medium !h-6', meta.className)}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      title: '사유',
      key: 'reason',
      // 상태 태그로 적용됨/변경없음은 충분 — 실패 행의 사유만 표시한다.
      render: (_v, row) =>
        rowState(row) === 'failed' ? (
          <span className="text-[12px] leading-snug text-red-500 break-words line-clamp-2" title={row.message}>
            {row.message || row.errorCode || '실패'}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
  ];

  return (
    <Modal centered title="적용 결과" open={open} onCancel={handleClose} onOk={handleClose} cancelButtonProps={{ style: { display: 'none' } }} okText="확인" width={620}>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          {header.icon}
          <span>{header.text}</span>
        </div>
        <div className="flex gap-4 text-[13px] text-gray-500">
          <span>적용 {appliedCount}</span>
          <span>변경없음 {nochangeCount}</span>
          <span>실패 {failedCount}</span>
          <span className="ml-auto">총 {results.length}개 시스템</span>
        </div>
        <Table columns={columns} dataSource={results} rowKey="systemId" pagination={false} size="small" />
      </div>
    </Modal>
  );
});

SleeConfigApplyResultModal.displayName = 'SleeConfigApplyResultModal';

export default SleeConfigApplyResultModal;
