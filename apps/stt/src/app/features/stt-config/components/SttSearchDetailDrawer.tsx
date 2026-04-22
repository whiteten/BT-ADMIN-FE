import { forwardRef, useImperativeHandle, useState } from 'react';
import { Drawer, Empty, Spin } from 'antd';
import { Headphones, User } from 'lucide-react';
import { useGetSttResultSentence } from '../hooks/useSearchQueries';
import type { SttSearchItem } from '../types';
import { cn } from '@/lib/utils';

export interface SttSearchDetailDrawerRef {
  open: (row: SttSearchItem) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  row: SttSearchItem | null;
}

const RXTX_LABEL: Record<string, string> = {
  '1': '고객',
  '2': '상담원',
  '9': '통합',
};

const INOUT_LABEL: Record<string, string> = {
  '0': '인바운드',
  '1': '아웃바운드',
};

const SttSearchDetailDrawer = forwardRef<SttSearchDetailDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, row: null });

  useImperativeHandle(ref, () => ({
    open: (row) => setState({ open: true, row }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  const { data: sentences, isLoading } = useGetSttResultSentence({
    params: state.row ? { ucidGkey: state.row.ucidGkey } : ({ ucidGkey: '' } as never),
    queryOptions: { enabled: state.open && !!state.row },
  });

  const renderBubbles = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spin tip="대화 내용을 불러오는 중..." />
        </div>
      );
    }

    if (!sentences || sentences.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <Empty description="대화 내용이 없습니다." />
        </div>
      );
    }

    return sentences.map((item, idx) => {
      const isCustomer = String(item.rxtxKind) === '1';
      const label = RXTX_LABEL[String(item.rxtxKind)] ?? String(item.rxtxKind);

      return (
        <div key={`${item.armsoffset}-${idx}`} className={cn('flex w-full gap-2', isCustomer ? 'justify-start' : 'justify-end')}>
          {isCustomer && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
              <User className="size-5 text-gray-600" />
            </div>
          )}

          <div className={cn('flex flex-col max-w-[75%]', isCustomer ? 'items-start' : 'items-end')}>
            <span className="text-[10px] text-gray-400 mb-1 px-1">{label}</span>
            <div
              className={cn(
                'p-2 rounded-lg text-sm border',
                isCustomer ? 'bg-[#0AB39C] text-white border-[#0AB39C] rounded-tl-none' : 'bg-white border-gray-100 text-gray-800 rounded-tr-none shadow-sm',
              )}
            >
              {item.sentence}
            </div>
          </div>

          {!isCustomer && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
              <Headphones className="size-5 text-gray-600" />
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Drawer
      open={state.open}
      onClose={handleClose}
      title="대화 상세 내역"
      closable={{ placement: 'end' }}
      width={480}
      destroyOnHidden
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
    >
      {/* 통화 정보 */}
      <div className="p-3 bg-white border-b text-xs text-gray-500 flex flex-col gap-1 shrink-0">
        <div className="flex gap-4">
          <span>
            <span className="font-medium text-gray-600">통화일시</span> {state.row?.callDatetime ?? '-'}
          </span>
          <span>
            <span className="font-medium text-gray-600">통화시간</span> {state.row?.talkTime ?? '-'}
          </span>
        </div>
        <div className="flex gap-4">
          <span>
            <span className="font-medium text-gray-600">고유번호</span> {state.row?.ucidGkey ?? '-'}
          </span>
          <span>
            <span className="font-medium text-gray-600">I/O 구분</span> {state.row ? (INOUT_LABEL[state.row.inoutKind] ?? state.row.inoutKind) : '-'}
          </span>
        </div>
      </div>

      {/* 버블 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#f8f9fa]">{renderBubbles()}</div>
    </Drawer>
  );
});

SttSearchDetailDrawer.displayName = 'SttSearchDetailDrawer';
export default SttSearchDetailDrawer;
