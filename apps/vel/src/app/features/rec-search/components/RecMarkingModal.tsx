import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { recSearchQueryKeys, useGetMarkCodes, useUpdateMarking } from '../hooks/useRecSearchQueries';
import type { MarkCode, RecFileListItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface RecMarkingModalRef {
  open: (rows: RecFileListItem[]) => void;
}

const RecMarkingModal = forwardRef<RecMarkingModalRef>((_, ref) => {
  const [rows, setRows] = useState<RecFileListItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<MarkCode | null>(null);
  const [memo, setMemo] = useState('');

  const queryClient = useQueryClient();
  const tenantId = rows[0]?.tenantId;
  const { data: markCodes, isFetching } = useGetMarkCodes({
    params: tenantId ? { tenantId } : undefined,
  });
  const { mutateAsync: updateMarking, isPending } = useUpdateMarking();

  useImperativeHandle(ref, () => ({
    open: (r: RecFileListItem[]) => {
      setRows(r);
      setSelectedCode(null);
      setMemo('');
    },
  }));

  const handleClose = () => {
    setRows([]);
    setSelectedCode(null);
    setMemo('');
  };

  const handleSave = () => {
    if (!selectedCode) {
      toast.warning('마킹구분을 선택하세요');
      return;
    }
    Modal.confirm({
      title: '저장 확인',
      content: '저장 하시겠습니까?',
      okText: '저장',
      cancelText: '취소',
      onOk: async () => {
        try {
          await Promise.all(
            rows.map((row) =>
              updateMarking({
                recKey: row.recKey,
                markCode: selectedCode.markCode,
                markMemo: memo,
              }),
            ),
          );
          toast.success('성공적으로 저장 되었습니다.');
          queryClient.invalidateQueries({ queryKey: recSearchQueryKeys.getRecordings._def });
          handleClose();
        } catch {
          toast.error('마킹 등록에 실패했습니다.');
        }
      },
    });
  };

  return (
    <Modal title="마킹등록" open={rows.length > 0} onOk={handleSave} onCancel={handleClose} okText="저장" cancelText="취소" confirmLoading={isPending} width={460} destroyOnHidden>
      {isFetching ? (
        <FallbackSpinner />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-gray-600">선택한 통화내역 {rows.length}건에 마킹합니다.</div>
          <div className="border border-gray-300 rounded overflow-hidden">
            {(markCodes ?? []).length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">등록된 마킹 코드가 없습니다.</div>
            ) : (
              (markCodes ?? []).map((code) => {
                const isSelected = selectedCode?.markCode === code.markCode;
                return (
                  <div
                    key={code.markCode}
                    onClick={() => setSelectedCode(code)}
                    style={{ backgroundColor: code.markColor ? `#${code.markColor}` : undefined }}
                    className={`cursor-pointer px-3 py-2 text-sm border-b border-gray-200 last:border-b-0 hover:opacity-80 ${isSelected ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]' : ''}`}
                  >
                    {code.markName}
                  </div>
                );
              })
            )}
          </div>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <label className="text-sm font-medium text-gray-700">메모</label>
            <Input.TextArea value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={50} rows={2} placeholder="메모 (최대 50자)" />
          </div>
        </div>
      )}
    </Modal>
  );
});

RecMarkingModal.displayName = 'RecMarkingModal';
export default RecMarkingModal;
