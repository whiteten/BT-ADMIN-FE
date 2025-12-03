import { cn } from '../../lib/utils';
import { Spinner } from '../shadcn/spinner';

export function FallbackSpinner({ useFullScreen = false }: { useFullScreen?: boolean }) {
  return (
    <div className={cn('h-full w-full flex items-center justify-center', useFullScreen && 'w-screen h-screen')}>
      <Spinner variant="infinite" className="text-[var(--color-bt-primary)]" size={100} />
    </div>
  );
}
