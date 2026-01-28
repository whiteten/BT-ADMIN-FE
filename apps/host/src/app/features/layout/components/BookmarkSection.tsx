import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'antd';
import { GripVertical } from 'lucide-react';
import { sharedApi } from '@/shared-api';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import { useUpdateBookmark } from '../hooks/useBookmarkQueries';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig } from '@/libs/shared-store/src/types/menu.types';

/** menuConfigs에서 bookmark의 menuId에 해당하는 메뉴의 부모 아이콘과 path를 조회 */
const findMenuInfo = (menuConfigs: MenuConfig[], bookmark: Bookmark): { icon?: React.ElementType; path?: string } => {
  for (const config of menuConfigs) {
    if (config.appId !== bookmark.appId) continue;
    for (const menu of config.menus) {
      // 최상위 메뉴 자체가 일치 (아이콘 + path 둘 다 있는 경우)
      if (menu.menuId === bookmark.menuId) {
        return { icon: menu.icon, path: menu.path };
      }
      // 자식 중에서 일치하는 항목 탐색 → 부모 아이콘 반환
      if (menu.children) {
        for (const child of menu.children) {
          if (child.menuId === bookmark.menuId) {
            return { icon: menu.icon, path: child.path };
          }
        }
      }
    }
  }
  return {};
};

interface SortableBookmarkItemProps {
  bookmark: Bookmark;
  icon?: React.ElementType;
  path?: string;
  isEditMode: boolean;
}

const SortableBookmarkItem = ({ bookmark, icon: Icon, path, isEditMode }: SortableBookmarkItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: bookmark.menuId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isEditMode) {
    return (
      <SidebarMenuItem ref={setNodeRef} style={style}>
        <SidebarMenuButton>
          <span className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="!size-4 text-white" />
          </span>
          <span>{bookmark.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const absolutePath = path ? `/${bookmark.appId}/${path}` : '#';
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={absolutePath}>
          {Icon && <Icon className="!size-5" />}
          <span>{bookmark.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const BookmarkSection = () => {
  const queryClient = useQueryClient();
  const { menuConfigs } = useMenuStore();
  const { favorites } = useNavigationStore();
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
      const menuIds = sortedFavorites.map((f) => f.menuId);
      const originalMenuIds = [...favorites].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => f.menuId);
      const hasChanged = menuIds.some((id, index) => id !== originalMenuIds[index]);
      if (hasChanged) {
        updateBookmark({ params: {}, data: { menuIds } });
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedFavorites((prev) => {
      const oldIndex = prev.findIndex((item) => item.menuId === active.id);
      const newIndex = prev.findIndex((item) => item.menuId === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <div className="flex items-center justify-between w-full">
          <span>{isEditMode ? '드래그 하여 순서변경' : '북마크'}</span>
          {favorites?.length > 0 && (
            <Button size="small" loading={isPending} className="!text-xs !px-1 !py-0.25 !h-auto !bg-transparent !border-white !text-white" onClick={handleToggleEditMode}>
              {isEditMode ? 'DONE' : 'EDIT'}
            </Button>
          )}
        </div>
      </SidebarGroupLabel>
      <SidebarMenu>
        {isEditMode ? (
          <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedFavorites.map((f) => f.menuId)} strategy={verticalListSortingStrategy}>
              {sortedFavorites.map((bookmark) => {
                const { icon, path } = findMenuInfo(menuConfigs, bookmark);
                return <SortableBookmarkItem key={bookmark.menuId} bookmark={bookmark} icon={icon} path={path} isEditMode />;
              })}
            </SortableContext>
          </DndContext>
        ) : (
          sortedFavorites.map((bookmark) => {
            const { icon, path } = findMenuInfo(menuConfigs, bookmark);
            return <SortableBookmarkItem key={bookmark.menuId} bookmark={bookmark} icon={icon} path={path} isEditMode={false} />;
          })
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default BookmarkSection;
