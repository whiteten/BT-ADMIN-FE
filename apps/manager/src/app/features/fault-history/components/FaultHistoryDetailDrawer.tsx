import { Fragment, forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, message } from 'antd';
import { faultHistoryQueryKeys, useGetFaultHistoryEvents, useUpdateFaultHistoryMemo } from '../hooks/useFaultHistoryQueries';
import type { FaultHistoryItem } from '../types';
import { FaultStatusBadge, LevelBadge, formatOccurredAt, formatRepairTime } from './FaultBadges';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface FaultHistoryDetailDrawerRef {
  open: (item: FaultHistoryItem) => void;
  close: () => void;
}

/**
 * 장애 상세 드로어 — AS-IS IPR60S5010 상세 팝업 대체.
 * 발생 정보 + 같은 장애 Key 의 이벤트 시퀀스 + 장애 메모(저장).
 * 강제복구는 엔진(IOSVR) 전달 방식 확정 후 추가 예정.
 */
export const FaultHistoryDetailDrawer = forwardRef<FaultHistoryDetailDrawerRef>(function FaultHistoryDetailDrawer(_, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<FaultHistoryItem | null>(null);
  const [memo, setMemo] = useState('');

  const queryClient = useQueryClient();
  const { data: events, isLoading: eventsLoading } = useGetFaultHistoryEvents({
    params: { issueKey: item?.errIssueKey ?? '' },
    queryOptions: { enabled: !!item?.errIssueKey },
  });
  // 캐시 무효화는 컴포넌트의 mutationOptions.onSuccess 에서 처리 (add-api 규약)
  const memoMutation = useUpdateFaultHistoryMemo({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: faultHistoryQueryKeys._def });
        message.success('장애 메모를 저장했습니다.');
      },
      onError: () => message.error('장애 메모 저장에 실패했습니다.'),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (row: FaultHistoryItem) => {
      setItem(row);
      setMemo(row.errMemo ?? '');
      setIsOpen(true);
    },
    close: () => handleClose(),
  }));

  const handleClose = () => {
    setIsOpen(false);
    setItem(null);
    setMemo('');
  };

  const handleSaveMemo = () => {
    if (!item) return;
    memoMutation.mutate({ historyId: item.errHistoryId, memo });
  };

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="장애 상세"
      closable={{ placement: 'end' }}
      size={520}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end">
          <Button onClick={handleClose}>닫기</Button>
        </div>
      }
    >
      {!item ? (
        <div className="text-center text-gray-500 py-8">상세 정보를 불러올 수 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 헤더 요약 */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-800">{item.errMessage || item.errCode || '장애'}</span>
              <FaultStatusBadge repairTime={item.errRepairTime} />
              <LevelBadge level={item.errLevel} />
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {item.systemName ?? `시스템 #${item.systemId ?? '-'}`}
              {item.nodeName ? ` (${item.nodeName})` : ''}
              {item.processName ? ` · ${item.processName}` : ''}
              {item.errCode ? ` · ${item.errCode}` : ''}
            </div>
            {item.errIssueKey && <div className="mt-1 text-[11px] text-gray-400 font-mono">key: {item.errIssueKey}</div>}
          </div>

          {/* 발생 정보 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">발생 정보</h4>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">발생 시각</span>
                <span className="text-gray-800">{formatOccurredAt(item.errDate, item.errTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">복구 시각</span>
                <span className={item.errRepairTime ? 'text-gray-800' : 'text-gray-400'}>{item.errRepairTime ? formatRepairTime(item.errRepairTime) : '— (미복구)'}</span>
              </div>
            </div>
          </section>

          {/* 이벤트 시퀀스 — 같은 장애 Key */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
              이벤트 시퀀스 <span className="font-normal text-gray-400 normal-case">— 같은 장애 Key</span>
            </h4>
            {eventsLoading ? (
              <FallbackSpinner />
            ) : !item.errIssueKey || !events || events.length === 0 ? (
              <div className="text-sm text-gray-400">이벤트 시퀀스가 없습니다.</div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left font-medium px-2.5 py-1.5">발생일시</th>
                      <th className="text-center font-medium px-2 py-1.5 w-20">상태</th>
                      <th className="text-left font-medium px-2.5 py-1.5 w-36">복구일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.map((ev) => (
                      <Fragment key={ev.errHistoryId}>
                        <tr>
                          <td className="px-2.5 py-2 text-gray-700">{formatOccurredAt(ev.errDate, ev.errTime)}</td>
                          <td className="px-2 py-2 text-center">
                            <FaultStatusBadge repairTime={ev.errRepairTime} />
                          </td>
                          <td className="px-2.5 py-2 text-gray-500">{ev.errRepairTime ? formatRepairTime(ev.errRepairTime) : '—'}</td>
                        </tr>
                        {ev.errMessage && (
                          <tr>
                            <td colSpan={3} className="px-2.5 pb-2 pt-0 text-[11px] text-gray-500">
                              {ev.errMessage}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 장애 메모 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">장애 메모</h4>
            <Input.TextArea rows={3} maxLength={2000} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="조치 내용, 원인 등" />
            <Button className="mt-2" size="small" onClick={handleSaveMemo} loading={memoMutation.isPending}>
              메모 저장
            </Button>
          </section>
        </div>
      )}
    </Drawer>
  );
});
