import { Tag } from 'antd';
import CanvasLayout from './CanvasLayout';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-bt-fg)]">{report.title}</span>
          <Tag color="blue">{report.domain}</Tag>
          {report.isPublished && <Tag color="success">메뉴 등록됨</Tag>}
        </div>
        <div className="text-xs text-[var(--color-bt-fg-muted)]">
          데이터셋: <span className="font-mono">{report.datasourceKey}</span>
        </div>
      </div>

      {/* 글로벌 필터 */}
      <GlobalFilter reportId={reportId} mode="view" />

      {/* 캔버스 */}
      <div className="flex-1 overflow-auto">
        <CanvasLayout reportId={reportId} mode="view" />
      </div>
    </div>
  );
}
