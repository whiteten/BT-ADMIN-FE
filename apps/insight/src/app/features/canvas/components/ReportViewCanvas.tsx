import { Tag, Typography } from 'antd';
import CanvasLayout from './CanvasLayout';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import { DOMAIN_TAG_COLOR } from '../../report/constants/reportIconConstants';
import type { ReportFullDetail } from '../../report/types';

interface ReportViewCanvasProps {
  reportId: number;
  report: ReportFullDetail;
}

export default function ReportViewCanvas({ reportId, report }: ReportViewCanvasProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 뷰 모드 헤더 */}
      <div className="flex items-center justify-between w-full bg-white bt-shadow px-7 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <Typography.Title level={4} className="!mb-0 min-w-0 truncate">
            {report.title}
          </Typography.Title>
          <Tag color={DOMAIN_TAG_COLOR[report.domain] ?? 'blue'} className="!mb-0 shrink-0">
            {report.domain}
          </Tag>
        </div>
      </div>

      {/* 글로벌 필터 */}
      <GlobalFilter reportId={reportId} mode="view" />

      {/* 캔버스 */}
      <div className="flex-1 overflow-auto">
        <CanvasLayout reportId={reportId} mode="view" datasetId={report.datasetId} />
      </div>
    </div>
  );
}
