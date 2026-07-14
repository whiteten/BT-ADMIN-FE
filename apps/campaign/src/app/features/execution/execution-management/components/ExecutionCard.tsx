import { Checkbox, Tag } from 'antd';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { EXECUTION_CARD_WIDTH, EXECUTION_STATUS_COLORS, EXECUTION_STATUS_LABELS } from '../constants/executionManagementConstants';
import type { CampaignExecutionItem, ExecutionStatus } from '../types';
import ExecutionCardStatusGrid from './ExecutionCardStatusGrid';

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const formatNumber = (value?: number) => (value != null ? value.toLocaleString() : '-');

function ExecutionStatusTag({ status }: { status: ExecutionStatus }) {
  const colors = EXECUTION_STATUS_COLORS[status];
  return (
    <Tag
      style={{
        color: colors.color,
        backgroundColor: colors.bgColor,
        borderColor: colors.borderColor,
        marginInlineEnd: 0,
      }}
    >
      {EXECUTION_STATUS_LABELS[status]}
    </Tag>
  );
}

interface ExecutionCardProps {
  item: CampaignExecutionItem;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onCheckedChange: (checked: boolean) => void;
  onDetail: () => void;
}

export default function ExecutionCard({ item, selected, checked, onSelect, onCheckedChange, onDetail }: ExecutionCardProps) {
  return (
    <div
      id={`exec-card-${item.executionId}`}
      style={{ width: EXECUTION_CARD_WIDTH }}
      className={`shrink-0 rounded-lg border p-4 transition-colors ${
        selected ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Checkbox checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#405189]"
          onClick={(e) => {
            e.stopPropagation();
            onDetail();
          }}
          aria-label="캠페인 실행 상세보기"
        >
          <Search className="size-4" />
        </button>
      </div>

      <button type="button" onClick={onSelect} className="w-full cursor-pointer text-left">
        <div className="flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-gray-500">실행일자</span>
              <span className="font-medium text-gray-800">{item.executionDate}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">상태</span>
              <ExecutionStatusTag status={item.status} />
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <span className="text-[11px] text-gray-500">시나리오</span>
              <span className="truncate font-medium text-gray-800" title={item.scenarioName}>
                {item.scenarioName}
              </span>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <span className="text-[11px] text-gray-500">캠페인명</span>
              <span className="truncate text-gray-800" title={item.campaignName}>
                {item.campaignName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">채널</span>
              <span className="font-medium text-gray-800">{item.channel}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">차수</span>
              <span className="font-medium text-gray-800">{item.round}차</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">대상 / 완료</span>
              <span className="font-medium text-gray-800">
                {formatNumber(item.targetCount)} / {formatNumber(item.completedCount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">진행률</span>
              <span className="font-medium text-gray-800">{item.progressRatePct}%</span>
            </div>
          </div>

          <ExecutionCardStatusGrid item={item} />

          <div className="flex flex-col gap-0.5 border-t border-gray-100 pt-1">
            <span className="text-[11px] text-gray-500">처리시작</span>
            <span className="text-gray-700">{formatDateTime(item.processStartTime)}</span>
          </div>
        </div>
      </button>
    </div>
  );
}
