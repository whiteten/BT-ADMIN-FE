import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'antd';
import { GripVertical } from 'lucide-react';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import { MenuItem } from './components/MenuItem';
import { MenuSpinner } from './components/MenuSpinner';
import useRemoteSelector from '../../hooks/useRemoteSelector';
import NoData from '@/components/custom/NoData';
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
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

const LNBBody = () => {
  const { menuConfigs, isLoading } = useMenuStore();
  const { selectedRemote } = useRemoteSelector();
  const { favorites } = useNavigationStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortedFavorites, setSortedFavorites] = useState<Bookmark[]>([]);

  useEffect(() => {
    setSortedFavorites([...favorites].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [favorites]);

  if (isLoading) {
    return (
      <SidebarContent>
        <MenuSpinner className="text-white" />
      </SidebarContent>
    );
  }

  if (!menuConfigs.length) {
    return (
      <SidebarContent>
        <NoData message={`메뉴 정보를\n찾을 수 없습니다.\n(전체)`} color="!text-white" />
      </SidebarContent>
    );
  }

  const selectedRemoteMenuConfig = menuConfigs.find((menuConfig) => menuConfig.appId === selectedRemote.key);
  if (!selectedRemoteMenuConfig) {
    return (
      <SidebarContent>
        <NoData message={`메뉴 정보를\n찾을 수 없습니다.`} color="!text-white" />
      </SidebarContent>
    );
  }

  const handleToggleEditMode = () => {
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
    <SidebarContent>
      <SidebarGroup key={selectedRemoteMenuConfig.appId}>
        <SidebarGroupLabel>{selectedRemoteMenuConfig.appName}</SidebarGroupLabel>
        <SidebarMenu>
          {selectedRemoteMenuConfig.menus.map((item) => (
            <MenuItem key={item.menuId} item={item} appId={selectedRemoteMenuConfig.appId} />
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>
          <div className="flex items-center justify-between w-full">
            <span>{isEditMode ? '드래그 하여 순서변경' : '북마크'}</span>
            {favorites?.length > 0 && (
              <Button size="small" className="!text-xs !px-1 !py-0.25 !h-auto !bg-transparent !border-white !text-white" onClick={handleToggleEditMode}>
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
    </SidebarContent>
  );
};

export default LNBBody;
