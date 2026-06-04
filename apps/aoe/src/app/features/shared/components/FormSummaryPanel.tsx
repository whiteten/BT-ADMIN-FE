import type { ReactNode } from 'react';
import { Descriptions, type DescriptionsProps } from 'antd';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface FormSummaryPanelProps {
  /** 패널 제목. 기본 '입력 정보 요약'. */
  title?: ReactNode;
  /** true면 본문 대신 스피너를 중앙 정렬로 표시. */
  loading?: boolean;
  /** 요약 행 목록. 각 행의 children에는 FormSummaryValue를 사용한다. */
  items: DescriptionsProps['items'];
}

/**
 * 생성/수정 화면 우측의 "입력 정보 요약" 패널.
 * 400px 고정폭 사이드바(xl 이상에서만 노출) + antd Descriptions(1열) 기반 라벨-값 목록.
 */
const FormSummaryPanel = ({ title = '입력 정보 요약', loading = false, items }: FormSummaryPanelProps) => {
  return (
    <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
      <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">{title}</div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <Descriptions column={1} colon={false} size="small" items={items} />
        )}
      </div>
    </div>
  );
};

export default FormSummaryPanel;
