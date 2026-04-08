import React, { useEffect, useMemo } from 'react';
import { Button, Checkbox, DatePicker, Divider, Input, Select, Slider } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download, Search } from 'lucide-react';
import { toast } from '@/shared-util';

const MAX_DAYS = 30;
const COMPLETE_ALL = 'all' as const;

import { useGetBotServices, useGetIntents } from '../hooks/useBotDialogHistoryQueries';
import type { BotDialogHistorySearchRequest, BotServiceDto, IntentDto } from '../types/botDialogHistory.types';

interface BotDialogHistorySearchFormProps {
  onSearch: (values: BotDialogHistorySearchRequest) => void;
  isLoading?: boolean;
  onExcelDownload?: () => void;
  isExporting?: boolean;
}

const BotDialogHistorySearchForm: React.FC<BotDialogHistorySearchFormProps> = ({ onSearch, isLoading, onExcelDownload, isExporting }) => {
  const [startDate, setStartDate] = React.useState<Dayjs>(dayjs().startOf('day'));
  const [endDate, setEndDate] = React.useState<Dayjs>(dayjs().endOf('day'));
  const [serviceIds, setServiceIds] = React.useState<number[]>([]);
  const [intentIds, setIntentIds] = React.useState<string[]>([]);
  const [confidenceRange, setConfidenceRange] = React.useState<[number, number]>([0, 100]);
  const [completeYn, setCompleteYn] = React.useState<string | number>(COMPLETE_ALL);
  const [ucid, setUcid] = React.useState<string>('');
  const [ani, setAni] = React.useState<string>('');

  const { data: botServices } = useGetBotServices();

  // 봇서비스 선택 시 의도 목록 조회
  const { data: intents } = useGetIntents({
    params: { serviceIds },
    queryOptions: { enabled: serviceIds.length > 0 },
  });

  // 봇서비스 변경 시 의도 선택 초기화
  useEffect(() => {
    setIntentIds([]);
  }, [serviceIds]);

  const botOptions = useMemo(
    () =>
      (botServices ?? []).map((bot: BotServiceDto) => ({
        label: bot.serviceName,
        value: bot.serviceId,
      })),
    [botServices],
  );

  const intentOptions = useMemo(
    () =>
      (intents ?? [])
        .filter((i) => Boolean(i?.intentId && i?.intentName))
        .map((intent: IntentDto) => ({
          label: intent.intentName,
          value: intent.intentId,
        })),
    [intents],
  );

  // 의도 옵션 로드 시 전체 자동 선택
  useEffect(() => {
    setIntentIds(intentOptions.map((o) => o.value));
  }, [intentOptions]);

  const handleSearch = () => {
    if (endDate.diff(startDate, 'day') > MAX_DAYS) {
      toast.warning(`조회 기간은 최대 ${MAX_DAYS}일까지 가능합니다.`);
      return;
    }
    const [confidenceMin, confidenceMax] = confidenceRange;
    onSearch({
      fromDate: startDate.format('YYYY-MM-DDTHH:mm:ss'),
      toDate: endDate.format('YYYY-MM-DDTHH:mm:ss'),
      serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
      intentIds: intentIds.length > 0 ? intentIds : undefined,
      confidenceMin: confidenceMin > 0 ? confidenceMin : undefined,
      confidenceMax: confidenceMax < 100 ? confidenceMax : undefined,
      completeYn: completeYn === COMPLETE_ALL ? undefined : (completeYn as number),
      ucid: ucid.trim() || undefined,
      ani: ani.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-5 bg-white bt-shadow mb-4">
      {/* 1행: 검색일자, 봇서비스, 의도, 신뢰구간 */}
      <div className="flex items-center gap-4">
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

        <Divider type="vertical" className="!h-5 !m-0" />

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
            className="w-[12rem]"
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">의도</span>
          <Select
            mode="multiple"
            value={intentIds}
            onChange={(value) => setIntentIds(value ?? [])}
            options={intentOptions}
            placeholder="전체"
            allowClear
            maxTagCount="responsive"
            className="w-[12rem]"
            showSearch
            optionFilterProp="label"
            popupMatchSelectWidth={false}
            dropdownRender={(menu) => (
              <>
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (intentIds.length === intentOptions.length) {
                      setIntentIds([]);
                    } else {
                      setIntentIds(intentOptions.map((o) => o.value));
                    }
                  }}
                >
                  <Checkbox
                    checked={intentIds.length === intentOptions.length && intentOptions.length > 0}
                    indeterminate={intentIds.length > 0 && intentIds.length < intentOptions.length}
                  />
                  <span className="text-sm">전체 선택</span>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                {menu}
              </>
            )}
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">신뢰구간</span>
          <Slider
            range
            min={0}
            max={100}
            step={1}
            value={confidenceRange}
            onChange={(value) => setConfidenceRange(value as [number, number])}
            tooltip={{ formatter: (value) => `${value}` }}
            className="!w-[200px]"
          />
        </div>
      </div>

      {/* 2행: 완결여부, UCID, 조회 버튼 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">완결여부</span>
          <Select
            value={completeYn}
            onChange={setCompleteYn}
            options={[
              { label: '전체', value: COMPLETE_ALL },
              { label: '완결', value: 1 },
              { label: '미완결', value: 0 },
            ]}
            className="w-28"
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">발신번호</span>
          <Input value={ani} onChange={(e) => setAni(e.target.value)} placeholder="발신번호 검색" className="w-40" onPressEnter={handleSearch} />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">UCID</span>
          <Input value={ucid} onChange={(e) => setUcid(e.target.value)} placeholder="UCID 검색" className="w-64" onPressEnter={handleSearch} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch} loading={isLoading} className="flex items-center gap-1 shrink-0">
            조회
          </Button>
          {onExcelDownload && (
            <Button
              type="primary"
              loading={isExporting}
              icon={<Download className="size-4" />}
              className="!bg-[#10B981] !border-[#10B981] hover:!bg-[#0FA968] flex items-center gap-1 shrink-0"
              onClick={onExcelDownload}
            >
              엑셀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotDialogHistorySearchForm;
