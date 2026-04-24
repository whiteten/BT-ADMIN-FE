import React from 'react';
import { BookmarkButton } from './BookmarkButton';
import { NewWindowButton } from './NewWindowButton';
import { Separator } from '@/components/ui/separator';

interface MenuActionButtonsProps {
  menuKey: string;
  label: string;
  path: string;
  appId: string;
}

export const MenuActionButtons = React.memo(({ menuKey, label, path, appId }: MenuActionButtonsProps) => {
  return (
    <div className="flex items-center gap-1">
      <NewWindowButton path={path} appId={appId} />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <BookmarkButton menuKey={menuKey} label={label} path={path} appId={appId} />
    </div>
  );
});

MenuActionButtons.displayName = 'MenuActionButtons';
