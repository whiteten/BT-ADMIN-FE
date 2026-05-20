import CanvasLayout from './CanvasLayout';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import type { ReportFullDetail } from '../../report/types';
import { Badge } from '@/components/ui/badge';

interface ReportViewCanvasProps {
  reportId: number;
  report: ReportFullDetail;
}

export default function ReportViewCanvas({ reportId, report }: ReportViewCanvasProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 뷰 모드 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-bt-border">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold">{report.title}</span>
          <Badge variant="outline" className="text-[10px] text-bt-primary border-bt-primary">
            {report.domain}
          </Badge>
          {report.isPublished && <Badge className="text-[10px] bg-bt-success-soft text-bt-success border-0">메뉴 등록됨</Badge>}
        </div>
        <div className="text-[11px] text-bt-fg-muted">
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
