import { forwardRef, useImperativeHandle, useState } from 'react';
import { Collapse, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, CircleAlert, XCircle } from 'lucide-react';
import type { ExcelImportResult } from '../types/ivrAinDnis.types';

interface ModalState {
  open: boolean;
  data: ExcelImportResult | null;
}

export interface IvrAinDnisImportResultModalRef {
  open: (data: ExcelImportResult) => void;
  close: () => void;
}

interface GroupedFailRow {
  reason: string;
  names: string[];
}

const IvrAinDnisImportResultModal = forwardRef<IvrAinDnisImportResultModalRef>((_, ref) => {
  const [modalState, setModalState] = useState<ModalState>({ open: false, data: null });
  const { open, data } = modalState;

  useImperativeHandle(ref, () => ({
    open: (resultData: ExcelImportResult) => {
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

  const { totalCount, successCount, failCount, rows = [] } = data;
  const isAllSuccess = failCount === 0;
  const isAllFail = successCount === 0;

  const groupedFailRows: GroupedFailRow[] = [];
  rows
    .filter((row) => row.status === 'FAIL')
    .forEach((row) => {
      const name = row.name ?? '';
      const existing = groupedFailRows.find((g) => g.reason === row.reason);
      if (existing) {
        if (!existing.names.includes(name)) existing.names.push(name);
      } else {
        groupedFailRows.push({ reason: row.reason ?? '', names: [name] });
      }
    });

  const columns: ColumnsType<GroupedFailRow> = [
    { title: '실패 사유', dataIndex: 'reason', key: 'reason' },
    {
      title: '업로드',
      key: 'status',
      align: 'center',
      width: 70,
      render: () => <XCircle className="inline-block size-5 text-red-500" />,
    },
    {
      title: '대표번호+DNIS',
      dataIndex: 'names',
      key: 'names',
      width: 240,
      render: (names: string[]) => (
        <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
          {names.map((name, index) => (
            <Tag key={`${name}-${index}`} color="red">
              {name || '-'}
            </Tag>
          ))}
        </div>
      ),
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
              업로드: {successCount}/{totalCount} 성공
            </span>
          </div>
          <Table columns={columns} dataSource={groupedFailRows} rowKey="reason" pagination={false} size="small" />
        </div>
      ),
    },
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
                업로드 부분 성공 ({successCount}/{totalCount})
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

IvrAinDnisImportResultModal.displayName = 'IvrAinDnisImportResultModal';

export default IvrAinDnisImportResultModal;
