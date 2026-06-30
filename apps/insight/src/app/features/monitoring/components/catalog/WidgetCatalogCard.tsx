import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, type MenuProps, Tag } from 'antd';
import { VIZ_LABELS } from '../../constants/monitoringConstants';
import type { CustomWidgetCatalogItem, TemplateWidgetDefinitionListItem, VizType } from '../../types';
import { Highlight } from '@/components/custom/Highlight';
import { IconLayer, IconMoreVertical, IconSlidersHorizontal } from '@/components/custom/Icons';

/** 위젯 관리 통합 목록 항목 — 템플릿/커스텀 위젯을 단일 목록으로 합치기 위한 판별 타입. */
export type WidgetCatalogEntry =
  | { kind: 'TEMPLATE'; id: number; name: string; tags: string[]; raw: TemplateWidgetDefinitionListItem }
  | { kind: 'CUSTOM'; id: string; name: string; tags: string[]; raw: CustomWidgetCatalogItem };

// 한 줄(고정 높이)에 다 못 들어가 다음 줄로 넘어간 태그 개수 계산 — fca BotCard / ReportRow 와 동일 패턴(+N 표기용)
const useWrappedItemCount = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wrappedCount, setWrappedCount] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || containerRef.current.children.length === 0) {
        setWrappedCount(0);
        return;
      }
      const children = containerRef.current.children;
      const firstItemTop = (children[0] as HTMLElement).getBoundingClientRect().top;
      let count = 0;
      for (let i = 1; i < children.length; i++) {
        const itemTop = (children[i] as HTMLElement).getBoundingClientRect().top;
        if (itemTop > firstItemTop) count++;
      }
      setWrappedCount(count);
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return { containerRef, wrappedCount };
};

interface WidgetCatalogCardProps {
  entry: WidgetCatalogEntry;
  /** 검색어 — 제목 매치 글자 하이라이트. 미전달 시 강조 없음. */
  query?: string;
  onEditTemplate: (id: number) => void;
  onDeleteTemplate: (item: TemplateWidgetDefinitionListItem) => void;
  onEditCustom: (item: CustomWidgetCatalogItem) => void;
}

/**
 * 위젯 관리 카드(행) — 보고서 ReportRow / 대시보드 DashboardRow 와 동일 패턴.
 * 좌측 아이콘칩(템플릿=Layer, 커스텀=Sliders) + 제목 + 종류 뱃지 + 보조줄 + 태그 칩 + 우측 점3개 드롭다운.
 * 클릭/더블클릭 시 수정 진입(템플릿=빌더 이동, 커스텀=편집 드로어).
 */
export default function WidgetCatalogCard({ entry, query, onEditTemplate, onDeleteTemplate, onEditCustom }: WidgetCatalogCardProps) {
  const { containerRef: tagsRef, wrappedCount: tagsWrapped } = useWrappedItemCount();
  const tags = entry.tags;

  const handleEdit = () => (entry.kind === 'TEMPLATE' ? onEditTemplate(entry.id) : onEditCustom(entry.raw));

  const menuItems: MenuProps['items'] =
    entry.kind === 'TEMPLATE'
      ? [
          {
            key: 'edit',
            label: '편집',
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              onEditTemplate(entry.id);
            },
          },
          { type: 'divider' },
          {
            key: 'delete',
            label: '삭제',
            danger: true,
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              onDeleteTemplate(entry.raw);
            },
          },
        ]
      : [
          {
            key: 'edit',
            label: '편집',
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              onEditCustom(entry.raw);
            },
          },
        ];

  return (
    <div
      onClick={handleEdit}
      title={`${entry.name} 편집`}
      className="group flex items-center gap-3 px-5 py-2.5 border-b border-[#e9ebec] cursor-pointer transition-colors hover:bg-[#f5f8fc]"
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-transparent"
        style={{ background: 'var(--color-bt-primary-soft)', color: 'var(--color-bt-primary)' }}
      >
        {entry.kind === 'TEMPLATE' ? <IconLayer className="size-4" /> : <IconSlidersHorizontal className="size-4" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold group-hover:!text-[var(--color-bt-primary)]">
            <Highlight text={entry.name} query={query ?? ''} />
          </span>
          {entry.kind === 'TEMPLATE' ? (
            <Tag color="geekblue" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              템플릿
            </Tag>
          ) : (
            <Tag color="purple" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              커스텀
            </Tag>
          )}
        </div>

        {/* 보조줄 — 템플릿: 데이터셋명 + 시각화 / 커스텀: 카테고리 + 식별자. 고정 높이로 행 높이 안정화 */}
        <div className="mt-0.5 flex h-[18px] items-center gap-1 overflow-hidden">
          {entry.kind === 'TEMPLATE' ? (
            <>
              {entry.raw.datasetName ? (
                <span className="inline-flex h-[18px] shrink-0 items-center rounded border border-[#e9ebec] bg-[#f3f5f7] px-1.5 text-[11px] text-[var(--color-bt-fg-muted)]">
                  {entry.raw.datasetName}
                </span>
              ) : (
                <span className="text-[11px] italic text-gray-300">데이터셋 없음</span>
              )}
              {entry.raw.visualizations.map((v) => (
                <span key={v} className="inline-flex h-[18px] shrink-0 items-center rounded border border-[#dbe7f5] bg-[#eef5fc] px-1.5 text-[11px] text-[var(--color-bt-primary)]">
                  {v === entry.raw.defaultViz ? '★ ' : ''}
                  {VIZ_LABELS[v as VizType] ?? v}
                </span>
              ))}
            </>
          ) : (
            <>
              <span className="inline-flex h-[18px] shrink-0 items-center rounded border border-[#e9ebec] bg-[#f3f5f7] px-1.5 text-[11px] text-[var(--color-bt-fg-muted)]">
                {entry.raw.widgetCategory}
              </span>
              <span className="truncate text-[11px] text-[var(--color-bt-fg-muted)]">{entry.raw.widgetTypeId}</span>
            </>
          )}
        </div>

        {/* 태그 칩 — 한 줄 고정. 넘치는 태그는 숨기고 +N 으로 표기(ReportRow 패턴) */}
        <div className="mt-0.5 flex items-center gap-1">
          {tags.length > 0 ? (
            <>
              <div ref={tagsRef} className="flex h-[18px] min-w-0 flex-1 flex-wrap gap-1 overflow-hidden">
                {tags.map((t) => (
                  <span
                    key={`tag-${t}`}
                    className="inline-flex h-[18px] shrink-0 items-center rounded border border-[#dbe7f5] bg-[#eef5fc] px-1.5 text-[11px] text-[var(--color-bt-primary)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {tagsWrapped > 0 && (
                <span
                  title={tags.join(', ')}
                  className="inline-flex h-[18px] shrink-0 items-center rounded-full border border-[#dbe7f5] bg-[#eef5fc] px-1.5 text-[11px] font-medium text-[var(--color-bt-primary)]"
                >
                  +{tagsWrapped}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] italic text-gray-300">태그 없음</span>
          )}
        </div>
      </div>

      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Button
          type="text"
          size="small"
          icon={<IconMoreVertical className="block size-4" />}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 [&_.ant-btn-icon]:flex [&_.ant-btn-icon]:items-center [&_.ant-btn-icon]:justify-center"
        />
      </Dropdown>
    </div>
  );
}
