/**
 * Super ANI(ANI번호-시나리오 매핑) 관리 Drawer (AS-IS IPR30S3035_04 팝업).
 * forwardRef + useImperativeHandle 패턴 — 그리드 + 인라인 추가/수정 폼을 한 Drawer 안에
 * (IvrDnGroupList.tsx의 Sub DN 관리 Drawer와 동일한 구조).
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetScenarios } from '../../scenario/hooks/useScenarioQueries';
import { scenarioMenuControlQueryKeys, useCreateSuperAni, useDeleteSuperAni, useGetSuperAnis, useUpdateSuperAni } from '../hooks/useScenarioMenuControlQueries';
import { SUPER_ANI_ALL_SCENARIOS, type ScenarioMenuSuperAni } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface ScenarioMenuSuperAniDrawerRef {
  open: () => void;
  close: () => void;
}

const ALL_OPTION = { label: '전체', value: SUPER_ANI_ALL_SCENARIOS };

const ScenarioMenuSuperAniDrawer = forwardRef<ScenarioMenuSuperAniDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [form] = Form.useForm();

  const [visible, setVisible] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScenarioMenuSuperAni | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }));

  const { data: superAnis = [], isLoading } = useGetSuperAnis({ queryOptions: { enabled: visible } });
  const { data: scenarios = [] } = useGetScenarios({ queryOptions: { enabled: visible } });

  const scenarioOptions = [ALL_OPTION, ...scenarios.map((s) => ({ label: `${s.serviceName} (${s.serviceId})`, value: String(s.serviceId) }))];
  const scenarioNameMap = new Map(scenarios.map((s) => [String(s.serviceId), s.serviceName]));

  const formatScenarioNames = (serviceIdList: string) =>
    serviceIdList === SUPER_ANI_ALL_SCENARIOS
      ? '전체'
      : serviceIdList
          .split(',')
          .map((id) => scenarioNameMap.get(id) ?? id)
          .join(', ');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: scenarioMenuControlQueryKeys.getSuperAnis.queryKey });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openAddForm = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditForm = (row: ScenarioMenuSuperAni) => {
    setEditing(row);
    setFormOpen(true);
  };

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      form.setFieldsValue({
        ani: editing.ani,
        userName: editing.userName,
        serviceIdList: editing.serviceIdList === SUPER_ANI_ALL_SCENARIOS ? [SUPER_ANI_ALL_SCENARIOS] : editing.serviceIdList.split(','),
        aniDesc: editing.aniDesc ?? '',
      });
    } else {
      form.resetFields();
    }
  }, [formOpen, editing, form]);

  const { mutate: createSuperAni, isPending: isCreating } = useCreateSuperAni({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Super ANI가 등록되었습니다.');
        closeForm();
        invalidate();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.'),
    },
  });

  const { mutate: updateSuperAni, isPending: isUpdating } = useUpdateSuperAni({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Super ANI가 수정되었습니다.');
        closeForm();
        invalidate();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.'),
    },
  });

  const { mutate: deleteSuperAni } = useDeleteSuperAni({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Super ANI가 삭제되었습니다.');
        invalidate();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.'),
    },
  });

  const handleDelete = (row: ScenarioMenuSuperAni) => {
    modal.confirm.delete({
      onOk: () => {
        if (editing?.ani === row.ani) closeForm();
        deleteSuperAni({ ani: row.ani });
      },
    });
  };

  const handleSubmit = async () => {
    let values: { ani: string; userName: string; serviceIdList: string[]; aniDesc?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const serviceIdList = values.serviceIdList.includes(SUPER_ANI_ALL_SCENARIOS) ? SUPER_ANI_ALL_SCENARIOS : values.serviceIdList.join(',');

    if (editing) {
      updateSuperAni({ ani: editing.ani, data: { serviceIdList, userName: values.userName, aniDesc: values.aniDesc } });
    } else {
      createSuperAni({ ani: values.ani, serviceIdList, userName: values.userName, aniDesc: values.aniDesc });
    }
  };

  const columnDefs: ColDef<ScenarioMenuSuperAni>[] = [
    { headerName: 'ANI', field: 'ani', flex: 1, minWidth: 100 },
    { headerName: '사용자명', field: 'userName', flex: 1, minWidth: 100 },
    {
      headerName: '시나리오',
      field: 'serviceIdList',
      flex: 1.5,
      minWidth: 130,
      tooltipValueGetter: (p) => (p.data?.serviceIdList ? formatScenarioNames(p.data.serviceIdList) : ''),
      cellRenderer: (p: ICellRendererParams<ScenarioMenuSuperAni>) => (p.data?.serviceIdList ? formatScenarioNames(p.data.serviceIdList) : '-'),
    },
    { headerName: '설명', field: 'aniDesc', flex: 1.5, minWidth: 130, cellRenderer: (p: ICellRendererParams<ScenarioMenuSuperAni>) => p.data?.aniDesc ?? '-' },
    {
      headerName: '',
      colId: 'actions',
      width: 76,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: ICellRendererParams<ScenarioMenuSuperAni>) =>
        p.data ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              title="수정"
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(p.data!);
              }}
            >
              <Pencil className="size-4 text-gray-500 hover:text-blue-600 hover:cursor-pointer" />
            </button>
            <button
              type="button"
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(p.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          </div>
        ) : null,
    },
  ];

  const handleDrawerClose = () => {
    setVisible(false);
    closeForm();
  };

  return (
    <Drawer
      title="Super ANI 목록"
      placement="right"
      size={720}
      open={visible}
      onClose={handleDrawerClose}
      closable={{ placement: 'end', disabled: isCreating || isUpdating }}
      destroyOnHidden
      footer={
        formOpen ? (
          <div className="flex items-center justify-end gap-2">
            <Button onClick={closeForm}>취소</Button>
            <Button type="primary" onClick={handleSubmit} loading={isCreating || isUpdating}>
              {editing ? '수정' : '추가'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleDrawerClose}>닫기</Button>
            <Button type="primary" onClick={openAddForm}>
              추가
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col h-full gap-3">
        <div className="flex-1 min-h-0">
          <AgGridReact<ScenarioMenuSuperAni>
            rowData={superAnis}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isLoading}
            getRowId={(p) => p.data.ani}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e) => e.data && openEditForm(e.data)}
          />
        </div>
        {formOpen && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex-shrink-0">
            <div className="text-[12px] font-semibold text-slate-700 mb-2">{editing ? `Super ANI 수정 — ${editing.ani}` : 'Super ANI 추가'}</div>
            <Form form={form} layout="vertical">
              <Form.Item
                name="ani"
                label="ANI 번호"
                required
                rules={[
                  { required: true, message: 'ANI 번호는 필수입니다' },
                  { max: 32, message: '32자 이내' },
                ]}
                className="!mb-2"
              >
                <Input placeholder="예: 021234567" maxLength={32} disabled={!!editing} />
              </Form.Item>
              <Form.Item
                name="userName"
                label="사용자명"
                required
                rules={[
                  { required: true, message: '사용자명은 필수입니다' },
                  { max: 100, message: '100자 이내' },
                ]}
                className="!mb-2"
              >
                <Input placeholder="사용자명" maxLength={100} />
              </Form.Item>
              <Form.Item name="serviceIdList" label="시나리오" required rules={[{ required: true, message: '시나리오는 필수입니다' }]} className="!mb-2">
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={scenarioOptions}
                  placeholder="시나리오 선택 (전체 선택 시 다른 항목 무시)"
                  onChange={(values: string[]) => {
                    if (values.length > 1 && values[values.length - 1] === SUPER_ANI_ALL_SCENARIOS) {
                      form.setFieldValue('serviceIdList', [SUPER_ANI_ALL_SCENARIOS]);
                    } else if (values.includes(SUPER_ANI_ALL_SCENARIOS) && values.length > 1) {
                      form.setFieldValue(
                        'serviceIdList',
                        values.filter((v) => v !== SUPER_ANI_ALL_SCENARIOS),
                      );
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="aniDesc" label="설명" rules={[{ max: 200, message: '200자 이내' }]} className="!mb-1">
                <Input.TextArea placeholder="(선택)" maxLength={200} rows={2} showCount />
              </Form.Item>
            </Form>
          </div>
        )}
      </div>
    </Drawer>
  );
});

ScenarioMenuSuperAniDrawer.displayName = 'ScenarioMenuSuperAniDrawer';
export default ScenarioMenuSuperAniDrawer;
