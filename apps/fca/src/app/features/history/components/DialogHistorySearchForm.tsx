import React, { useMemo } from 'react';
import { Button, DatePicker, Divider, Input, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download, Search } from 'lucide-react';
import { useGetBotServices } from '../hooks/useHistoryQueries';
import type { BotServiceDto, DialogHistorySearchRequest } from '../types/history.types';

const { RangePicker } = DatePicker;

interface DialogHistorySearchFormProps {
  onSearch: (values: DialogHistorySearchRequest) => void;
  onExcelDownload: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
}

const DialogHistorySearchForm: React.FC<DialogHistorySearchFormProps> = ({ onSearch, onExcelDownload, isLoading, isExporting }) => {
  const [dates, setDates] = React.useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [serviceId, setServiceId] = React.useState<number | undefined>();
  const [completeYn, setCompleteYn] = React.useState<number | undefined>();
  const [ucid, setUcid] = React.useState<string>('');

  const { data: botServices } = useGetBotServices();

  const botOptions = useMemo(
    () =>
      (botServices ?? []).map((bot: BotServiceDto) => ({
        label: bot.serviceName,
        value: bot.serviceId,
      })),
    [botServices],
  );

  const handleSearch = () => {
    onSearch({
      fromDate: dates[0].format('YYYY-MM-DD'),
      toDate: dates[1].format('YYYY-MM-DD'),
      serviceId,
      completeYn,
      ucid: ucid.trim() || undefined,
    });
  };

  return (
    <div className="flex items-center justify-between gap-2 p-5 bg-white bt-shadow mb-4">
      <div className="flex items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <RangePicker value={dates} onChange={(val) => val && setDates([val[0]!, val[1]!])} format="YYYY-MM-DD" allowClear={false} />
        </div>

        <Divider orientation="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
          <Select value={serviceId} onChange={setServiceId} options={botOptions} placeholder="전체" allowClear className="w-48" showSearch optionFilterProp="label" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">완결여부</span>
          <Select
            value={completeYn}
            onChange={setCompleteYn}
            options={[
              { label: '전체', value: undefined },
              { label: '완결', value: 1 },
              { label: '미완결', value: 0 },
            ]}
            className="w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">UCID</span>
          <Input value={ucid} onChange={(e) => setUcid(e.target.value)} placeholder="UCID 검색" className="w-64" onPressEnter={handleSearch} />
        </div>
      </div>

      <Space size="small" className="shrink-0">
        <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch} loading={isLoading} className="flex items-center gap-1">
          조회
        </Button>
        <Button
          type="primary"
          icon={<Download className="size-4" />}
          onClick={onExcelDownload}
          loading={isExporting}
          className="!bg-[#10B981] !border-[#10B981] hover:!bg-[#0FA968] flex items-center gap-1"
        >
          엑셀
        </Button>
      </Space>
    </div>
  );
};

export default DialogHistorySearchForm;
