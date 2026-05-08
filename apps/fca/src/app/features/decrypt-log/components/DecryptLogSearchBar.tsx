import React, { useState } from 'react';
import { Button, DatePicker, Divider, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetBotServices } from '../../tracking/hooks/useBotDialogHistoryQueries';
import type { BotServiceDto } from '../../tracking/types/botDialogHistory.types';
import { type DecryptLogSearchRequest, REASON_CODE_LABELS, RESULT_LABELS } from '../types/decryptLog.types';

const MAX_DAYS = 31;

interface DecryptLogSearchBarProps {
  onSearch: (params: DecryptLogSearchRequest) => void;
  isLoading?: boolean;
}

const RESULT_OPTIONS = [{ label: '전체', value: '' }, ...Object.entries(RESULT_LABELS).map(([code, label]) => ({ label, value: code }))];

const REASON_OPTIONS = [{ label: '전체', value: '' }, ...Object.entries(REASON_CODE_LABELS).map(([code, label]) => ({ label, value: code }))];

const DecryptLogSearchBar: React.FC<DecryptLogSearchBarProps> = ({ onSearch, isLoading }) => {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf('day'));
  const [userAccount, setUserAccount] = useState('');
  const [userNameKeyword, setUserNameKeyword] = useState('');
  const [ucid, setUcid] = useState('');
  const [serviceId, setServiceId] = useState<number | undefined>();
  const [result, setResult] = useState<string>('');
  const [reasonCode, setReasonCode] = useState<string>('');
  const [clientIp, setClientIp] = useState('');

  const { data: botServices } = useGetBotServices();
  const serviceOptions = [
    { label: '전체', value: undefined as unknown as number },
    ...((botServices ?? []) as BotServiceDto[]).map((bot) => ({ label: bot.serviceName, value: bot.serviceId })),
  ];

  const handleSearch = () => {
    if (endDate.diff(startDate, 'day') > MAX_DAYS) {
      toast.warning(`조회 기간은 최대 ${MAX_DAYS}일까지 가능합니다.`);
      return;
    }
    if (endDate.isBefore(startDate)) {
      toast.warning('종료일자가 시작일자보다 빠릅니다.');
      return;
    }
    onSearch({
      fromDate: startDate.format('YYYY-MM-DD'),
      toDate: endDate.format('YYYY-MM-DD'),
      userAccount: userAccount.trim() || undefined,
      userNameKeyword: userNameKeyword.trim() || undefined,
      ucid: ucid.trim() || undefined,
      serviceId,
      result: result || undefined,
      reasonCode: reasonCode || undefined,
      clientIp: clientIp.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1행: 시간 범위, 봇, 결과, 사유 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">열람일자</span>
          <DatePicker
            value={startDate}
            onChange={(date) => date && setStartDate(date.startOf('day'))}
            format="YYYY-MM-DD"
            disabledDate={(current) => current && current > dayjs().endOf('day')}
            inputReadOnly
            allowClear={false}
          />
          <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
          <DatePicker
            value={endDate}
            onChange={(date) => date && setEndDate(date.endOf('day'))}
            format="YYYY-MM-DD"
            disabledDate={(current) => current && (current > dayjs().endOf('day') || current < startDate.startOf('day') || current > startDate.add(MAX_DAYS, 'day').endOf('day'))}
            inputReadOnly
            allowClear={false}
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇</span>
          <Select
            value={serviceId}
            onChange={(v) => setServiceId(v)}
            options={serviceOptions}
            placeholder="전체"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: '14rem' }}
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">결과</span>
          <Select value={result} onChange={setResult} options={RESULT_OPTIONS} className="w-32" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">사유</span>
          <Select value={reasonCode} onChange={setReasonCode} options={REASON_OPTIONS} className="w-32" />
        </div>
      </div>

      {/* 2행: 열람자/UCID/IP + 조회 버튼 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">열람자 ID</span>
          <Input
            value={userAccount}
            onChange={(e) => setUserAccount(e.target.value)}
            placeholder="로그인 계정 (완전일치)"
            className="w-44"
            onPressEnter={handleSearch}
            allowClear
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">열람자명</span>
          <Input value={userNameKeyword} onChange={(e) => setUserNameKeyword(e.target.value)} placeholder="이름 부분일치" className="w-40" onPressEnter={handleSearch} allowClear />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">UCID</span>
          <Input value={ucid} onChange={(e) => setUcid(e.target.value)} placeholder="UCID 검색" className="w-64" onPressEnter={handleSearch} allowClear />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">IP</span>
          <Input value={clientIp} onChange={(e) => setClientIp(e.target.value)} placeholder="클라이언트 IP" className="w-36" onPressEnter={handleSearch} allowClear />
        </div>

        <div className="ml-auto">
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch} loading={isLoading} className="flex items-center gap-1 shrink-0">
            조회
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DecryptLogSearchBar;
