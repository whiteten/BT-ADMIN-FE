import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { recSearchQueryKeys, useGetRecording, useUpdateRecordingInfo } from '../hooks/useRecSearchQueries';
import type { RecFileListItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface RecInfoUpdateModalRef {
  open: (row: RecFileListItem) => void;
}

const ROW_CLASS = 'grid grid-cols-[25%_75%] border-b border-gray-200 last:border-b-0';
const TH_CLASS = 'bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 flex items-center border-r border-gray-200';
const TD_CLASS = 'px-3 py-1.5 flex items-center';

function formatRecTime(recTime?: string) {
  if (!recTime || recTime.length < 14) return recTime ?? '';
  return `${recTime.slice(0, 4)}-${recTime.slice(4, 6)}-${recTime.slice(6, 8)} ${recTime.slice(8, 10)}:${recTime.slice(10, 12)}:${recTime.slice(12, 14)}`;
}

const RecInfoUpdateModal = forwardRef<RecInfoUpdateModalRef>((_, ref) => {
  const [row, setRow] = useState<RecFileListItem | null>(null);
  const [form] = Form.useForm();

  const queryClient = useQueryClient();
  const recKey = row?.recKey ?? null;
  const { data, isFetching } = useGetRecording({ params: recKey ? { recKey } : undefined });
  const { mutate: updateInfo, isPending } = useUpdateRecordingInfo();

  useImperativeHandle(ref, () => ({
    open: (r: RecFileListItem) => setRow(r),
  }));

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        custTel: data.custTel ?? '',
      });
    }
  }, [data, form]);

  const handleOk = () => {
    if (!recKey) return;
    form.validateFields().then((values) => {
      updateInfo(
        { recKey, ...values },
        {
          onSuccess: () => {
            toast.success('정보가 수정되었습니다.');
            queryClient.invalidateQueries({ queryKey: recSearchQueryKeys.getRecordings._def });
            handleClose();
          },
          onError: () => toast.error('수정에 실패했습니다.'),
        },
      );
    });
  };

  const handleClose = () => {
    setRow(null);
    form.resetFields();
  };

  return (
    <Modal title="정보수정" open={!!row} onOk={handleOk} onCancel={handleClose} okText="저장" cancelText="취소" confirmLoading={isPending} width={480} destroyOnHidden>
      {isFetching ? (
        <FallbackSpinner />
      ) : (
        <div className="border border-gray-200 rounded mt-2">
          {/* 읽기전용: 통화 정보 */}
          <div className={ROW_CLASS}>
            <div className={TH_CLASS}>통화일시</div>
            <div className={TD_CLASS}>
              <Input value={formatRecTime(row?.recTime)} readOnly variant="borderless" size="small" />
            </div>
          </div>
          <div className={ROW_CLASS}>
            <div className={TH_CLASS}>그룹</div>
            <div className={TD_CLASS}>
              <Input value={row?.groupId ?? ''} readOnly variant="borderless" size="small" />
            </div>
          </div>
          <div className={ROW_CLASS}>
            <div className={TH_CLASS}>상담원</div>
            <div className={TD_CLASS}>
              <Input value={`${row?.userName ?? ''} (${row?.userId ?? ''})`} readOnly variant="borderless" size="small" />
            </div>
          </div>
          <div className={ROW_CLASS}>
            <div className={TH_CLASS}>내선번호</div>
            <div className={TD_CLASS}>
              <Input value={row?.dnNo ?? ''} readOnly variant="borderless" size="small" />
            </div>
          </div>

          {/* 수정 가능: 고객 정보 */}
          <Form form={form} layout="inline" style={{ display: 'contents' }}>
            <div className={ROW_CLASS}>
              <div className={TH_CLASS}>전화번호</div>
              <div className={TD_CLASS}>
                <Form.Item name="custTel" style={{ margin: 0, width: '100%' }}>
                  <Input size="small" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      )}
    </Modal>
  );
});

RecInfoUpdateModal.displayName = 'RecInfoUpdateModal';
export default RecInfoUpdateModal;
