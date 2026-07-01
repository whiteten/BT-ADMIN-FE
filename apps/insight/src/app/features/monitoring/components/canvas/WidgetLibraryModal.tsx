import { type ReactNode, useMemo, useState } from 'react';
import { Badge, Input, Modal, Skeleton, Tabs, Tag } from 'antd';
import { LayoutGrid, Plus, Search, Tags, X } from 'lucide-react';
import { VIZ_LABELS } from '../../constants/monitoringConstants';
import { useGetCustomWidgetCatalog } from '../../hooks/useDashboardQueries';
import { useGetTemplateWidgets } from '../../hooks/useTemplateWidgetQueries';
import type { CustomWidgetCatalogItem, TemplateWidgetDefinitionListItem, VizType } from '../../types';

interface WidgetLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onAddTemplate: (def: TemplateWidgetDefinitionListItem) => void;
  onAddCustom: (widget: CustomWidgetCatalogItem) => void;
}

/** 위젯 목록에서 태그 빈도 내림차순 집계. */
const collectTags = (items: { tags?: string[] }[]): string[] => {
  const counts: Record<string, number> = {};
  items.forEach((i) => (i.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
};

/**
 * 위젯 라이브러리 모달 — 대시보드 구성 시 추가할 위젯을 고른다.
 * 탭으로 "커스텀 위젯"(BE 구현체 카탈로그)과 "템플릿 위젯"(데이터셋 기반 저장 정의)을 구분.
 * 도메인 그룹핑 없이 평면 카드 그리드 + 태그 필터 칩(AND)으로 탐색.
 */
export default function WidgetLibraryModal({ open, onClose, onAddTemplate, onAddCustom }: WidgetLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'custom' | 'template'>('custom');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const { data: customItems = [], isLoading: isCustomLoading } = useGetCustomWidgetCatalog({ queryOptions: { enabled: open } });
  const { data: templateItems = [], isLoading: isTemplateLoading } = useGetTemplateWidgets({ queryOptions: { enabled: open } });

  const kw = searchValue.toLowerCase().trim();

  // 현재 탭의 전체 태그(빈도순) — 칩 필터 소스
  const tabTags = useMemo(() => collectTags(activeTab === 'custom' ? customItems : templateItems), [activeTab, customItems, templateItems]);

  const tagList = useMemo(() => [...selectedTags], [selectedTags]);

  const filteredCustom = useMemo(
    () =>
      customItems.filter(
        (w) =>
          (tagList.length === 0 || tagList.every((t) => (w.tags ?? []).includes(t))) &&
          (!kw || w.widgetName.toLowerCase().includes(kw) || (w.description ?? '').toLowerCase().includes(kw)),
      ),
    [customItems, kw, tagList],
  );
  const filteredTemplate = useMemo(
    () =>
      templateItems.filter(
        (t) =>
          (tagList.length === 0 || tagList.every((tag) => (t.tags ?? []).includes(tag))) &&
          (!kw || t.widgetName.toLowerCase().includes(kw) || (t.description ?? '').toLowerCase().includes(kw) || (t.datasetName ?? '').toLowerCase().includes(kw)),
      ),
    [templateItems, kw, tagList],
  );

  const isLoading = activeTab === 'custom' ? isCustomLoading : isTemplateLoading;
  const count = activeTab === 'custom' ? filteredCustom.length : filteredTemplate.length;

  const switchTab = (k: 'custom' | 'template') => {
    setActiveTab(k);
    setSelectedTags(new Set());
  };

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const renderTagPills = (tags?: string[]) =>
    (tags ?? []).map((t) => (
      <span key={t} className="rounded bg-[#f1f3f5] px-1.5 py-0.5 text-[10px] font-medium text-[#868e96]">
        {t}
      </span>
    ));

  const renderCard = (key: string, name: string, description: string | undefined, meta: ReactNode, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="group relative flex flex-col bg-white border border-[#dee2e6] rounded-2xl p-6 text-left transition-all hover:border-[#085fb5] hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f9fa] text-[#adb5bd] border border-[#f1f3f5] group-hover:bg-[#e7f0fa] group-hover:text-[#085fb5] group-hover:border-transparent transition-all shadow-sm">
        <LayoutGrid className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[15px] font-bold text-[#495057] group-hover:text-[#085fb5] transition-colors truncate pr-12">{name}</span>
        </div>
        <p className="text-[12.5px] text-[#868e96] leading-relaxed line-clamp-2">{description || '이 위젯에 대한 설명이 없습니다.'}</p>
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">{meta}</div>
      </div>
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-[#085fb5] text-white p-1.5 rounded-lg shadow-lg">
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </div>
    </button>
  );

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-[#dee2e6] space-y-4">
              <Skeleton.Button active block style={{ height: 48, borderRadius: 12 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      );
    }

    if (count === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center py-20">
          <Badge
            status="default"
            text={
              <span className="text-[14px] text-[#adb5bd]">
                {selectedTags.size > 0 || kw ? '조건에 맞는 위젯이 없습니다.' : activeTab === 'custom' ? '등록된 커스텀 위젯이 없습니다.' : '등록된 템플릿 위젯이 없습니다.'}
              </span>
            }
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeTab === 'custom'
          ? filteredCustom.map((widget) =>
              renderCard(
                widget.widgetTypeId,
                widget.widgetName,
                widget.description,
                <>
                  {renderTagPills(widget.tags)}
                  {widget.widgetCategory && <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mono">{widget.widgetCategory}</span>}
                </>,
                () => onAddCustom(widget),
              ),
            )
          : filteredTemplate.map((tpl) =>
              renderCard(
                String(tpl.templateWidgetId),
                tpl.widgetName,
                tpl.description,
                <>
                  {renderTagPills(tpl.tags)}
                  {tpl.datasetName && <span className="text-[10px] font-semibold text-[#868e96] truncate max-w-[120px]">{tpl.datasetName}</span>}
                  <span className="flex items-center gap-1">
                    {tpl.visualizations.map((v) => (
                      <Tag key={v} color={v === tpl.defaultViz ? 'geekblue' : 'default'} className="!m-0 !text-[9px] !px-1 !py-0 !leading-4">
                        {VIZ_LABELS[v as VizType] ?? v}
                      </Tag>
                    ))}
                  </span>
                </>,
                () => onAddTemplate(tpl),
              ),
            )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold text-[#495057]">위젯 라이브러리</span>
          <Badge status="processing" color="#085fb5" text={<span className="text-[11px] font-bold text-[#085fb5] mono uppercase tracking-wider">Asset Library</span>} />
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      closeIcon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f1f3f5] transition-colors">
          <X className="h-5 w-5 text-[#868e96]" />
        </div>
      }
      styles={{
        header: { padding: '20px 32px', borderBottom: '1px solid #f1f3f5', marginBottom: 0 },
        body: { padding: 0, backgroundColor: '#f8f9fa', height: '750px', overflow: 'hidden' },
      }}
    >
      <div className="flex flex-col h-full">
        {/* 탭 + 검색바 + 태그 필터 */}
        <div className="bg-white px-8 pt-4 border-b border-[#f1f3f5]">
          <div className="flex items-center justify-between gap-6">
            <Tabs
              activeKey={activeTab}
              onChange={(k) => switchTab(k as 'custom' | 'template')}
              className="[&_.ant-tabs-nav]:!mb-0"
              items={[
                { key: 'custom', label: '커스텀 위젯' },
                { key: 'template', label: '템플릿 위젯' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-6 py-4">
            <Input
              placeholder="위젯 명칭·설명으로 검색하세요"
              prefix={<Search className="w-4 h-4 text-[#adb5bd] mr-1" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
              disabled={isLoading}
              className="fca-input-round h-11 max-w-lg"
            />
            {!isLoading && (
              <div className="text-[12.5px] text-[#868e96]">
                총 <span className="font-bold text-[#495057]">{count}</span>개의 위젯 자산
              </div>
            )}
          </div>
          {/* 태그 필터 칩 (AND) */}
          {!isLoading && tabTags.length > 0 && (
            <div className="flex items-start gap-2 pb-4">
              <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#adb5bd]">
                <Tags className="size-3.5" />
                태그
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tabTags.map((t) => {
                  const on = selectedTags.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                        on ? 'border-transparent bg-[#085fb5] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
                {selectedTags.size > 0 && (
                  <button type="button" onClick={() => setSelectedTags(new Set())} className="px-2 py-0.5 text-xs text-[#085fb5] hover:underline">
                    초기화
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 그리드 영역 */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">{renderGrid()}</div>

        <div className="px-10 py-5 bg-white border-t border-[#f1f3f5] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[12px] text-[#adb5bd]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e7f0fa] text-[#085fb5] font-bold text-[10px]">!</span>
            <span>선택한 위젯은 대시보드의 확보된 영역에 즉시 배치됩니다.</span>
          </div>
          <div className="text-[11px] text-[#adb5bd] mono">BT-ADMIN INSIGHT LIBRARY</div>
        </div>
      </div>
    </Modal>
  );
}
