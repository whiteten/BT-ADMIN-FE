import React, { useCallback } from 'react';
import { AppWindow } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewWindowButtonProps {
  path: string;
  appId: string;
  /** true면 아이콘 + "새 창에서 열기" 텍스트의 큰 버튼으로 렌더(스플릿 프리뷰 패널용). 기본 false는 아이콘 버튼. */
  labeled?: boolean;
}

export const NewWindowButton = React.memo(({ path, appId, labeled = false }: NewWindowButtonProps) => {
  const handleNewWindow = useCallback(() => {
    window.open(`/${appId}/${path}`, '_blank');
  }, [appId, path]);

  if (labeled) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-9 cursor-pointer gap-1.5 px-3.5 text-[13px] text-[#495057] hover:bg-white hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]"
        onClick={handleNewWindow}
      >
        <AppWindow className="h-4 w-4" />새 창에서 열기
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 cursor-pointer text-[#CED4DA] hover:bg-transparent hover:text-[var(--color-bt-primary)]"
      onClick={handleNewWindow}
    >
      <AppWindow className="h-4 w-4" />
      <span className="sr-only">Open in new window</span>
    </Button>
  );
});

NewWindowButton.displayName = 'NewWindowButton';
