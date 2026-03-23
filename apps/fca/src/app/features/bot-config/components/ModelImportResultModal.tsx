import { forwardRef, useImperativeHandle, useState } from 'react';
import { Collapse, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, CircleAlert, XCircle } from 'lucide-react';
import type { ExcelImportResult } from '../types/intent';
import type { ModelImportResult } from '../types/model';

interface ModalState {
  open: boolean;
  data: ModelImportResult | null;
}

export interface ModelImportResultModalRef {
  open: (data: ModelImportResult) => void;
  close: () => void;
}

interface ModelImportResultModalProps {
  onClose?: () => void;
}

interface GroupedFailRow {
  reason: string;
  names: string[];
}

const groupFailRows = (result: ExcelImportResult): GroupedFailRow[] => {
  const grouped: GroupedFailRow[] = [];
  result.rows
    .filter((row) => row.status === 'FAIL')
    .forEach((row) => {
      const existing = grouped.find((g) => g.reason === row.reason);
      if (existing) {
        if (!existing.names.includes(row.name)) {
          existing.names.push(row.name);
        }
      } else {
        grouped.push({
          reason: row.reason ?? '',
          names: [row.name],
        });
      }
    });
  return grouped;
};

const createColumns = (nameColumnTitle: string): ColumnsType<GroupedFailRow> => [
  {
    title: '실패 사유',
    dataIndex: 'reason',
    key: 'reason',
  },
  {
    title: '업로드',
    key: 'status',
    align: 'center',
    width: 70,
    render: () => <XCircle className="inline-block size-5 text-red-500" />,
  },
  {
    title: nameColumnTitle,
    dataIndex: 'names',
    key: 'names',
    width: 200,
    render: (names: string[]) => (
      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
        {names.map((name) => (
          <Tag key={name} color="red">
            {name}
          </Tag>
        ))}
      </div>
    ),
  },
];

const ResultSection = ({ result, nameColumnTitle }: { result: ExcelImportResult; nameColumnTitle: string }) => {
  const { totalCount, successCount, failCount } = result;
  const isAllSuccess = failCount === 0;
  const groupedFailRows = groupFailRows(result);
  const columns = createColumns(nameColumnTitle);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        {isAllSuccess ? <CheckCircle className="size-4 text-green-500" /> : <XCircle className="size-4 text-red-500" />}
        <span>
          업로드: {successCount}/{totalCount} 성공
        </span>
      </div>
      {!isAllSuccess && <Table columns={columns} dataSource={groupedFailRows} rowKey="reason" pagination={false} size="small" />}
    </div>
  );
};

const ModelImportResultModal = forwardRef<ModelImportResultModalRef, ModelImportResultModalProps>(({ onClose }, ref) => {
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    data: null,
  });

  const { open, data } = modalState;

  useImperativeHandle(ref, () => ({
    open: (resultData: ModelImportResult) => {
      setModalState({ open: true, data: resultData });
    },
    close: () => {
      setModalState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, open: false }));
    onClose?.();
  };

  if (!data) return null;

  const { intentResult, entityResult } = data;
  const totalCount = intentResult.totalCount + entityResult.totalCount;
  const totalSuccess = intentResult.successCount + entityResult.successCount;
  const totalFail = intentResult.failCount + entityResult.failCount;
  const isAllSuccess = totalFail === 0;
  const isAllFail = totalSuccess === 0;

  const collapseItems = [
    ...(intentResult.totalCount > 0
      ? [
          {
            key: 'intent',
            label: `인텐트 (${intentResult.successCount}/${intentResult.totalCount} 성공)`,
            children: <ResultSection result={intentResult} nameColumnTitle="인텐트명" />,
          },
        ]
      : []),
    ...(entityResult.totalCount > 0
      ? [
          {
            key: 'entity',
            label: `엔티티 (${entityResult.successCount}/${entityResult.totalCount} 성공)`,
            children: <ResultSection result={entityResult} nameColumnTitle="엔티티명" />,
          },
        ]
      : []),
  ];

  return (
    <Modal centered title="업로드 결과" open={open} onCancel={handleClose} onOk={handleClose} cancelButtonProps={{ style: { display: 'none' } }} okText="확인" width={680}>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          {isAllSuccess && (
            <>
              <CheckCircle className="size-6 text-green-500" />
              <span>업로드 성공</span>
            </>
          )}
          {!isAllSuccess && !isAllFail && (
            <>
              <CircleAlert className="size-6 text-[#faad14]" />
              <span>
                업로드 부분 성공 ({totalSuccess}/{totalCount})
              </span>
            </>
          )}
          {isAllFail && (
            <>
              <XCircle className="size-6 text-red-500" />
              <span>업로드 실패</span>
            </>
          )}
        </div>
        {!isAllSuccess && <Collapse items={collapseItems} />}
      </div>
    </Modal>
  );
});

ModelImportResultModal.displayName = 'ModelImportResultModal';

export default ModelImportResultModal;
