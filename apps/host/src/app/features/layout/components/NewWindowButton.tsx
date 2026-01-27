import React, { useCallback } from 'react';
import { AppWindow } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewWindowButtonProps {
  path: string;
  appId: string;
}

export const NewWindowButton = React.memo(({ path, appId }: NewWindowButtonProps) => {
  const handleNewWindow = useCallback(() => {
    window.open(`/${appId}/${path}`, '_blank');
  }, [appId, path]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleNewWindow}>
      <AppWindow className="h-4 w-4 text-gray-700" />
      <span className="sr-only">Open in new window</span>
    </Button>
  );
});

NewWindowButton.displayName = 'NewWindowButton';
