import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface MenuSpinnerProps {
  className?: string;
}

export const MenuSpinner = React.memo<MenuSpinnerProps>(({ className = 'text-blue-500' }) => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner variant="infinite" className={cn('text-blue-500', className)} size={100} />
    </div>
  );
});

MenuSpinner.displayName = 'MenuSpinner';
