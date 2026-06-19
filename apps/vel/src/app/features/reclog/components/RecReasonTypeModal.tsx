import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { toast } from '@/shared-util';
import { useGetTenants } from '../../common/hooks/useCommonQueries';
import { useCreateReasonType, useDeleteReasonType, useGetReasonTypes, useUpdateReasonType } from '../hooks/useRecLogQueries';
import type { RecReasonType, RecReasonTypeRequest } from '../types/rec-log';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export interface RecReasonTypeModalRef {
  open: () => void;
}

const columnDefs: ColDef<RecReasonType>[] = [
  //   { field: 'tenantId', headerName: '테넌트ID', width: 160, minWidth: 120 },
  { field: 'code', headerName: '사유아이디', width: 110, minWidth: 90 },
  { field: 'codeNm', headerName: '사유제목', flex: 1, minWidth: 120 },
];

const RecReasonTypeModal = forwardRef<RecReasonTypeModalRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RecReasonType | null>(null);
  const gridRef = useRef<AgGridReact<RecReasonType>>(null);
  const [form] = Form.useForm<RecReasonTypeRequest & { tenantIdSearch?: string }>();
  const { gridOptions } = useAggridOptions();

  /* ── 드래그 ── */
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      dragStart.current = { x: e.clientX - dragPos.x, y: e.clientY - dragPos.y };
    },
    [dragPos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setDragPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onUp = () => {
      dragging.current = false;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  /* ── 데이터 ── */
  const { data: tenantsData } = useGetTenants();
  const tenantOptions = Array.isArray(tenantsData) ? tenantsData.map((t) => ({ value: t.tenantId, label: t.tenantName })) : [];

  const { data: reasonTypes, isFetching, refetch } = useGetReasonTypes({ tenantId }, searchEnabled);

  const { mutate: createReasonType, isPending: isCreating } = useCreateReasonType();
  const { mutate: updateReasonType, isPending: isUpdating } = useUpdateReasonType();
  const { mutate: deleteReasonType, isPending: isDeleting } = useDeleteReasonType();

  /* ── ref ── */
  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setSearchEnabled(false);
      setSelectedRow(null);
      setTenantId(undefined);
      setDragPos({ x: 0, y: 0 });
      form.resetFields();
    },
  }));

  /* ── 핸들러 ── */
  const handleSearch = () => {
    const tid = form.getFieldValue('tenantId') as string | undefined;
    setTenantId(tid);
    setSearchEnabled(true);
    setSelectedRow(null);
    setTimeout(() => refetch(), 0);
  };

  const handleRowClick = (row: RecReasonType) => {
    setSelectedRow(row);
    form.setFieldsValue({ code: row.code, codeNm: row.codeNm });
  };

  const handleSave = () => {
    form
      .validateFields(['tenantId', 'code', 'codeNm'])
      .then((values) => {
        if (selectedRow) {
          updateReasonType(
            { tenantId: selectedRow.tenantId, code: selectedRow.code, data: values as RecReasonTypeRequest },
            {
              onSuccess: () => {
                toast.success('수정되었습니다.');
                setSelectedRow(null);
                form.setFieldsValue({ code: '', codeNm: '' });
                refetch();
              },
              onError: () => toast.error('수정에 실패했습니다.'),
            },
          );
        } else {
          createReasonType(values as RecReasonTypeRequest, {
            onSuccess: () => {
              toast.success('등록되었습니다.');
              form.setFieldsValue({ code: '', codeNm: '' });
              refetch();
            },
            onError: () => toast.error('등록에 실패했습니다.'),
          });
        }
      })
      .catch((_err: unknown) => _err);
  };

  const handleDelete = () => {
    const checked = gridRef.current?.api.getSelectedRows() ?? [];
    if (checked.length === 0) {
      toast.warning('삭제할 항목을 선택하세요.');
      return;
    }
    Modal.confirm({
      title: '사유분류 삭제',
      content: `선택한 ${checked.length}건을 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: () => {
        let remaining = checked.length;
        let hasError = false;
        checked.forEach((row) => {
          deleteReasonType(
            { tenantId: row.tenantId, code: row.code },
            {
              onSuccess: () => {
                if (--remaining === 0 && !hasError) {
                  toast.success('삭제되었습니다.');
                  setSelectedRow(null);
                  form.setFieldsValue({ code: '', codeNm: '' });
                  refetch();
                }
              },
              onError: () => {
                hasError = true;
                toast.error('일부 항목 삭제에 실패했습니다.');
              },
            },
          );
        });
      },
    });
  };

  return (
    <Modal
      title={
        <div style={{ cursor: 'move', userSelect: 'none' }} onMouseDown={handleDragStart}>
          청취사유관리
        </div>
      }
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      width={700}
      destroyOnHidden
      modalRender={(modal) => <div style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}>{modal}</div>}
    >
      <Form
        form={form}
        name="recReasonTypeForm"
        layout="horizontal"
        labelAlign="left"
        colon={false}
        requiredMark={false}
        labelCol={{ style: { width: '72px', flexShrink: 0 } }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
      >
        {/* 조건 그리드 col-3 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
          {/* Row 1: 테넌트 */}
          <Form.Item name="tenantId" label="테넌트" style={{ marginBottom: 0 }}>
            <Select placeholder="테넌트 선택" options={tenantOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <div className="col-span-1" />
          {/* Row 2: 사유아이디 | 사유제목 */}
          <Form.Item name="code" label="사유아이디" style={{ marginBottom: 0 }} rules={[{ required: true, message: '사유아이디를 입력하세요' }]}>
            <Input placeholder="사유아이디" disabled={!!selectedRow} />
          </Form.Item>
          <Form.Item name="codeNm" label="사유제목" style={{ marginBottom: 0 }} rules={[{ required: true, message: '사유제목을 입력하세요' }]}>
            <Input placeholder="사유제목" />
          </Form.Item>
        </div>

        {/* 버튼 행 우측 정렬 */}
        <div className="flex justify-end gap-2 mb-3">
          <Button style={{ backgroundColor: '#ed8f14', borderColor: '#ed8f14', color: '#fff' }} onClick={handleSearch} loading={isFetching}>
            조회
          </Button>
          <Button type="primary" onClick={handleSave} loading={isCreating || isUpdating} disabled={!form.getFieldValue('tenantId')}>
            {selectedRow ? '수정' : '등록'}
          </Button>
          <Button danger onClick={handleDelete} loading={isDeleting}>
            삭제
          </Button>
          {selectedRow && (
            <Button
              onClick={() => {
                setSelectedRow(null);
                form.setFieldsValue({ code: '', codeNm: '' });
              }}
            >
              신규
            </Button>
          )}
        </div>
      </Form>

      {/* 결과 테이블 */}
      <div className="[&_.ag-header-cell-label]:justify-center" style={{ height: 320 }}>
        <AgGridReact<RecReasonType>
          ref={gridRef}
          rowData={reasonTypes ?? []}
          columnDefs={columnDefs}
          defaultColDef={{
            ...(gridOptions.defaultColDef as ColDef<RecReasonType>),
            flex: undefined,
            cellStyle: { textAlign: 'center', fontVariantNumeric: 'tabular-nums' },
          }}
          gridOptions={gridOptions}
          pagination={false}
          sideBar={false}
          statusBar={{ statusPanels: [] }}
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
          loading={isFetching}
          onRowClicked={(e) => {
            if (e.data) handleRowClick(e.data);
          }}
        />
      </div>
    </Modal>
  );
});

RecReasonTypeModal.displayName = 'RecReasonTypeModal';
export default RecReasonTypeModal;
