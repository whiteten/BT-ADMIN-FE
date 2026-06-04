import { useRef } from 'react';
import { Button, Tag, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import CanvasLayout, { type CanvasLayoutRef } from './CanvasLayout';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../report/constants/reportIconConstants';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useUpdateReport } from '../../report/hooks/useReportQueries';

interface ReportEditorCanvasProps {
  reportId: number;
  onNavigateList(): void;
}

export default function ReportEditorCanvas({ reportId, onNavigateList: _onNavigateList }: ReportEditorCanvasProps) {
  const { report, isDirty, setReport } = useReportEditorStore();
  const canvasRef = useRef<CanvasLayoutRef>(null);

  const { mutate: updateReport } = useUpdateReport({
    mutationOptions: {
      onSuccess: (updated) => {
        setReport(updated);
        toast.success('보고서명이 수정되었습니다.');
      },
      onError: () => toast.error('보고서명 수정에 실패했습니다.'),
    },
  });

  const handleTitleChange = (value: string) => {
    const next = value.trim();
    if (!report || !next || next === report.title) return;
    setReport({ ...report, title: next }); // 낙관적 반영
    updateReport({
      reportId,
      data: { title: next, domain: report.domain, datasetId: report.datasetId, description: report.description ?? undefined, iconType: report.iconType },
    });
  };

  if (!report) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-2 min-w-0">
          <Typography.Title
            level={4}
            className="!mb-0 min-w-0 truncate"
            editable={{ onChange: handleTitleChange, triggerType: ['icon', 'text'], tooltip: '클릭하여 보고서명 수정', maxLength: 100 }}
          >
            {report.title}
          </Typography.Title>
          <Tag color={DOMAIN_TAG_COLOR[report.domain]} className="!mb-0 shrink-0">
            {report.domain} · {DOMAIN_LABELS[report.domain] ?? report.domain}
          </Tag>
          {isDirty && (
            <Tag color="warning" className="!mb-0 shrink-0">
              미저장
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => canvasRef.current?.openAddArea()}>
            영역 추가
          </Button>
        </div>
      </div>

      <GlobalFilter reportId={reportId} mode="editor" />

      <div className="flex-1 overflow-auto">
        <CanvasLayout ref={canvasRef} reportId={reportId} mode="edit" datasetId={report.datasetId} />
      </div>
    </div>
  );
}
