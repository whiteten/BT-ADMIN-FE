import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'antd';
import { GripVertical } from 'lucide-react';
import { sharedApi } from '@/shared-api';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import { isMenuActive } from './PanelMenuPrimitives';
import { useUpdateBookmark } from '../hooks/useBookmarkQueries';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const findMenuInfo = (menuConfigs: MenuConfig[], bookmark: Bookmark): { icon?: React.ElementType; path?: string } => {
  for (const config of menuConfigs) {
    if (config.appId !== bookmark.appId) continue;
    for (const menu of config.menus) {
      const result = findMenuItemRecursive(menu, bookmark.menuKey);
      if (result) {
        return { icon: menu.icon, path: result.path };
      }
    }
  }
  return {};
};

const findMenuItemRecursive = (item: MenuItem, menuKey: string): { path?: string } | null => {
  if (item.menuKey === menuKey) return { path: item.path };
  if (item.children) {
    for (const child of item.children) {
      const result = findMenuItemRecursive(child, menuKey);
      if (result) return result;
    }
  }
  return null;
};

interface SortableBookmarkRowProps {
  bookmark: Bookmark;
  icon?: React.ElementType;
  path?: string;
  isEditMode: boolean;
  onClick: (bookmark: Bookmark, path?: string) => void;
}

const SortableBookmarkRow = ({ bookmark, icon: Icon, path, isEditMode, onClick }: SortableBookmarkRowProps) => {
  const location = useLocation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: bookmark.menuKey });
  const isActive = path ? isMenuActive(path, location, bookmark.appId) : false;

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (isEditMode) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md px-3 py-2 text-white bg-white/[0.04] border border-white/10">
        <span className="cursor-grab active:cursor-grabbing text-white/70" {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </span>
        {Icon ? <Icon className="size-5 shrink-0" /> : <span className="size-1 shrink-0 rounded-full bg-white/40" />}
        <span className="flex-1 min-w-0 truncate text-sm">{bookmark.label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(bookmark, path)}
      disabled={!path}
      className={cn(
        'group/row flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-white transition-colors cursor-pointer',
        'hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
        isActive && 'bg-white/10 text-lime-300',
      )}
    >
      {Icon && <Icon className="size-5 shrink-0" />}
      <span className="flex-1 min-w-0 truncate text-sm">{bookmark.label}</span>
    </button>
  );
};

interface PanelBookmarksSectionProps {
  className?: string;
}

const PanelBookmarksSection = ({ className }: PanelBookmarksSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { menuConfigs } = useMenuStore();
  const { favorites } = useNavigationStore();
  const { setOpen } = useMenuPanelStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortedFavorites, setSortedFavorites] = useState<Bookmark[]>([]);

  const { mutate: updateBookmark, isPending } = useUpdateBookmark({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });

  useEffect(() => {
    setSortedFavorites([...favorites].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [favorites]);

  const handleToggleEditMode = () => {
    if (isEditMode) {
      const menuKeys = sortedFavorites.map((f) => f.menuKey);
      const originalMenuKeys = [...favorites].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => f.menuKey);
      const hasChanged = menuKeys.some((k, index) => k !== originalMenuKeys[index]);
      if (hasChanged) {
        updateBookmark({ params: {}, data: { menuKeys } });
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedFavorites((prev) => {
      const oldIndex = prev.findIndex((item) => item.menuKey === active.id);
      const newIndex = prev.findIndex((item) => item.menuKey === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleClick = (bookmark: Bookmark, path?: string) => {
    if (!path) return;
    navigate(`/${bookmark.appId}/${path}`);
    setOpen(false);
  };

  return (
    <section className={cn('flex flex-col', className)}>
      <header className="flex items-center justify-between px-3 mb-2">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-white/60">{isEditMode ? '드래그 하여 순서변경' : 'Bookmarks'}</h3>
        {favorites?.length > 0 && (
          <Button
            size="small"
            loading={isPending}
            className="!text-xs !px-1.5 !py-0 !h-auto !bg-transparent !border-white/40 !text-white/80 hover:!border-white"
            onClick={handleToggleEditMode}
          >
            {isEditMode ? 'DONE' : 'EDIT'}
          </Button>
        )}
      </header>

      {sortedFavorites.length === 0 ? (
        <p className="text-xs text-white/40 px-3 py-4">북마크한 메뉴가 없습니다.</p>
      ) : isEditMode ? (
        <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedFavorites.map((f) => f.menuKey)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {sortedFavorites.map((bookmark) => {
                const { icon, path } = findMenuInfo(menuConfigs, bookmark);
                return <SortableBookmarkRow key={bookmark.menuKey} bookmark={bookmark} icon={icon} path={path} isEditMode onClick={handleClick} />;
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-px">
          {sortedFavorites.map((bookmark) => {
            const { icon, path } = findMenuInfo(menuConfigs, bookmark);
            return <SortableBookmarkRow key={bookmark.menuKey} bookmark={bookmark} icon={icon} path={path} isEditMode={false} onClick={handleClick} />;
          })}
        </div>
      )}
    </section>
  );
};

export default PanelBookmarksSection;
