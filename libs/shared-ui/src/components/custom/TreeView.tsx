/**
 * TreeView — 공통 트리의 스타일 프리미티브 묶음.
 *
 * 디자인 토큰(브랜드 블루 var(--color-bt-primary) 선택바, 12.5px 라벨, caret·folder 아이콘)을 한 곳에 고정해
 * 모든 트리의 톤앤매너를 일치시킨다. 톤 기준 SoT 는 상담사 설정(AgentGroupTree).
 * 로직은 useTreeView 훅이, 표현은 이 프리미티브가 담당한다.
 *
 * 드롭 상태(emerald·blue) 등 DnD 도메인 스타일은 공통화하지 않고,
 * TreeRow 의 className 으로 소비처가 주입한다(cn=twMerge 라 나중 클래스가 이긴다).
 */
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, FolderClosed, FolderOpen } from 'lucide-react';
import type { TreeRowDivProps, TreeViewItem } from '../../hooks/useTreeView';
import { cn } from '../../lib/utils';

interface TreeRowProps<T> extends TreeRowDivProps {
  item: TreeViewItem<T>;
  selected?: boolean;
  children: ReactNode;
}

/** 행 chrome — 들여쓰기 + 선택/hover 스타일 + a11y. draggable·onDrag*·onClick 등은 그대로 머지. */
export function TreeRow<T>({ item, selected, className, style, children, ...rest }: TreeRowProps<T>) {
  const rowProps = item.getRowProps(rest);
  return (
    <div
      {...rowProps}
      aria-selected={!!selected}
      className={cn(
        'group relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none border-l-[3px] outline-none transition',
        selected ? 'bg-[var(--color-bt-primary-soft)] border-[var(--color-bt-primary)]' : 'border-transparent hover:bg-gray-50',
        className,
      )}
      style={{ paddingLeft: 12 + item.depth * 16, ...style }}
    >
      {children}
    </div>
  );
}

interface TreeCaretProps<T> {
  item: TreeViewItem<T>;
}

/** 펼침 토글 caret — 행 클릭과 분리(stopPropagation). 폴더가 아니면 빈 자리로 폭 유지. */
export function TreeCaret<T>({ item }: TreeCaretProps<T>) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-700"
      onClick={(e) => {
        e.stopPropagation();
        if (item.isFolder) item.toggle();
      }}
    >
      {item.isFolder ? item.isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" /> : null}
    </button>
  );
}

interface TreeLabelProps {
  children: ReactNode;
  selected?: boolean;
  title?: string;
}

/** 노드 라벨 — 선택 시 네이비 + semibold. */
export function TreeLabel({ children, selected, title }: TreeLabelProps) {
  return (
    <span title={title} className={cn('flex-1 text-[12.5px] truncate', selected ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-gray-700')}>
      {children}
    </span>
  );
}

interface TreeFolderIconProps<T> {
  item: TreeViewItem<T>;
  selected?: boolean;
}

/** 폴더 아이콘 — 펼침 상태에 따라 Open/Closed, 선택 시 네이비. (소비처가 자체 아이콘을 쓰면 미사용) */
export function TreeFolderIcon<T>({ item, selected }: TreeFolderIconProps<T>) {
  const Icon = item.isFolder && item.isExpanded ? FolderOpen : FolderClosed;
  return <Icon className={cn('size-3.5 flex-shrink-0', selected ? 'text-[var(--color-bt-primary)]' : 'text-gray-500')} />;
}
