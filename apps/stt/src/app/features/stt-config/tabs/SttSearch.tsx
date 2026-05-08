import { useRef, useState } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import SttSearchDetailDrawer, { type SttSearchDetailDrawerRef } from '../components/SttSearchDetailDrawer';
import { useGetSttSearch } from '../hooks/useSearchQueries';
import type { SttSearchItem, SttSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const IN_OUT_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'I/B (인바운드)', value: '0' },
  { label: 'O/B (아웃바운드)', value: '1' },
];

const PAGE_SIZE = 20;

export default function SttSearch() {
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<SttSearchItem>>(null);
  const drawerRef = useRef<SttSearchDetailDrawerRef>(null);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [keyword, setKeyword] = useState('');
  const [inOutType, setInOutType] = useState('');
  const [ucidGkey, setUcidGkey] = useState('');
  const [agentName, setAgentName] = useState('');
  const [dnNo, setDnNo] = useState('');
  const [searchParams, setSearchParams] = useState<SttSearchParams>({
    fromDateTime: dayjs().format('YYYYMMDD') + '000000',
    toDateTime: dayjs().format('YYYYMMDD') + '235959',
    analKindArr: ['R', 'B'],
  });

  const buildParams = (): SttSearchParams => ({
    fromDateTime: startDate && startTime ? startDate.format('YYYYMMDD') + startTime.format('HHmmss') : undefined,
    toDateTime: endDate && endTime ? endDate.format('YYYYMMDD') + endTime.format('HHmmss') : undefined,
    keyword: keyword || undefined,
    inoutKind: inOutType || undefined,
    ucidGkey: ucidGkey || undefined,
    agentName: agentName || undefined,
    dnNo: dnNo || undefined,
    analKindArr: ['R', 'B'],
  });

  const { data: rowData, isLoading } = useGetSttSearch({
    params: searchParams as Record<string, unknown>,
  });

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<SttSearchItem>) => {
    if (!event.data) return;
    drawerRef.current?.open(event.data);
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    const startDateTime = startDate
      .hour(startTime?.hour() ?? 0)
      .minute(startTime?.minute() ?? 0)
      .second(startTime?.second() ?? 0);
    const endDateTime = endDate
      .hour(endTime?.hour() ?? 23)
      .minute(endTime?.minute() ?? 59)
      .second(endTime?.second() ?? 59);
    if (startDateTime.isAfter(endDateTime)) {
      toast.warning('시작일시가 종료일시보다 늦을 수 없습니다.');
      return;
    }
    setSearchParams(buildParams());
  };

  const columnDefs: ColDef<SttSearchItem>[] = [
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      headerName: '대표문장',
      field: 'startSentence',
      flex: 4,
      tooltipField: 'startSentence',
    },
    {
      headerName: '고유번호(UCID)',
      field: 'ucidGkey',
      flex: 3,
      tooltipField: 'ucidGkey',
    },
    {
      headerName: '통화시간',
      field: 'talkTime',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: '상담사',
      field: 'agentName',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: '내선번호',
      field: 'dnNo',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: 'I/O 구분',
      field: 'inoutKind',
      maxWidth: 130,
      flex: 1,
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 검색 조건 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={startDate} onChange={setStartDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={startTime} onChange={setStartTime} format="HH:mm:ss" allowClear={false} inputReadOnly needConfirm={false} style={{ width: 110 }} />
          <span className="text-[#495057]">-</span>
          <DatePicker value={endDate} onChange={setEndDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={endTime} onChange={setEndTime} format="HH:mm:ss" allowClear={false} inputReadOnly needConfirm={false} style={{ width: 110 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">키워드</span>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">고유번호</span>
          <Input value={ucidGkey} onChange={(e) => setUcidGkey(e.target.value)} onPressEnter={handleSearch} placeholder="고유번호를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">상담사명</span>
          <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} onPressEnter={handleSearch} placeholder="상담사를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
          <Input value={dnNo} onChange={(e) => setDnNo(e.target.value)} onPressEnter={handleSearch} placeholder="내선번호를 입력하세요" style={{ width: 160 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">IN/OUT 구분</span>
          <Select value={inOutType} onChange={setInOutType} options={IN_OUT_OPTIONS} popupMatchSelectWidth={false} style={{ width: 180 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<SttSearchItem>
          ref={gridRef}
          rowData={rowData ?? []}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
          }}
          onRowDoubleClicked={handleRowDoubleClicked}
          loading={isLoading}
          sideBar={false}
        />
      </div>

      <SttSearchDetailDrawer ref={drawerRef} />
    </div>
  );
}
