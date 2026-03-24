import React, { useMemo } from 'react';
import { Button, DatePicker, Divider, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';

const MAX_DAYS = 30;
import { useGetBotServices } from '../hooks/useHistoryQueries';
import type { BotServiceDto, CallbotHistorySearchRequest } from '../types/history.types';

interface CallbotHistorySearchFormProps {
  onSearch: (values: CallbotHistorySearchRequest) => void;
  isLoading?: boolean;
}

const CallbotHistorySearchForm: React.FC<CallbotHistorySearchFormProps> = ({ onSearch, isLoading }) => {
  const [startDate, setStartDate] = React.useState<Dayjs>(dayjs().startOf('day'));
  const [endDate, setEndDate] = React.useState<Dayjs>(dayjs().endOf('day'));
  const [serviceIds, setServiceIds] = React.useState<number[]>([]);
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
    if (endDate.diff(startDate, 'day') > MAX_DAYS) {
      toast.warning(`조회 기간은 최대 ${MAX_DAYS}일까지 가능합니다.`);
      return;
    }
    onSearch({
      fromDate: startDate.format('YYYY-MM-DDTHH:mm:ss'),
      toDate: endDate.format('YYYY-MM-DDTHH:mm:ss'),
      serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
      completeYn,
      ucid: ucid.trim() || undefined,
    });
  };

  return (
    <div className="flex items-center justify-between gap-2 p-5 bg-white bt-shadow mb-4">
      <div className="flex items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker
            value={startDate}
            onChange={(date) => date && setStartDate(date)}
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            disabledDate={(current) => current && current > dayjs().endOf('day')}
            inputReadOnly
            allowClear={false}
          />
          <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
          <DatePicker
            value={endDate}
            onChange={(date) => date && setEndDate(date)}
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            disabledDate={(current) => current && (current > dayjs().endOf('day') || current < startDate.startOf('day') || current > startDate.add(MAX_DAYS, 'day').endOf('day'))}
            inputReadOnly
            allowClear={false}
          />
        </div>

        <Divider orientation="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
          <Select
            mode="multiple"
            value={serviceIds}
            onChange={setServiceIds}
            options={botOptions}
            placeholder="전체"
            allowClear
            maxTagCount="responsive"
            className="min-w-[12rem]"
            showSearch
            optionFilterProp="label"
          />
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

      <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch} loading={isLoading} className="flex items-center gap-1 shrink-0">
        조회
      </Button>
    </div>
  );
};

export default CallbotHistorySearchForm;
