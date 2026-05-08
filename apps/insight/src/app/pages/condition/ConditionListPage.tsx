import { useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space, Tag } from 'antd';
import { Edit, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import ConditionFormDrawer, { type ConditionFormDrawerRef } from './ConditionFormDrawer';
import { useDeleteCondition, useGetConditionList } from '../../features/condition/hooks/useConditionQueries';
import type { SearchConditionItem } from '../../features/condition/types/condition.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const INPUT_TYPE_COLOR: Record<string, string> = {
  DATE_RANGE: 'blue',
  DATE_SINGLE: 'blue',
  TIME_RANGE: 'cyan',
  SINGLE_SELECT: 'green',
  MULTI_SELECT: 'green',
  SEGMENT: 'purple',
  RADIO_GROUP: 'purple',
  CHECKBOX: 'orange',
  TOGGLE: 'orange',
  TEXT: 'default',
  NUMBER_RANGE: 'magenta',
};

const INPUT_TYPE_LABEL: Record<string, string> = {
  DATE_RANGE: '날짜범위',
  DATE_SINGLE: '단일날짜',
  TIME_RANGE: '시간범위',
  SINGLE_SELECT: '단일선택',
  MULTI_SELECT: '멀티선택',
  SEGMENT: '세그먼트',
  RADIO_GROUP: '라디오',
  CHECKBOX: '체크박스',
  TOGGLE: '토글',
  TEXT: '텍스트',
  NUMBER_RANGE: '숫자범위',
};

export default function ConditionListPage() {
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [groupKey, setGroupKey] = useState('');
  const [searchText, setSearchText] = useState('');
  const drawerRef = useRef<ConditionFormDrawerRef>(null);

  const params: Record<string, unknown> = {};
  if (groupKey) params.groupKey = groupKey;

  const { data: conditionList = [], isLoading, refetch } = useGetConditionList({ params });

  const deleteMutation = useDeleteCondition({
    mutationOptions: {
      onSuccess: () => {
        toast.success('검색조건이 삭제되었습니다.');
        refetch();
      },
      onError: () => {
        toast.error('검색조건 삭제에 실패했습니다.');
      },
    },
  });

  // 그룹 목록 추출 (동적)
  const groupOptions = [
    { value: '', label: '전체' },
    ...Array.from(new Set(conditionList.filter((c) => c.groupKey).map((c) => c.groupKey!))).map((key) => {
      const item = conditionList.find((c) => c.groupKey === key);
      return { value: key, label: item?.groupLabel || key };
    }),
  ];

  const filteredList = searchText ? conditionList.filter((c) => c.conditionName.toLowerCase().includes(searchText.toLowerCase())) : conditionList;

  const handleCreate = () => {
    drawerRef.current?.open();
  };

  const handleEdit = (item: SearchConditionItem) => {
    drawerRef.current?.open(item);
  };

  const handleDelete = (item: SearchConditionItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteMutation.mutate({ conditionId: item.conditionId });
      },
    });
  };

  const columnDefs: ColDef<SearchConditionItem>[] = [
    { field: 'conditionName', headerName: '검색조건명', flex: 2 },
    {
      field: 'inputType',
      headerName: '입력유형',
      width: 120,
      cellRenderer: (params: ICellRendererParams<SearchConditionItem>) => {
        const value = params.value as string;
        return <Tag color={INPUT_TYPE_COLOR[value] || 'default'}>{INPUT_TYPE_LABEL[value] || value}</Tag>;
      },
    },
    { field: 'operator', headerName: '연산자', width: 100 },
    { field: 'defaultValue', headerName: '기본값', width: 140 },
    {
      headerName: '그룹',
      width: 160,
      valueGetter: (p) => {
        const data = p.data as SearchConditionItem | undefined;
        return data?.groupLabel || data?.groupKey || '-';
      },
    },
    {
      field: 'isRequired',
      headerName: '필수',
      width: 80,
      cellRenderer: (params: ICellRendererParams<SearchConditionItem>) => {
        const value = params.value as boolean;
        return <Tag color={value ? 'red' : 'default'}>{value ? '필수' : '선택'}</Tag>;
      },
    },
    { field: 'sortOrder', headerName: '순서', width: 70 },
    { field: 'createdAt', headerName: '등록일', width: 160 },
    {
      headerName: '작업',
      width: 100,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params: ICellRendererParams<SearchConditionItem>) => {
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
            <Filter size={22} />
            검색조건 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">위젯에 바인딩할 검색조건을 정의합니다</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleCreate}>
          새 검색조건
        </Button>
      </div>

      {/* Filter Bar */}
      <header className="flex items-center gap-3 w-full">
        <Select value={groupKey} onChange={setGroupKey} options={groupOptions} style={{ width: 180 }} placeholder="그룹" popupMatchSelectWidth={false} />
        <Input
          prefix={<Search size={14} />}
          placeholder="검색조건명으로 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full lg:max-w-[400px]"
          allowClear
        />
        <div className="ml-auto text-sm text-gray-500 whitespace-nowrap">총 {filteredList.length}건</div>
      </header>

      {/* ag-Grid Table */}
      <div className="w-full h-full">
        <AgGridReact<SearchConditionItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
        />
      </div>

      {/* Create/Edit Drawer */}
      <ConditionFormDrawer ref={drawerRef} onSuccess={() => refetch()} />
    </div>
  );
}
