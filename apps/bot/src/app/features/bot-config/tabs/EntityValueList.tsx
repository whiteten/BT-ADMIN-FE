import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import { useGetEntityValues } from '../hooks/useModelQueries';
import type { EntityType, EntityValueListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  SAME: '동의어',
  SYNONYMS: '유사어',
  PATTERNS: '패턴형',
};

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  SAME: 'blue',
  SYNONYMS: 'green',
  PATTERNS: 'orange',
};

export default function EntityValueList() {
  const { modelId, entityId } = useParams();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<EntityValueListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('entityValue');
  const [searchValue, setSearchValue] = useState('');

  const { data: entityValueList, isFetching } = useGetEntityValues({ params: { modelId, entityId } });

  const columnDefs: ColDef<EntityValueListItem>[] = [
    { headerName: 'ID', field: 'entityValueId', hide: true },
    { headerName: '대표값', field: 'entityValue', maxWidth: 250 },
    {
      headerName: '타입',
      field: 'entityType',
      maxWidth: 100,
      cellRenderer: (params: { value: EntityType }) => {
        const type = params.value;
        return (
          <Tag color={ENTITY_TYPE_COLORS[type]} className="!m-0">
            {ENTITY_TYPE_LABELS[type]}
          </Tag>
        );
      },
    },
    {
      headerName: '유사어',
      field: 'entityTypeValues',
      flex: 2,
      sortable: false,
    },
  ];

  const filteredList = useMemo(() => {
    if (!entityValueList) return [];
    if (!searchValue.trim()) return entityValueList;
    const keyword = searchValue.toLowerCase();
    return entityValueList.filter((item) => {
      const value = item[filterColumn as keyof typeof item];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [entityValueList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="entityValue"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '대표값', value: 'entityValue' },
              { label: '유사어', value: 'entityTypeValues' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" color="primary">
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EntityValueListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={{ ...gridOptions, sideBar: false, rowNumbers: false }} loading={isFetching} />
      </div>
    </div>
  );
}
