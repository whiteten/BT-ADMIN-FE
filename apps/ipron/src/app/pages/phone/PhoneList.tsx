import { useEffect, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space } from 'antd';
import { debounce } from 'lodash';
import { useGetPhones } from '../../features/phone/hooks/usePhoneQueries';
import type { Phone } from '../../features/phone/types/phone.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

type SearchField = 'name' | 'assignedUserName' | 'extNum' | 'macAddr';

interface SearchParams {
  [key: string]: string;
}

const SEARCH_FIELD_OPTIONS: Array<{ label: string; value: SearchField }> = [
  { label: '전화기명', value: 'name' },
  { label: '할당된 사용자', value: 'assignedUserName' },
  { label: '내선번호', value: 'extNum' },
  { label: 'MAC주소', value: 'macAddr' },
];

const columnDefs: ColDef<Phone>[] = [
  { headerName: '_id', field: '_id', hide: true },
  { headerName: 'tntId', field: 'tntId', hide: true },
  { headerName: 'name', field: 'name' },
  { headerName: 'type', field: 'type' },
  { headerName: 'assignedUserName', field: 'assignedUserName' },
  { headerName: 'macAddr', field: 'macAddr' },
  { headerName: 'isStandalone', field: 'isStandalone' },
  { headerName: 'extNum', field: 'extNum' },
  { headerName: 'didNum', field: 'didNum' },
  { headerName: 'createDate', field: 'createDate' },
];

export default function PhoneList() {
  const { gridOptions } = useAggridOptions();
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [searchValue, setSearchValue] = useState('');
  const [searchParams, setSearchParams] = useState<SearchParams | undefined>();

  const { data: phones = [], isFetching, isError, error } = useGetPhones({ params: searchParams });

  const debouncedSetSearchParamsRef = useRef(
    debounce((field: SearchField, value: string) => {
      const trimmedValue = value.trim();
      const newSearchParams = trimmedValue ? { [field]: trimmedValue } : undefined;
      setSearchParams(newSearchParams);
    }, 500),
  );

  useEffect(() => {
    const debouncedFn = debouncedSetSearchParamsRef.current;
    debouncedFn(searchField, searchValue);
    return () => {
      debouncedFn.cancel();
    };
  }, [searchField, searchValue]);

  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        {/* Header left area */}
        <div className="flex gap-2 w-full">
          <Space.Compact className="w-full">
            <Select value={searchField} onChange={setSearchField} options={SEARCH_FIELD_OPTIONS} popupMatchSelectWidth={false} className="!max-w-[150px]" />
            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="!w-full lg:!w-[300px]" placeholder="검색어를 입력하세요." />
          </Space.Compact>
        </div>
        {/* Header right area */}
        <div className="flex gap-2 justify-end">
          <Button variant="solid" color="green">
            추가
          </Button>
        </div>
      </header>
      {/* Body -Grid View */}
      <div className="w-full h-full">
        <AgGridReact<Phone> {...{ columnDefs, gridOptions }} loading={isFetching} rowData={phones as Phone[]} />
      </div>
    </div>
  );
}
