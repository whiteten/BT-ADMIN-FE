import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSummaryValueProps {
  /** 표시할 값. 비어 있으면(rawValue=false일 때) 회색 '-'로 대체된다. */
  value?: ReactNode;
  /** 입력 완료 여부. true면 초록 체크, false면 빨강 엑스 아이콘 표시. */
  valid: boolean;
  /** true면 value를 가공 없이 그대로 출력(색상 텍스트 등 커스텀 노드용). */
  rawValue?: boolean;
  /** 값 영역에 추가할 클래스(예: 'font-medium', 'truncate'). */
  className?: string;
}

const displayValue = (value: ReactNode): ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value;
};

/**
 * 입력 정보 요약 패널의 각 행 값 영역.
 * antd Descriptions.Item의 children으로 사용하며, 값과 입력 완료 여부 아이콘을 함께 렌더한다.
 */
const FormSummaryValue = ({ value, valid, rawValue = false, className }: FormSummaryValueProps) => {
  return (
    <div className="flex items-center w-full">
      <span className={cn('flex-1', className)}>{rawValue ? value : displayValue(value)}</span>
      {valid ? <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" /> : <X className="w-4 h-4 text-red-500 ml-2 shrink-0" />}
    </div>
  );
};

export default FormSummaryValue;
