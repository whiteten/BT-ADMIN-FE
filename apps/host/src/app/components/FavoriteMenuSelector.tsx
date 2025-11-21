import { useNavigate } from 'react-router-dom';
import _ from 'lodash';
import { AppWindow, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useFavoriteMenuStore } from '@/libs/shared-store/src/lib/useFavoriteMenuStore';
import NoData from '@/libs/shared-ui/src/components/custom/NoData';
import { cn } from '@/libs/shared-ui/src/lib/utils';

// Types
interface FavoriteItemProps {
  favorite: {
    id: string;
    rootPath: string;
    label: string;
    path: string;
  };
  onNavigate: (rootPath: string, path: string, openNewWindow: boolean) => void;
  onDelete: (rootPath: string, id: string, label: string, path: string) => void;
}

const FavoriteItem = ({ favorite, onNavigate, onDelete }: FavoriteItemProps) => (
  <div className="flex items-center gap-1">
    <Badge className="min-w-15 bg-gray-200 text-gray-700 ml-1">{favorite.rootPath.toUpperCase()}</Badge>
    <DropdownMenuItem>
      <span className="w-[150px] truncate hover:cursor-pointer" onClick={() => onNavigate(favorite.rootPath, favorite.path, false)}>
        {favorite.label}
      </span>
    </DropdownMenuItem>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="hover:cursor-pointer"
      onClick={() => onNavigate(favorite.rootPath, favorite.path, true)}
      aria-label="Open in new window"
    >
      <AppWindow className="text-gray-700" />
    </Button>
    <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="hover:cursor-pointer"
      onClick={() => onDelete(favorite.rootPath, favorite.id, favorite.label, favorite.path)}
      aria-label="Remove from favorites"
    >
      <Trash2 className="text-red-500" />
    </Button>
  </div>
);

// Main Component
export default function FavoriteMenuSelector({ className, ...props }: React.ComponentProps<typeof Button>) {
  const navigate = useNavigate();
  const _favorites = useFavoriteMenuStore((state) => state.favorites);
  const toggleFavorite = useFavoriteMenuStore((state) => state.toggleFavorite);
  const favorites = _.orderBy(_favorites, ['rootPath', 'path'], ['asc', 'asc']);

  // Handlers
  const handleFavoriteClick = (rootPath: string, path: string, openNewWindow: boolean) => {
    const url = `/${rootPath}/${path}`;
    if (openNewWindow) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  const handleDeleteFavorite = (rootPath: string, id: string, label: string, path: string) => {
    toggleFavorite(rootPath, id, label, path);
  };

  // Trigger button component
  const triggerButton = (
    <Button variant="ghost" className={cn('size-7', className)} aria-label="Open favorites menu" {...props}>
      <Star />
      <span className="sr-only">즐겨찾기</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[300px]" align="start">
        <DropdownMenuLabel>
          <span>즐겨찾기</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {favorites.length ? (
            favorites.map((favorite) => <FavoriteItem key={favorite.id} favorite={favorite} onNavigate={handleFavoriteClick} onDelete={handleDeleteFavorite} />)
          ) : (
            <div className="p-2">
              <NoData message={`등록된 즐겨찾기 항목이 없습니다.`} iconSize={8} fontSize="text-sm" gap={2} />
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
