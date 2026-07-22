import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Input, Modal, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { faultHistoryQueryKeys, useForceRecoverFaultHistories } from '../hooks/useFaultHistoryQueries';
import type { FaultHistoryItem, ForceRecoverResult } from '../types';
import { formatOccurredAt } from './FaultBadges';

export interface FaultForceRecoverModalRef {
  open: (items: FaultHistoryItem[]) => void;
  close: () => void;
}

interface FaultForceRecoverModalProps {
  /** 강제복구 처리 후(부분 성공 포함) 호출 — 목록 선택 해제 등 후처리용 */
  onDone?: () => void;
}

/**
 * 강제복구 모달 — AS-IS IPR60S5010 poRestore 팝업(gbn=2) 대체.
 * 복구 시각 기본 현재(AS-IS 는 09:00 고정) + 사유 필수(AS-IS 는 선택) + 일괄 API 1회 호출 + 건별 결과 표시.
 * 엔진(IOSVR) 복구 지시가 성공한 건만 원장에 복구로 기록되며, 실패 건은 미복구로 남는다.
 */
export const FaultForceRecoverModal = forwardRef<FaultForceRecoverModalRef, FaultForceRecoverModalProps>(function FaultForceRecoverModal({ onDone }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [targets, setTargets] = useState<FaultHistoryItem[]>([]);
  const [repairDate, setRepairDate] = useState<dayjs.Dayjs>(dayjs());
  const [repairTime, setRepairTime] = useState<dayjs.Dayjs>(dayjs());
  const [reason, setReason] = useState('');

  const queryClient = useQueryClient();
  const recoverMutation = useForceRecoverFaultHistories({
    mutationOptions: {
      onSuccess: (result: ForceRecoverResult) => {
        queryClient.invalidateQueries({ queryKey: faultHistoryQueryKeys._def });
        showResult(result);
        setIsOpen(false);
        onDone?.();
      },
      onError: () => message.error('강제복구 요청에 실패했습니다.'),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (items: FaultHistoryItem[]) => {
      setTargets(items);
      setRepairDate(dayjs());
      setRepairTime(dayjs());
      setReason('');
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const showResult = (result: ForceRecoverResult) => {
    if (result.failCount === 0) {
      message.success(`강제복구 완료: ${result.successCount}건`);
      return;
    }
    Modal.warning({
      title: `강제복구 부분 완료 — 성공 ${result.successCount}건 · 실패 ${result.failCount}건`,
      content: (
        <ul className="mt-2 list-disc pl-4 text-sm text-gray-600">
          {result.results
            .filter((r) => !r.success)
            .map((r) => (
              <li key={r.historyId}>
                #{r.historyId}: {r.message ?? '알 수 없는 오류'}
              </li>
            ))}
        </ul>
      ),
    });
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      message.warning('복구 사유를 입력하세요.');
      return;
    }
    const repairTs = `${repairDate.format('YYYYMMDD')}${repairTime.format('HHmmss')}`;
    recoverMutation.mutate({
      items: targets.map((t) => ({ historyId: t.errHistoryId })),
      repairTime: repairTs,
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      open={isOpen}
      onCancel={() => setIsOpen(false)}
      title={`강제복구 — ${targets.length}건`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setIsOpen(false)}>취소</Button>
          <Button type="primary" danger onClick={handleSubmit} loading={recoverMutation.isPending}>
            강제복구 실행
          </Button>
        </div>
      }
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm max-h-32 overflow-y-auto">
          {targets.map((t) => (
            <div key={t.errHistoryId} className="flex items-center justify-between py-0.5">
              <span className="text-gray-700">
                {t.systemName ?? `시스템 #${t.systemId ?? '-'}`}
                {t.processName ? ` · ${t.processName}` : ''}
                {t.errCode ? ` · ${t.errCode}` : ''}
              </span>
              <span className="text-xs text-gray-400">{formatOccurredAt(t.errDate, t.errTime)}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">복구 시각</div>
          <div className="flex gap-2">
            <DatePicker
              value={repairDate}
              onChange={(d) => d && setRepairDate(d)}
              format="YYYY-MM-DD"
              allowClear={false}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
            <TimePicker value={repairTime} onChange={(t) => t && setRepairTime(t)} format="HH:mm:ss" allowClear={false} />
          </div>
          <div className="mt-1 text-[11px] text-gray-400">기본값은 현재 시각입니다. 발생 시각 이전으로 입력하면 해당 건은 실패 처리됩니다.</div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">
            복구 사유 <span className="text-red-500">*</span>
          </div>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 서버실 점검 후 프로세스 정상 확인 — 복구 이벤트 유실"
          />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          엔진(IOSVR)에 복구 지시를 보내고 <b>성공한 건만</b> 이력에 복구로 기록됩니다. 실패 건은 미복구 상태로 남고 사유가 표시됩니다.
        </div>
      </div>
    </Modal>
  );
});
