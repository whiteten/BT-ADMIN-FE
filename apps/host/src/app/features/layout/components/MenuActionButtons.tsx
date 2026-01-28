import React from 'react';
import { BookmarkButton } from './BookmarkButton';
import { NewWindowButton } from './NewWindowButton';
import { Separator } from '@/components/ui/separator';

interface MenuActionButtonsProps {
  menuId: number;
  label: string;
  path: string;
  appId: string;
}

export const MenuActionButtons = React.memo(({ menuId, label, path, appId }: MenuActionButtonsProps) => {
  return (
    <div className="flex items-center gap-1">
      <NewWindowButton path={path} appId={appId} />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <BookmarkButton menuId={menuId} label={label} path={path} appId={appId} />
    </div>
  );
});

MenuActionButtons.displayName = 'MenuActionButtons';
