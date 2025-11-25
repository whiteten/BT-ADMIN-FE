import React from 'react';
import { BookmarkButton } from './BookmarkButton';
import { NewWindowButton } from './NewWindowButton';
import { Separator } from '@/components/ui/separator';

interface MenuActionButtonsProps {
  menuId: string;
  label: string;
  path: string;
  rootPath: string;
}

export const MenuActionButtons = React.memo(({ menuId, label, path, rootPath }: MenuActionButtonsProps) => {
  return (
    <div className="flex items-center gap-1">
      <NewWindowButton path={path} rootPath={rootPath} />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <BookmarkButton menuId={menuId} label={label} path={path} rootPath={rootPath} />
    </div>
  );
});

MenuActionButtons.displayName = 'MenuActionButtons';
