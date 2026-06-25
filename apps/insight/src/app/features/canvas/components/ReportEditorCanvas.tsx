import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Popover, Tag, Typography } from 'antd';
import { Check, Pencil, Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import CanvasLayout, { type CanvasLayoutRef } from './CanvasLayout';
import TagInput from '../../../components/TagInput';
import GlobalFilter from '../../global-filter/components/GlobalFilter';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useUpdateReport } from '../../report/hooks/useReportQueries';

interface ReportEditorCanvasProps {
  reportId: number;
  onNavigateList(): void;
}

export default function ReportEditorCanvas({ reportId, onNavigateList: _onNavigateList }: ReportEditorCanvasProps) {
  const navigate = useNavigate();
  const { report, isDirty, setReport, setDirty } = useReportEditorStore();
  const canvasRef = useRef<CanvasLayoutRef>(null);
  // 패널 편집 오버레이 열림 — 열리면 보고서 헤더·검색바 숨김(데이터셋 상세처럼 편집 화면만 보이게)
  const [panelEditing, setPanelEditing] = useState(false);
  // 헤더 인라인 태그 편집 — Popover + 임시 초안
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);

  const { mutate: updateReport, isPending: isSaving } = useUpdateReport({
    mutationOptions: {
      onSuccess: (updated) => {
        setReport(updated);
        setDirty(false);
        toast.success('보고서가 저장되었습니다.');
        // 저장 완료 후 보기 화면으로 이동(= '적용')
        navigate(`/insight/statistics/reports/view?reportId=${reportId}`);
      },
      onError: () => toast.error('보고서 저장에 실패했습니다.'),
    },
  });

  // 제목·태그는 즉시 서버 저장하지 않고 로컬(스토어)에만 반영 + 미저장 표시.
  // 실제 저장은 '적용' 버튼(handleApply)에서 일괄 수행한다.
  const handleTitleChange = (value: string) => {
    const next = value.trim();
    if (!report || !next || next === report.title) return;
    setReport({ ...report, title: next });
    setDirty(true);
  };

  // 태그 Popover 열고 닫힘 — 열 때 현재 태그로 초안 초기화, 닫을 때 변경분만 로컬 반영
  const handleTagPopoverOpenChange = (open: boolean) => {
    if (open) {
      setDraftTags(report?.tags ?? []);
      setTagPopoverOpen(true);
      return;
    }
    setTagPopoverOpen(false);
    if (!report) return;
    const cur = report.tags ?? [];
    const changed = cur.length !== draftTags.length || cur.some((t, i) => t !== draftTags[i]);
    if (changed) {
      setReport({ ...report, tags: draftTags });
      setDirty(true);
    }
  };

  // '적용' — 로컬 편집(제목·태그)을 서버에 저장하고 보기 화면으로 이동
  const handleApply = () => {
    if (!report) return;
    updateReport({
      reportId,
      data: {
        title: report.title,
        tags: report.tags,
        datasetId: report.datasetId,
        description: report.description ?? undefined,
        iconType: report.iconType,
      },
    });
  };

  if (!report) return null;

  return (
    <div className="flex flex-col h-full">
      {!panelEditing && (
        <>
          <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
            <div className="flex items-center gap-2 min-w-0">
              <Typography.Title
                level={4}
                className="!mb-0 min-w-0 truncate"
                editable={{ onChange: handleTitleChange, triggerType: ['icon', 'text'], tooltip: '클릭하여 보고서명 수정', maxLength: 100 }}
              >
                {report.title}
              </Typography.Title>
              <Popover
                open={tagPopoverOpen}
                onOpenChange={handleTagPopoverOpenChange}
                trigger="click"
                placement="bottomLeft"
                content={
                  <div className="w-[280px]">
                    <div className="mb-1.5 text-xs font-medium text-gray-500">태그 (최대 5개)</div>
                    <TagInput value={draftTags} onChange={setDraftTags} maxTags={5} />
                  </div>
                }
              >
                <button
                  type="button"
                  title="클릭하여 태그 수정"
                  className="group/tags flex shrink-0 items-center gap-1 rounded border border-dashed border-gray-300 px-1.5 py-0.5 transition-colors hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]"
                >
                  {(report.tags ?? []).length > 0 ? (
                    (report.tags ?? []).map((t) => (
                      <Tag key={t} color="blue" className="!mb-0 !mr-0 shrink-0">
                        {t}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">태그 추가</span>
                  )}
                  <Pencil className="size-3 text-gray-400 transition-colors group-hover/tags:text-[var(--color-bt-primary)]" />
                </button>
              </Popover>
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
              <Button type="primary" icon={<Check className="w-3.5 h-3.5" />} loading={isSaving} onClick={handleApply}>
                적용
              </Button>
            </div>
          </div>

          <GlobalFilter reportId={reportId} mode="editor" />
        </>
      )}

      <div className="flex-1 overflow-auto">
        <CanvasLayout ref={canvasRef} reportId={reportId} mode="edit" datasetId={report.datasetId} onEditorOpenChange={setPanelEditing} />
      </div>
    </div>
  );
}
