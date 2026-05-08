import React, { useEffect, useMemo } from 'react';
import { Button, Checkbox, DatePicker, Divider, Input, Select, Slider, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download, Search } from 'lucide-react';
import { toast } from '@/shared-util';

const MAX_DAYS = 30;
const COMPLETE_ALL = 'all' as const;
const MINUTE_STEP = 10;

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
  const [endDate, setEndDate] = React.useState<Dayjs>(dayjs().startOf('day'));
  const [startTime, setStartTime] = React.useState<Dayjs>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = React.useState<Dayjs>(dayjs().hour(23).minute(50));
  const [serviceIds, setServiceIds] = React.useState<number[]>([]);
  const [intentNames, setIntentNames] = React.useState<string[]>([]);
  const [confidenceRange, setConfidenceRange] = React.useState<[number, number]>([0, 100]);
  const [completeYn, setCompleteYn] = React.useState<string | number>(COMPLETE_ALL);
  const [ucid, setUcid] = React.useState<string>('');
  const [ani, setAni] = React.useState<string>('');

  const { data: botServices } = useGetBotServices();

  // 봇 선택 시 의도 목록 조회
  const { data: intents } = useGetIntents({
    params: { serviceIds },
    queryOptions: { enabled: serviceIds.length > 0 },
  });

  // 봇 변경 시 의도 선택 초기화
  useEffect(() => {
    setIntentNames([]);
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
          value: intent.intentName,
        })),
    [intents],
  );

  // 의도 옵션 로드 시 전체 자동 선택
  useEffect(() => {
    setIntentNames(intentOptions.map((o) => o.value));
  }, [intentOptions]);

  // startDate 변경 시 endDate 자동 조정 (이전 날짜이거나 MAX_DAYS 초과 시)
  useEffect(() => {
    if (endDate.isBefore(startDate, 'day')) {
      setEndDate(startDate);
    } else if (endDate.diff(startDate, 'day') > MAX_DAYS) {
      const maxEnd = startDate.add(MAX_DAYS, 'day');
      setEndDate(maxEnd.isAfter(dayjs(), 'day') ? dayjs().startOf('day') : maxEnd);
    }
  }, [startDate, endDate]);

  // 시작일자 DatePicker: 미래 비활성화
  const disabledStartDate = (current: Dayjs) => {
    if (!current) return false;
    return current.isAfter(dayjs(), 'day');
  };

  // 종료일자 DatePicker: 시작일자 이전 + MAX_DAYS 초과 + 미래 비활성화
  const disabledEndDate = (current: Dayjs) => {
    if (!current) return false;
    if (current.isAfter(dayjs(), 'day')) return true;
    if (current.isBefore(startDate, 'day')) return true;
    return current.diff(startDate, 'day') > MAX_DAYS;
  };

  // 날짜 + 시간 조합 (YYYY-MM-DDTHH:mm:00)
  const buildDateTime = (date: Dayjs, time: Dayjs, fallbackSec: string) => `${date.format('YYYY-MM-DD')}T${time.format('HH:mm')}:${fallbackSec}`;

  const handleSearch = () => {
    if (endDate.diff(startDate, 'day') > MAX_DAYS) {
      toast.warning(`조회 기간은 최대 ${MAX_DAYS}일까지 가능합니다.`);
      return;
    }

    const fromDate = buildDateTime(startDate, startTime, '00');
    const toDate = buildDateTime(endDate, endTime, '59');

    if (fromDate > toDate) {
      toast.warning('검색 시작일시가 종료일시보다 늦을 수 없습니다.');
      return;
    }

    const [confidenceMin, confidenceMax] = confidenceRange;
    onSearch({
      fromDate,
      toDate,
      serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
      intentNames: intentNames.length > 0 ? intentNames : undefined,
      confidenceMin: confidenceMin > 0 ? confidenceMin : undefined,
      confidenceMax: confidenceMax < 100 ? confidenceMax : undefined,
      completeYn: completeYn === COMPLETE_ALL ? undefined : (completeYn as number),
      ucid: ucid.trim() || undefined,
      ani: ani.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-5 bg-white bt-shadow mb-4">
      {/* 1행: 검색일자, 봇, 의도, 신뢰구간 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={startDate} onChange={(date) => date && setStartDate(date)} format="YYYY-MM-DD" disabledDate={disabledStartDate} inputReadOnly allowClear={false} />
          <TimePicker
            value={startTime}
            onChange={(date) => date && setStartTime(date)}
            format="HH:mm"
            minuteStep={MINUTE_STEP}
            inputReadOnly
            allowClear={false}
            style={{ width: '100px' }}
          />
          <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
          <DatePicker value={endDate} onChange={(date) => date && setEndDate(date)} format="YYYY-MM-DD" disabledDate={disabledEndDate} inputReadOnly allowClear={false} />
          <TimePicker
            value={endTime}
            onChange={(date) => date && setEndTime(date)}
            format="HH:mm"
            minuteStep={MINUTE_STEP}
            inputReadOnly
            allowClear={false}
            style={{ width: '100px' }}
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇</span>
          <Select
            mode="multiple"
            value={serviceIds}
            onChange={setServiceIds}
            options={botOptions}
            placeholder="전체"
            allowClear
            maxTagCount="responsive"
            showSearch
            optionFilterProp="label"
            style={{ width: '12rem' }}
          />
        </div>

        <Divider type="vertical" className="!h-5 !m-0" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">의도</span>
          <Select
            mode="multiple"
            value={intentNames}
            onChange={(value) => setIntentNames(value ?? [])}
            options={intentOptions}
            placeholder="전체"
            allowClear
            maxTagCount="responsive"
            showSearch
            optionFilterProp="label"
            style={{ width: '12rem' }}
            popupMatchSelectWidth={false}
            dropdownRender={(menu) => (
              <>
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (intentNames.length === intentOptions.length) {
                      setIntentNames([]);
                    } else {
                      setIntentNames(intentOptions.map((o) => o.value));
                    }
                  }}
                >
                  <Checkbox
                    checked={intentNames.length === intentOptions.length && intentOptions.length > 0}
                    indeterminate={intentNames.length > 0 && intentNames.length < intentOptions.length}
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

      {/* 2행: 완료여부, UCID, 조회 버튼 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">완료여부</span>
          <Select
            value={completeYn}
            onChange={setCompleteYn}
            options={[
              { label: '전체', value: COMPLETE_ALL },
              { label: '완료', value: 1 },
              { label: '미완료', value: 0 },
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
