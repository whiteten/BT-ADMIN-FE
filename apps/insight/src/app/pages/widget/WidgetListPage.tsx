import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space, Tag } from 'antd';
import { Component, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useDeleteWidget, useGetWidgetList } from '../../features/widget/hooks/useWidgetQueries';
import type { WidgetItem } from '../../features/widget/types/widget.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'FCA', label: 'FCA' },
  { value: 'IC', label: 'IC' },
  { value: 'IR', label: 'IR' },
  { value: 'IE', label: 'IE' },
  { value: 'AI', label: 'AI' },
  { value: 'COMMON', label: '공통' },
];

const TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'DATA', label: 'DATA' },
  { value: 'CUSTOM', label: 'CUSTOM' },
];

export default function WidgetListPage() {
  const navigate = useNavigate();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [category, setCategory] = useState('');
  const [widgetType, setWidgetType] = useState('');
  const [searchText, setSearchText] = useState('');

  const params: Record<string, unknown> = {};
  if (category) params.category = category;
  if (widgetType) params.type = widgetType;

  const { data: widgetList = [], isLoading, refetch } = useGetWidgetList({ params });

  const deleteMutation = useDeleteWidget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('위젯이 삭제되었습니다.');
        refetch();
      },
      onError: () => {
        toast.error('위젯 삭제에 실패했습니다.');
      },
    },
  });

  const filteredList = searchText ? widgetList.filter((w) => w.widgetName.toLowerCase().includes(searchText.toLowerCase())) : widgetList;

  const handleDelete = (item: WidgetItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteMutation.mutate({ widgetId: item.widgetId });
      },
    });
  };

  const columnDefs: ColDef<WidgetItem>[] = [
    {
      field: 'widgetName',
      headerName: '위젯명',
      flex: 2,
      cellRenderer: (params: ICellRendererParams<WidgetItem>) => {
        const item = params.data;
        if (!item) return null;
        return (
          <div className="flex items-center gap-2">
            {item.icon && <span className="text-gray-400">{item.icon}</span>}
            <span>{item.widgetName}</span>
          </div>
        );
      },
    },
    {
      field: 'widgetType',
      headerName: '유형',
      width: 100,
      cellRenderer: (params: ICellRendererParams<WidgetItem>) => {
        const value = params.value as string;
        return <Tag color={value === 'DATA' ? 'blue' : 'purple'}>{value}</Tag>;
      },
    },
    {
      field: 'category',
      headerName: '카테고리',
      width: 100,
      cellRenderer: (params: ICellRendererParams<WidgetItem>) => {
        const value = params.value as string;
        return <Tag>{value}</Tag>;
      },
    },
    { field: 'visualization', headerName: '시각화', width: 110 },
    {
      field: 'refreshMode',
      headerName: '갱신방식',
      width: 120,
      cellRenderer: (params: ICellRendererParams<WidgetItem>) => {
        const item = params.data;
        if (!item) return null;
        return <Tag color={item.refreshMode === 'AUTO' ? 'green' : 'default'}>{item.refreshMode === 'AUTO' ? `자동 ${item.refreshInterval}초` : '수동'}</Tag>;
      },
    },
    {
      headerName: '크기',
      width: 90,
      valueGetter: (params) => {
        const item = params.data as WidgetItem | undefined;
        return item ? `${item.defaultW}\u00D7${item.defaultH}` : '';
      },
    },
    { field: 'createdAt', headerName: '등록일', width: 160 },
    {
      headerName: '작업',
      width: 100,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params: ICellRendererParams<WidgetItem>) => {
        const item = params.data;
        if (!item) return null;
        return (
          <Space size="small">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/widgets/${item.widgetId}/edit`);
              }}
            >
              <Edit size={14} className="text-gray-500 hover:text-blue-500 hover:cursor-pointer" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
            >
              <Trash2 size={14} className="text-gray-500 hover:text-red-500 hover:cursor-pointer" />
            </button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Component size={22} />
            위젯 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">대시보드에 배치할 위젯을 생성하고 관리합니다</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/dashboard/widgets/new')}>
          새 위젯
        </Button>
      </div>

      {/* Filter Bar */}
      <header className="flex items-center gap-3 w-full">
        <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} style={{ width: 120 }} placeholder="카테고리" popupMatchSelectWidth={false} />
        <Select value={widgetType} onChange={setWidgetType} options={TYPE_OPTIONS} style={{ width: 120 }} placeholder="유형" popupMatchSelectWidth={false} />
        <Input
          prefix={<Search size={14} />}
          placeholder="위젯명으로 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full lg:max-w-[400px]"
          allowClear
        />
        <div className="ml-auto text-sm text-gray-500 whitespace-nowrap">총 {filteredList.length}건</div>
      </header>

      {/* ag-Grid Table */}
      <div className="w-full h-full">
        <AgGridReact<WidgetItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => e.data && navigate(`/dashboard/widgets/${e.data.widgetId}/edit`)}
        />
      </div>
    </div>
  );
}
