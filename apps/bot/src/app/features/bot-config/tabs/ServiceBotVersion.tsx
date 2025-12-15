import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Log } from '@/log';
import ServiceBotVersionDrawer from '../components/ServiceBotVersionDrawer';
import { useGetServiceBotVersions } from '../hooks/useServiceBotQueries';
import type { ServiceBotVersionListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<ServiceBotVersionListItem>[] = [
  { headerName: 'ID', field: 'serviceId', hide: true },
  { headerName: '버전', field: 'serviceVer' },
  { headerName: '버전명', field: 'versionName' },
  { headerName: '변경내용', field: 'versionDesc' },
  { headerName: '작업자', field: 'workUser' },
  { headerName: '작업일시', field: 'workTime' },
];

export default function ServiceBotVersion() {
  const { serviceId = '' } = useParams();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<ServiceBotVersionListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<ServiceBotVersionListItem | undefined>(undefined);
  const [filterColumn, setFilterColumn] = useState('version');
  const [searchValue, setSearchValue] = useState('');

  const { data: versionList, isFetching: isFetchingVersionList } = useGetServiceBotVersions({ params: { serviceId } });

  const filteredList = useMemo(() => {
    if (!versionList) return [];
    if (!searchValue.trim()) return versionList;
    const keyword = searchValue.toLowerCase();
    return versionList.filter((version) => {
      const value = version[filterColumn as keyof typeof version];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [versionList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };
  const handleClickAddVersion = () => {
    setSelectedRowData(undefined);
    setOpen(true);
  };
  const handleCloseDrawer = () => {
    setOpen(false);
  };
  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<ServiceBotVersionListItem>) => {
    const selectedRowData = e.data;
    Log.debug('handleRowDoubleClicked', selectedRowData);
    setSelectedRowData(selectedRowData);
    setOpen(true);
  };
  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="version"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '버전', value: 'version' },
              { label: '버전명', value: 'versionName' },
              { label: '변경내용', value: 'versionDesc' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={handleClickAddVersion}>
            버전추가
          </Button>
          <Button variant="solid">대화편집</Button>
          <Button variant="solid" color="primary">
            배포
          </Button>
          <Button variant="solid" color="cyan">
            배포설정
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<ServiceBotVersionListItem> {...{ rowData, columnDefs, gridOptions }} loading={isFetchingVersionList} onRowDoubleClicked={handleRowDoubleClicked} />
      </div>
      <ServiceBotVersionDrawer open={open} onClose={handleCloseDrawer} serviceId={serviceId} serviceVer={selectedRowData?.serviceVer} />
    </div>
  );
}
