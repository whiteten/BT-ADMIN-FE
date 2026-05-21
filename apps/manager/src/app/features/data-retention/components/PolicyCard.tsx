import React from 'react';
import { Pencil } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { RETENTION_PRODUCT_CODE_LABELS, type RetentionPolicyListItem } from '../types';
import { cn } from '@/lib/utils';

export interface PolicyCardProps {
  policy: RetentionPolicyListItem;
  selected: boolean;
  onSelect: (policy: RetentionPolicyListItem) => void;
  onEdit: (policy: RetentionPolicyListItem) => void;
}

const PolicyCard = ({ policy, selected, onSelect, onEdit }: PolicyCardProps) => {
  const handleDoubleClick = () => {
    onEdit(policy);
  };

  const handleEditButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(policy);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col w-[220px] min-w-[220px] h-full gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md select-none',
        selected ? 'border-[var(--color-bt-primary)] bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
      )}
      onClick={() => onSelect(policy)}
      onDoubleClick={handleDoubleClick}
    >
      {/* 수정 버튼 */}
      <button
        type="button"
        className="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-[var(--color-bt-primary)] hover:bg-blue-50 transition-colors"
        onClick={handleEditButtonClick}
        title="편집 (더블클릭)"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* 제품 배지 + 정책명 */}
      <div className="pr-8">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 mb-1.5">
          {RETENTION_PRODUCT_CODE_LABELS[policy.productCode]}
        </span>
        <p className="text-sm font-semibold text-gray-900 leading-tight">{policy.policyName}</p>
        {policy.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{policy.description}</p>}
      </div>

      <div className="border-t border-gray-100" />

      {/* 주요 정보 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">보관기간</span>
          <span className="text-xs font-semibold text-gray-800">{policy.retentionMonths}개월</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">실행시각</span>
          <span className="text-xs font-semibold text-gray-800">매일 {policy.executionTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">대상 테이블</span>
          <span className="text-xs font-semibold text-gray-800">{policy.targetCount}개</span>
        </div>
      </div>
    </div>
  );
};

export default PolicyCard;
