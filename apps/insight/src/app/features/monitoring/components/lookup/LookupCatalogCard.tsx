import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, type MenuProps, Tag } from 'antd';
import { KeyRound } from 'lucide-react';
import type { LookupCatalogItem } from '../../types';
import { Highlight } from '@/components/custom/Highlight';
import { IconMoreVertical } from '@/components/custom/Icons';

// 한 줄(고정 높이)에 다 못 들어가 다음 줄로 넘어간 태그 개수 계산 — ReportRow / WidgetCatalogCard 와 동일 패턴(+N 표기용)
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

interface LookupCatalogCardProps {
  item: LookupCatalogItem;
  /** 검색어 — 표시명 매치 글자 하이라이트. 미전달 시 강조 없음. */
  query?: string;
  onEdit: (item: LookupCatalogItem) => void;
  onDelete: (item: LookupCatalogItem) => void;
}

/**
 * 코드 룩업 카드(행) — 보고서 ReportRow / 위젯 WidgetCatalogCard 와 동일 패턴.
 * 좌측 아이콘칩 + 표시명 + 카테고리 뱃지 + (카테고리/테이블명) 보조줄 + 태그 칩 + 사용건수 + 우측 점3개 드롭다운.
 * 클릭/더블클릭 시 편집 진입. 사용 중(usageCount>0)이면 삭제 메뉴 비활성.
 */
export default function LookupCatalogCard({ item, query, onEdit, onDelete }: LookupCatalogCardProps) {
  const { containerRef: tagsRef, wrappedCount: tagsWrapped } = useWrappedItemCount();
  const tags = item.tags ?? [];
  const blockDelete = item.usageCount > 0;

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '수정',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onEdit(item);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '삭제',
      danger: true,
      disabled: blockDelete,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onDelete(item);
      },
    },
  ];

  return (
    <div
      onClick={() => onEdit(item)}
      title={`${item.displayName} 수정`}
      className="group flex items-center gap-3 px-5 py-2.5 border-b border-[#e9ebec] cursor-pointer transition-colors hover:bg-[#f5f8fc]"
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-transparent"
        style={{ background: 'var(--color-bt-primary-soft)', color: 'var(--color-bt-primary)' }}
      >
        <KeyRound className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold group-hover:!text-[var(--color-bt-primary)]">
            <Highlight text={item.displayName} query={query ?? ''} />
          </span>
          {item.category && (
            <Tag color="geekblue" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              {item.category}
            </Tag>
          )}
          {blockDelete && (
            <span className="ml-auto shrink-0 rounded border border-[#dbe7f5] bg-[#eef5fc] px-1.5 text-[11px] font-medium text-[var(--color-bt-primary)] tabular-nums">
              사용 {item.usageCount}
            </span>
          )}
        </div>

        {/* 보조줄 — 테이블명. 고정 높이로 행 높이 안정화 */}
        <div className="mt-0.5 flex h-[18px] items-center gap-1 overflow-hidden">
          <span className="truncate font-mono text-[11px] text-[var(--color-bt-fg-muted)]">{item.tableName}</span>
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
