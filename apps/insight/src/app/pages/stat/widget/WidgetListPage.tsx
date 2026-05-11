import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { MoreHorizontal, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useDeleteWidget, useGetWidgetList } from '../../../features/stat/hooks/useStatQueries';
import type { WidgetItem, WidgetVisualization } from '../../../features/stat/types/widget';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ label: '통계' }, { label: '보고서 목록' }];

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'FCA', label: 'FCA' },
  { value: 'IC', label: 'IC' },
  { value: 'IR', label: 'IR' },
  { value: 'IE', label: 'IE' },
  { value: 'AI', label: 'AI' },
  { value: 'COMMON', label: '공통' },
];

function MiniChartPreview({ visualization }: { visualization?: WidgetVisualization }) {
  if (visualization === 'LINE') {
    return (
      <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
        <path d="M0,30 L20,20 L40,25 L60,10 L80,15 L100,5" stroke="#085fb5" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (visualization === 'PIE' || visualization === 'DONUT') {
    const inner = visualization === 'DONUT' ? 14 : 0;
    return (
      <div className="flex h-full w-full items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-10 w-10">
          <circle cx="20" cy="20" r="18" fill="transparent" stroke="#085fb5" strokeWidth={20 - inner} strokeDasharray="70 40" strokeDashoffset="-10" />
          <circle cx="20" cy="20" r="18" fill="transparent" stroke="#4892d3" strokeWidth={20 - inner} strokeDasharray="40 70" strokeDashoffset="-80" />
          {inner > 0 && <circle cx="20" cy="20" r={inner} fill="white" />}
        </svg>
      </div>
    );
  }
  const bars = [8, 12, 6, 14, 10, 9, 13, 16];
  return (
    <div className="flex h-full w-full items-end gap-1">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 4}px`, backgroundColor: '#085fb5', opacity: 0.3 + i * 0.08 }} />
      ))}
    </div>
  );
}

function StatusBadge({ widget }: { widget: WidgetItem }) {
  if (widget.widgetType === 'SYSTEM') {
    return <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">시스템</span>;
  }
  return <span className="inline-flex items-center rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600">초안</span>;
}

function ReportCard({ widget, onEdit, onDelete }: { widget: WidgetItem; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative cursor-pointer rounded border border-gray-200 bg-white p-4 transition hover:border-blue-500 hover:shadow" onDoubleClick={onEdit}>
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <StatusBadge widget={widget} />
        <div className="relative">
          <button
            className="rounded p-1 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 w-28 rounded border bg-white shadow-md text-[12px]">
              <button
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                편집
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-red-500 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-[14px] font-semibold leading-tight">{widget.widgetName}</div>
      <div className="mt-1 text-[11px] text-gray-400">
        {widget.dataSources?.length ?? 0}개 데이터소스 · {widget.category}
      </div>

      {/* Mini chart */}
      <div className="mt-3 h-14">
        <MiniChartPreview visualization={widget.visualization} />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
        <span>{widget.createdBy}</span>
        <span>{widget.updatedAt ? new Date(widget.updatedAt).toLocaleDateString('ko-KR') : new Date(widget.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
    </div>
  );
}

export default function WidgetListPage() {
  const navigate = useNavigate();
  const modal = useModal();

  const [category, setCategory] = useState('');
  const [searchText, setSearchText] = useState('');

  const params: Record<string, unknown> = {};
  if (category) params.category = category;

  const { data: widgetList = [], isLoading, refetch } = useGetWidgetList({ params });

  const deleteMutation = useDeleteWidget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('보고서가 삭제되었습니다.');
        refetch();
      },
      onError: () => toast.error('보고서 삭제에 실패했습니다.'),
    },
  });

  const filteredList = searchText ? widgetList.filter((w) => w.widgetName.toLowerCase().includes(searchText.toLowerCase())) : widgetList;

  const handleDelete = (item: WidgetItem) => {
    modal.confirm.delete({ onOk: () => deleteMutation.mutate({ widgetId: item.widgetId }) });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col gap-5 w-full bg-white bt-shadow p-5">
        {/* Toolbar */}
        <header className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-3">
            <Input prefix={<Search size={14} />} placeholder="이름 검색…" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-52" allowClear />
            <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} style={{ width: 120 }} placeholder="전체" popupMatchSelectWidth={false} />
            <span className="text-[12px] text-gray-400 whitespace-nowrap">사용자 보고서 {filteredList.length}개</span>
          </div>
          <Button type="primary" onClick={() => navigate('/insight/stat/widget/create')}>
            + 새 보고서
          </Button>
        </header>

        {/* Card grid */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredList.map((widget) => (
              <ReportCard key={widget.widgetId} widget={widget} onEdit={() => navigate(`/insight/stat/widget/${widget.widgetId}/edit`)} onDelete={() => handleDelete(widget)} />
            ))}
            {/* New report card */}
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-gray-200 bg-white p-4 transition hover:border-blue-500 hover:bg-blue-50/30"
              onClick={() => navigate('/insight/stat/widget/create')}
            >
              <div className="text-[24px] font-light text-gray-300">+</div>
              <div className="text-[12px] font-medium text-gray-400">새 보고서</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
