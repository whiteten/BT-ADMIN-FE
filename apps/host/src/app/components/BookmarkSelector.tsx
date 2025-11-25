import { useNavigate } from 'react-router-dom';
import _ from 'lodash';
import { AppWindow, Trash2 } from 'lucide-react';
import { useBookmarkStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../assets/images/icon/icon-bookmark.svg';
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
import NoData from '@/libs/shared-ui/src/components/custom/NoData';
import { cn } from '@/libs/shared-ui/src/lib/utils';

// Types
interface BookmarkItemProps {
  bookmark: {
    id: string;
    rootPath: string;
    label: string;
    path: string;
  };
  onNavigate: (rootPath: string, path: string, openNewWindow: boolean) => void;
  onDelete: (rootPath: string, id: string, label: string, path: string) => void;
}

const BookmarkItem = ({ bookmark, onNavigate, onDelete }: BookmarkItemProps) => (
  <div className="flex items-center gap-1">
    <Badge className="min-w-15 bg-gray-200 text-gray-700 ml-1">{bookmark.rootPath.toUpperCase()}</Badge>
    <DropdownMenuItem>
      <span className="w-[150px] truncate hover:cursor-pointer" onClick={() => onNavigate(bookmark.rootPath, bookmark.path, false)}>
        {bookmark.label}
      </span>
    </DropdownMenuItem>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="hover:cursor-pointer"
      onClick={() => onNavigate(bookmark.rootPath, bookmark.path, true)}
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
      onClick={() => onDelete(bookmark.rootPath, bookmark.id, bookmark.label, bookmark.path)}
      aria-label="Remove from bookmarks"
    >
      <Trash2 className="text-red-500" />
    </Button>
  </div>
);

// Main Component
export default function BookmarkSelector({ className, ...props }: React.ComponentProps<typeof Button>) {
  const navigate = useNavigate();
  const _bookmarks = useBookmarkStore((state) => state.bookmarks);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const bookmarks = _.orderBy(_bookmarks, ['rootPath', 'path'], ['asc', 'asc']);

  // Handlers
  const handleBookmarkClick = (rootPath: string, path: string, openNewWindow: boolean) => {
    const url = `/${rootPath}/${path}`;
    if (openNewWindow) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  const handleDeleteBookmark = (rootPath: string, id: string, label: string, path: string) => {
    toggleBookmark(rootPath, id, label, path);
  };

  // Trigger button component
  const triggerButton = (
    <Button variant="ghost" className={cn('size-7', className)} aria-label="Open bookmark menu" {...props}>
      <IconBookmark className="size-6" />
      <span className="sr-only">북마크</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[300px]" align="end">
        <DropdownMenuLabel>
          <span>북마크</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {bookmarks.length ? (
            bookmarks.map((bookmark) => <BookmarkItem key={bookmark.id} bookmark={bookmark} onNavigate={handleBookmarkClick} onDelete={handleDeleteBookmark} />)
          ) : (
            <div className="p-2">
              <NoData message={`등록된 북마크 항목이 없습니다.`} iconSize={8} fontSize="text-sm" gap={2} />
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
