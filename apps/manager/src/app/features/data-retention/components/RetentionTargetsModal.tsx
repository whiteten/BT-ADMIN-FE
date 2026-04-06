import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useGetRetentionTargets } from '../hooks/useDataRetentionQueries';
import type { RetentionTargetItem } from '../types/dataRetention.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const { Text } = Typography;

export interface RetentionTargetsModalRef {
  open: (policyId: number, policyName: string) => void;
  close: () => void;
}

interface ModalState {
  open: boolean;
  policyId: number | null;
  policyName: string;
}

const columns: ColumnsType<RetentionTargetItem> = [
  {
    title: '순서',
    dataIndex: 'sortOrder',
    width: 60,
    align: 'center',
  },
  {
    title: '테이블명',
    dataIndex: 'tableName',
    render: (value: string) => <Text code>{value}</Text>,
  },
  {
    title: '설명',
    dataIndex: 'description',
  },
];

const RetentionTargetsModal = forwardRef<RetentionTargetsModalRef>((_, ref) => {
  const [state, setState] = useState<ModalState>({ open: false, policyId: null, policyName: '' });

  useImperativeHandle(ref, () => ({
    open: (policyId, policyName) => setState({ open: true, policyId, policyName }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  const { data, isLoading } = useGetRetentionTargets(state.policyId);

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  return (
    <Modal title={`${state.policyName} - 대상 테이블`} open={state.open} onCancel={handleClose} footer={null} width={600}>
      {isLoading ? (
        <div className="h-40">
          <FallbackSpinner />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data?.description && <Text type="secondary">{data.description}</Text>}
          {data?.dateColumn && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>기준 컬럼:</span>
              <Text code>{data.dateColumn}</Text>
            </div>
          )}
          <Table<RetentionTargetItem> dataSource={data?.targets ?? []} columns={columns} rowKey="targetId" size="small" pagination={false} bordered />
        </div>
      )}
    </Modal>
  );
});

RetentionTargetsModal.displayName = 'RetentionTargetsModal';
export default RetentionTargetsModal;
