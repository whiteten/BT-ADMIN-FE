import { useState } from 'react';
import { Eye, Globe } from 'lucide-react';
import CanvasLayout from './CanvasLayout';
import { useReportEditorStore } from '../../../stores/useReportEditorStore';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import PublishDialog from '../../report/components/PublishDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ReportEditorCanvasProps {
  reportId: number;
  onNavigateList(): void;
}

export default function ReportEditorCanvas({ reportId, onNavigateList }: ReportEditorCanvasProps) {
  const { report, isDirty } = useReportEditorStore();
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  if (!report) return null;

  return (
    <div className="flex flex-col h-full">
      {/* 편집 모드 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-bt-border">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold">{report.title}</span>
          <Badge variant="outline" className="text-[10px] text-bt-primary border-bt-primary">
            {report.domain}
          </Badge>
          {isDirty && <span className="text-[10px] text-bt-warn">● 미저장 변경사항</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-[11px] h-7">
            <Eye className="w-3 h-3 mr-1" />
            미리보기
          </Button>
          <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[11px] h-7" onClick={() => setIsPublishDialogOpen(true)}>
            <Globe className="w-3 h-3 mr-1" />
            {report.isPublished ? '메뉴 등록됨 ✓' : '메뉴 등록'}
          </Button>
        </div>
      </div>

      {/* 글로벌 필터 */}
      <GlobalFilter reportId={reportId} mode="editor" />

      {/* 캔버스 */}
      <div className="flex-1 overflow-auto">
        <CanvasLayout reportId={reportId} mode="edit" />
      </div>

      {/* 발행 다이얼로그 */}
      {isPublishDialogOpen && <PublishDialog reportId={reportId} onClose={() => setIsPublishDialogOpen(false)} />}
    </div>
  );
}
