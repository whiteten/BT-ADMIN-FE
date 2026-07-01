import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'antd';
import { Check, GripVertical, SquareDashed, Trash2, X } from 'lucide-react';
import { sharedApi } from '@/shared-api';
import { useMenuStore, useNavigationStore, useRemoteAvailabilityStore } from '@/shared-store';
import { isMenuActive } from './PanelMenuPrimitives';
import { NewWindowButton } from '../components/NewWindowButton';
import { useUpdateFavorite } from '../hooks/useFavoriteQueries';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { useOpenInNewTab } from '../hooks/useOpenInNewTab';
import { findMenuInfo } from '../utils/findMenuInfo';
import { IconStar } from '@/components/custom/Icons';
import type { Favorite } from '@/libs/shared-api/src/lib/types/navi.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface FavoriteInfo {
  favorite: Favorite;
  icon?: React.ElementType;
  path?: string;
  breadcrumb: string;
  isAvailable: boolean;
}

interface SortableFavoriteRowProps {
  info: FavoriteInfo;
  isEditMode: boolean;
  onClick: (favorite: Favorite, path?: string) => void;
  onRemove?: (menuKey: string) => void;
}

const SortableFavoriteRow = ({ info, isEditMode, onClick, onRemove }: SortableFavoriteRowProps) => {
  const location = useLocation();
  const { favorite, icon: Icon, path, breadcrumb, isAvailable } = info;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: favorite.menuKey });
  // 클릭 가능 = 경로 있음 + remote 기동. 둘 중 하나라도 빠지면 죽은 항목으로 비활성 처리.
  const isDisabled = !path || !isAvailable;
  const isActive = !isDisabled && path ? isMenuActive(path, location, favorite.appId) : false;
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (isEditMode) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-md px-3 py-2.5 bg-white border border-[#e9ecef]">
        <span className="cursor-grab active:cursor-grabbing text-[#adb5bd] shrink-0" {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </span>
        {Icon ? <Icon className="size-5 shrink-0 text-[#868e96]" /> : <SquareDashed className="size-5 shrink-0 text-[#868e96]" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#495057] truncate">{favorite.label}</p>
          {breadcrumb && <p className="text-[12px] text-[#adb5bd] truncate mt-0.5">{breadcrumb}</p>}
        </div>
        <button
          type="button"
          onClick={() => onRemove?.(favorite.menuKey)}
          className="shrink-0 text-[#adb5bd] hover:text-[#e03131] transition-colors cursor-pointer p-1 -m-1 rounded"
          aria-label="즐겨찾기 삭제"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => !isDisabled && onClick(favorite, path)}
      title={!isAvailable ? '앱 미기동 — 현재 접속할 수 없습니다.' : undefined}
      className={cn(
        'group/row relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer text-[#495057] hover:bg-[#f1f3f5]',
        isActive && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[var(--color-bt-primary)]',
      )}
    >
      {Icon ? (
        <Icon className={cn('size-5 shrink-0', isActive ? 'text-[var(--color-bt-primary)]' : 'text-[#868e96]')} />
      ) : (
        <SquareDashed className={cn('size-5 shrink-0', isActive ? 'text-[var(--color-bt-primary)]' : 'text-[#868e96]')} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isActive ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-[#495057]')}>{favorite.label}</p>
        {breadcrumb && <p className="text-[12px] text-[#adb5bd] truncate mt-0.5">{breadcrumb}</p>}
      </div>
      {!isDisabled && (
        <span className="shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          <NewWindowButton path={path} appId={favorite.appId} />
        </span>
      )}
    </div>
  );
};

interface PanelFavoritesSectionProps {
  className?: string;
}

const PanelFavoritesSection = ({ className }: PanelFavoritesSectionProps) => {
  const openInNewTab = useOpenInNewTab();
  const queryClient = useQueryClient();
  const { menuConfigs } = useMenuStore();
  const { favorites } = useNavigationStore();
  const availableRemotes = useRemoteAvailabilityStore((s) => s.availableRemotes);
  const { setOpen } = useMenuPanelStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortedFavorites, setSortedFavorites] = useState<Favorite[]>([]);

  const { mutate: updateFavorite, isPending } = useUpdateFavorite({
    mutationOptions: {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation().queryKey });
      },
    },
  });

  useEffect(() => {
    setSortedFavorites([...favorites].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [favorites]);

  const handleEnterEditMode = () => setIsEditMode(true);

  const handleConfirm = () => {
    const menuKeys = sortedFavorites.map((f) => f.menuKey);
    const originalMenuKeys = [...favorites].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => f.menuKey);
    const hasChanged = menuKeys.length !== originalMenuKeys.length || menuKeys.some((k, index) => k !== originalMenuKeys[index]);
    if (hasChanged) {
      updateFavorite({ params: {}, data: { menuKeys } });
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setSortedFavorites([...favorites].sort((a, b) => a.sortOrder - b.sortOrder));
    setIsEditMode(false);
  };

  const handleRemove = (menuKey: string) => {
    setSortedFavorites((prev) => prev.filter((b) => b.menuKey !== menuKey));
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

  const handleClick = (favorite: Favorite, path?: string) => {
    if (!path) return;
    // 즐겨찾기 클릭도 메뉴와 동일하게 새 탭으로 연다(중복 허용).
    openInNewTab(`/${favorite.appId}/${path}`);
    setOpen(false);
  };

  const enrichedFavorites: FavoriteInfo[] = sortedFavorites.map((favorite) => {
    const { icon, path, appName, ancestors } = findMenuInfo(menuConfigs, favorite);
    // ancestors는 즐겨찾기 자신의 label까지 포함하므로 마지막을 제외해 부모 경로만 표시
    const breadcrumb = [appName, ...ancestors.slice(0, -1)].filter(Boolean).join(' › ');
    const isAvailable = availableRemotes[favorite.appId] === true;
    return { favorite, icon, path, breadcrumb, isAvailable };
  });

  const showToolbar = favorites.length > 0;
  const isEmptyList = sortedFavorites.length === 0;

  return (
    <section className={cn('flex flex-col', className)}>
      {showToolbar && (
        <header className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#868e96]">{isEditMode ? '드래그로 순서변경, 휴지통으로 삭제' : `총 ${sortedFavorites.length}개`}</span>
          {isEditMode ? (
            <div className="flex items-center gap-1">
              <Button
                size="small"
                loading={isPending}
                icon={<Check className="size-4" />}
                aria-label="저장"
                className="!px-2.5 !py-1 !h-auto !bg-transparent !border-[#ced4da] !text-[#495057] hover:!border-[var(--color-bt-primary)] hover:!text-[var(--color-bt-primary)]"
                onClick={handleConfirm}
              />
              <Button
                size="small"
                disabled={isPending}
                icon={<X className="size-4" />}
                aria-label="취소"
                className="!px-2.5 !py-1 !h-auto !bg-transparent !border-[#ced4da] !text-[#495057] hover:!border-[#e03131] hover:!text-[#e03131]"
                onClick={handleCancel}
              />
            </div>
          ) : (
            <Button
              size="small"
              className="!text-sm !px-2.5 !py-1 !h-auto !bg-transparent !border-[#ced4da] !text-[#495057] hover:!border-[var(--color-bt-primary)] hover:!text-[var(--color-bt-primary)]"
              onClick={handleEnterEditMode}
            >
              편집
            </Button>
          )}
        </header>
      )}

      {isEmptyList ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-base text-[#878a99]">즐겨찾기한 메뉴가 없습니다.</p>
          <p className="text-sm text-[#adb5bd] mt-1 inline-flex items-center gap-1">
            메뉴 옆 <IconStar className="size-3.5 shrink-0" /> 아이콘을 눌러 추가해보세요.
          </p>
        </div>
      ) : isEditMode ? (
        <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={enrichedFavorites.map((b) => b.favorite.menuKey)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {enrichedFavorites.map((info) => (
                <SortableFavoriteRow key={info.favorite.menuKey} info={info} isEditMode onClick={handleClick} onRemove={handleRemove} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-px">
          {enrichedFavorites.map((info) => (
            <SortableFavoriteRow key={info.favorite.menuKey} info={info} isEditMode={false} onClick={handleClick} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PanelFavoritesSection;
