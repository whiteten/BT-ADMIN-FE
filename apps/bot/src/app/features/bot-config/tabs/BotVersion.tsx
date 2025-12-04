import { useEffect, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import type { BotVersionListItem } from '../types/bot';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<BotVersionListItem>[] = [
  { headerName: 'ID', field: 'serviceId', hide: true },
  { headerName: '버전', field: 'serviceVer' },
  { headerName: '변경내용', field: 'versionDesc' },
  { headerName: '작업자', field: 'workUser' },
  { headerName: '작업일시', field: 'workTime' },
];

const sampleRowData: BotVersionListItem[] = Array.from({ length: 50 }).map((_, index) => ({
  serviceId: `bot-${index + 1}`,
  serviceVer: `1.0.${index}`,
  versionDesc: `버전 1.0.${index} 변경내용`,
  workUser: '홍길동',
  workTime: '2025-01-01 12:00:00',
}));

export default function BotVersion() {
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<BotVersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRowData(sampleRowData);
      setLoading(false);
    }, 2000);
  }, []);
  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="version"
            options={[
              { label: '버전', value: 'version' },
              { label: '변경내용', value: 'changeContent' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid">버전추가</Button>
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
        <AgGridReact<BotVersionListItem> {...{ rowData, columnDefs, gridOptions, loading }} />
      </div>
    </div>
  );
}
