import { useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { Pencil } from 'lucide-react';
import CanvasLayout from './CanvasLayout';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import { DOMAIN_TAG_COLOR } from '../../report/constants/reportIconConstants';
import type { ReportFullDetail } from '../../report/types';

interface ReportViewCanvasProps {
  reportId: number;
  report: ReportFullDetail;
}

export default function ReportViewCanvas({ reportId, report }: ReportViewCanvasProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* 뷰 모드 헤더 */}
      <div className="flex items-center justify-between w-full bg-white bt-shadow px-7 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-bt-fg)]">{report.title}</span>
          <Tag color={DOMAIN_TAG_COLOR[report.domain] ?? 'blue'}>{report.domain}</Tag>
          {report.isPublished && <Tag color="success">메뉴 등록됨</Tag>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-bt-fg-muted)]">
            데이터셋: <span className="font-mono">{report.datasourceKey}</span>
          </span>
          <Button icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => navigate(`/insight/statistics/reports/${reportId}/edit`)}>
            보고서 편집
          </Button>
        </div>
      </div>

      {/* 글로벌 필터 */}
      <GlobalFilter reportId={reportId} mode="view" />

      {/* 캔버스 */}
      <div className="flex-1 overflow-auto">
        <CanvasLayout reportId={reportId} mode="view" datasourceKey={report.datasourceKey} />
      </div>
    </div>
  );
}
