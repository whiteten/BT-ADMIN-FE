import { useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space, Tag } from 'antd';
import { Database, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import DataSourceFormDrawer, { type DataSourceFormDrawerRef } from './DataSourceFormDrawer';
import { useDeleteDatasource, useGetDatasourceList } from '../../features/datasource/hooks/useDatasourceQueries';
import type { DataSourceItem } from '../../features/datasource/types/datasource.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PRODUCT_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'FCA', label: 'FCA' },
  { value: 'IC', label: 'IC' },
  { value: 'IR', label: 'IR' },
  { value: 'IE', label: 'IE' },
  { value: 'AI', label: 'AI' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'DB', label: 'DB' },
  { value: 'REDIS', label: 'Redis' },
];

export default function DataSourceListPage() {
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [productCode, setProductCode] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [searchText, setSearchText] = useState('');
  const drawerRef = useRef<DataSourceFormDrawerRef>(null);

  const params: Record<string, unknown> = {};
  if (productCode) params.productCode = productCode;
  if (sourceType) params.sourceType = sourceType;

  const { data: dataSourceList = [], isLoading, refetch } = useGetDatasourceList({ params });

  const deleteMutation = useDeleteDatasource({
    mutationOptions: {
      onSuccess: () => {
        toast.success('데이터소스가 삭제되었습니다.');
        refetch();
      },
      onError: () => {
        toast.error('데이터소스 삭제에 실패했습니다.');
      },
    },
  });

  const filteredList = searchText
    ? dataSourceList.filter((ds) => ds.datasourceKey.toLowerCase().includes(searchText.toLowerCase()) || ds.datasourceName.toLowerCase().includes(searchText.toLowerCase()))
    : dataSourceList;

  const handleCreate = () => {
    drawerRef.current?.open();
  };

  const handleEdit = (item: DataSourceItem) => {
    drawerRef.current?.open(item);
  };

  const handleDelete = (item: DataSourceItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteMutation.mutate({ datasourceKey: item.datasourceKey });
      },
    });
  };

  const columnDefs: ColDef<DataSourceItem>[] = [
    {
      field: 'datasourceKey',
      headerName: '데이터소스 키',
      flex: 2,
      cellStyle: { color: '#1d4ed8', fontFamily: 'monospace' },
    },
    { field: 'datasourceName', headerName: '데이터소스명', flex: 2 },
    { field: 'productCode', headerName: '제품군', width: 100 },
    {
      field: 'sourceType',
      headerName: '소스유형',
      width: 110,
      cellRenderer: (params: ICellRendererParams<DataSourceItem>) => {
        const value = params.value as string;
        return <Tag color={value === 'DB' ? 'blue' : 'red'}>{value}</Tag>;
      },
    },
    { field: 'dbTimeUnits', headerName: '시간단위', width: 160 },
    {
      field: 'isSystem',
      headerName: '등록유형',
      width: 100,
      cellRenderer: (params: ICellRendererParams<DataSourceItem>) => {
        const value = params.value as boolean;
        return <Tag color={value ? 'default' : 'blue'}>{value ? '시스템' : '수동'}</Tag>;
      },
    },
    {
      field: 'isActive',
      headerName: '활성',
      width: 80,
      cellRenderer: (params: ICellRendererParams<DataSourceItem>) => {
        const value = params.value as boolean;
        return <Tag color={value ? 'green' : 'default'}>{value ? '활성' : '비활성'}</Tag>;
      },
    },
    { field: 'createdAt', headerName: '등록일', width: 160 },
    {
      headerName: '작업',
      width: 100,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params: ICellRendererParams<DataSourceItem>) => {
        const item = params.data;
        if (!item) return null;
        return (
          <Space size="small">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(item);
              }}
            >
              <Edit size={14} className="text-gray-500 hover:text-blue-500 hover:cursor-pointer" />
            </button>
            {!item.isSystem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item);
                }}
              >
                <Trash2 size={14} className="text-gray-500 hover:text-red-500 hover:cursor-pointer" />
              </button>
            )}
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
            <Database size={22} />
            데이터소스 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">위젯에서 사용할 데이터 소스를 등록하고 관리합니다</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleCreate}>
          새 데이터소스
        </Button>
      </div>

      {/* Filter Bar */}
      <header className="flex items-center gap-3 w-full">
        <Select value={productCode} onChange={setProductCode} options={PRODUCT_OPTIONS} style={{ width: 120 }} placeholder="제품군" popupMatchSelectWidth={false} />
        <Select value={sourceType} onChange={setSourceType} options={SOURCE_TYPE_OPTIONS} style={{ width: 120 }} placeholder="소스유형" popupMatchSelectWidth={false} />
        <Input
          prefix={<Search size={14} />}
          placeholder="데이터소스 키 또는 이름으로 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full lg:max-w-[400px]"
          allowClear
        />
        <div className="ml-auto text-sm text-gray-500 whitespace-nowrap">총 {filteredList.length}건</div>
      </header>

      {/* ag-Grid Table */}
      <div className="w-full h-full">
        <AgGridReact<DataSourceItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
        />
      </div>

      {/* Create/Edit Drawer */}
      <DataSourceFormDrawer ref={drawerRef} onSuccess={() => refetch()} />
    </div>
  );
}
