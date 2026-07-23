/**
 * DN 단축다이얼 Drawer (IPR20S2020 _Short).
 *
 * - DnFormPage IPT 서비스 탭에서 shortDialSvc 토글 옆 [규칙 관리 →] 버튼
 * - 토글 ON + 수정 모드일 때만 활성
 * - 우측 Drawer: 그리드(N건) + 인라인 폼(추가/수정), 등록 버튼은 footer
 *
 * AS-IS Validation:
 *  - shortDial 필수, 2자리, 숫자
 *  - dialingNo 필수, 24자리, 숫자
 *  - dispName 100자 / shortdialDesc 256자
 */
import { useEffect, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Form, Input } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateDnShortDial, useDeleteDnShortDial, useGetDnShortDialList, useUpdateDnShortDial } from '../hooks/useDnQueries';
import type { DnShortDialRequest, DnShortDialResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnShortDialDrawerProps {
  open: boolean;
  dnId: number | null;
  dnNo?: string | null;
  onClose: () => void;
}

const INITIAL_VALUES: Partial<DnShortDialRequest> = {
  shortDial: '',
  dialingNo: '',
  dispName: '',
  shortdialDesc: '',
};

export default function DnShortDialDrawer({ open, dnId, dnNo, onClose }: DnShortDialDrawerProps) {
  const { gridOptions } = useAggridOptions();
  const [form] = Form.useForm<DnShortDialRequest>();
  const [editingShortDial, setEditingShortDial] = useState<string | null>(null);

  const { data: list = [], refetch } = useGetDnShortDialList(dnId);
  const createMut = useCreateDnShortDial();
  const updateMut = useUpdateDnShortDial();
  const deleteMut = useDeleteDnShortDial();

  useEffect(() => {
    if (open) resetForm();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(INITIAL_VALUES);
    setEditingShortDial(null);
  };

  const loadRow = (row: DnShortDialResponse) => {
    setEditingShortDial(row.shortDial);
    form.setFieldsValue({
      shortDial: row.shortDial,
      dialingNo: row.dialingNo,
      dispName: row.dispName ?? '',
      shortdialDesc: row.shortdialDesc ?? '',
    });
  };

  const handleSubmit = async () => {
    if (!dnId) return;
    let v: DnShortDialRequest;
    try {
      v = (await form.validateFields()) as DnShortDialRequest;
    } catch {
      return;
    }
    try {
      if (editingShortDial) {
        await updateMut.mutateAsync({ dnId, shortDial: editingShortDial, data: v });
        toast.success('수정되었습니다');
      } else {
        await createMut.mutateAsync({ dnId, data: v });
        toast.success('등록되었습니다');
      }
      await refetch();
      resetForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? '저장 실패');
    }
  };

  const handleDelete = async (shortDial: string) => {
    if (!dnId) return;
    try {
      await deleteMut.mutateAsync({ dnId, shortDial });
      toast.success('삭제되었습니다');
      await refetch();
      if (editingShortDial === shortDial) resetForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? '삭제 실패');
    }
  };

  const columnDefs = useMemo<ColDef<DnShortDialResponse>[]>(
    () => [
      { headerName: '단축번호', field: 'shortDial', width: 100 },
      { headerName: '전화번호', field: 'dialingNo', width: 140 },
      { headerName: '표시이름', field: 'dispName', minWidth: 120, flex: 1, tooltipField: 'dispName' },
      { headerName: '설명', field: 'shortdialDesc', minWidth: 120, flex: 2, tooltipField: 'shortdialDesc' },
      {
        headerName: '',
        width: 50,
        pinned: 'right',
        cellRenderer: (p: { data: DnShortDialResponse }) => (
          <div className="flex items-center gap-1 h-full">
            <Button size="small" type="text" danger icon={<Trash2 className="size-3.5" />} onClick={() => handleDelete(p.data.shortDial)} />
          </div>
        ),
        sortable: false,
        filter: false,
      },
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <Drawer
      title={`DN ${dnNo ?? ''} — 단축다이얼`}
      open={open}
      onClose={onClose}
      size={760}
      placement="right"
      closable={{ placement: 'end' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', padding: 16 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>닫기</Button>
          {editingShortDial && <Button onClick={resetForm}>새로 작성</Button>}
          <Button type="primary" onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
            {editingShortDial ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="text-sm font-semibold text-gray-700">단축다이얼</div>
        <Button size="small" icon={<Plus className="size-3.5" />} onClick={resetForm}>
          폼 초기화
        </Button>
      </div>
      <div className="flex-1 min-h-[240px]" style={{ width: '100%' }}>
        <AgGridReact<DnShortDialResponse>
          {...gridOptions}
          rowData={list}
          columnDefs={columnDefs}
          defaultColDef={{ filter: true, sortable: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }}
          onRowDoubleClicked={(e) => e.data && loadRow(e.data)}
          pagination={false}
          sideBar={false}
          statusBar={undefined}
        />
      </div>

      <div className="mt-3 p-2.5 border border-gray-200 rounded-md bg-white flex-shrink-0">
        <div className="text-xs font-semibold text-gray-700 mb-2">{editingShortDial ? '수정' : '신규 등록'}</div>
        <Form form={form} layout="vertical" size="small" initialValues={INITIAL_VALUES}>
          <div className="grid grid-cols-2 gap-2">
            <Form.Item
              name="shortDial"
              label="단축번호"
              required
              rules={[
                { required: true, message: '단축번호는 필수입니다' },
                { max: 2, message: '2자리까지' },
                { pattern: /^[0-9]+$/, message: '숫자만' },
              ]}
              className="!mb-2"
            >
              <Input maxLength={2} disabled={!!editingShortDial} placeholder="예: 01" />
            </Form.Item>
            <Form.Item
              name="dialingNo"
              label="전화번호"
              required
              rules={[
                { required: true, message: '전화번호는 필수입니다' },
                { max: 24, message: '24자리까지' },
                { pattern: /^[0-9]+$/, message: '숫자만' },
              ]}
              className="!mb-2"
            >
              <Input maxLength={24} placeholder="예: 0212345678" />
            </Form.Item>
          </div>
          <Form.Item name="dispName" label="표시이름" rules={[{ max: 100, message: '100자 이내' }]} className="!mb-2">
            <Input maxLength={100} placeholder="표시할 이름" />
          </Form.Item>
          <Form.Item name="shortdialDesc" label="설명" rules={[{ max: 256, message: '256자 이내' }]} className="!mb-1">
            <Input.TextArea rows={2} maxLength={256} placeholder="메모" />
          </Form.Item>
        </Form>
      </div>
    </Drawer>
  );
}
