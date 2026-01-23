import { forwardRef, useImperativeHandle, useState } from 'react';
import { Collapse, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, XCircle } from 'lucide-react';
import type { PublishBotVersionResult } from '../types';

interface ModalState {
  open: boolean;
  data: PublishBotVersionResult | null;
}

export interface BotVersionPublishResultModalRef {
  open: (data: PublishBotVersionResult) => void;
  close: () => void;
}

interface MergedResultItem {
  systemId: number;
  systemName: string;
  deploySuccess: boolean;
  applySuccess: boolean;
}

const BotVersionPublishResultModal = forwardRef<BotVersionPublishResultModalRef>((_, ref) => {
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    data: null,
  });

  const { open, data } = modalState;

  useImperativeHandle(ref, () => ({
    open: (resultData: PublishBotVersionResult) => {
      setModalState({ open: true, data: resultData });
    },
    close: () => {
      setModalState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  if (!data) return null;

  const { deployResults, applyResults, deploySuccessCount, deployFailCount, applySuccessCount, applyFailCount, totalCount } = data.data;

  const isAllSuccess = deployFailCount === 0 && applyFailCount === 0;

  const mergedResults: MergedResultItem[] = deployResults.map((deploy) => {
    const apply = applyResults.find((a) => a.systemId === deploy.systemId);
    return {
      systemId: deploy.systemId,
      systemName: deploy.systemName,
      deploySuccess: deploy.success,
      applySuccess: apply?.success ?? false,
    };
  });

  const columns: ColumnsType<MergedResultItem> = [
    {
      title: '시스템명',
      dataIndex: 'systemName',
      key: 'systemName',
    },
    {
      title: '배포',
      dataIndex: 'deploySuccess',
      key: 'deploySuccess',
      align: 'center',
      width: 80,
      render: (success: boolean) => (success ? <CheckCircle className="inline-block size-5 text-green-500" /> : <XCircle className="inline-block size-5 text-red-500" />),
    },
    {
      title: '적용',
      dataIndex: 'applySuccess',
      key: 'applySuccess',
      align: 'center',
      width: 80,
      render: (success: boolean) => (success ? <CheckCircle className="inline-block size-5 text-green-500" /> : <XCircle className="inline-block size-5 text-red-500" />),
    },
  ];

  const collapseItems = [
    {
      key: 'detail',
      label: '상세 내역',
      children: (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4 text-sm">
            <span>
              배포: {deploySuccessCount}/{totalCount} 성공
            </span>
            <span>
              적용: {applySuccessCount}/{totalCount} 성공
            </span>
          </div>
          <Table columns={columns} dataSource={mergedResults} rowKey="systemId" pagination={false} size="small" />
        </div>
      ),
    },
  ];

  return (
    <Modal centered title="배포 결과" open={open} onCancel={handleClose} onOk={handleClose} cancelButtonProps={{ style: { display: 'none' } }} okText="확인" width={480}>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          {isAllSuccess ? (
            <>
              <CheckCircle className="size-6 text-green-500" />
              <span>배포 성공</span>
            </>
          ) : (
            <>
              <XCircle className="size-6 text-red-500" />
              <span>배포 실패</span>
            </>
          )}
        </div>
        <Collapse items={collapseItems} />
      </div>
    </Modal>
  );
});

BotVersionPublishResultModal.displayName = 'BotVersionPublishResultModal';

export default BotVersionPublishResultModal;
