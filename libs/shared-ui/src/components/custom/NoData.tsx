import { IconDataEmpty } from './Icons';
import { cn } from '../../lib/utils';

type TailwindFontSize =
  | 'text-xs' // 0.75rem (12px)
  | 'text-sm' // 0.875rem (14px)
  | 'text-base' // 1rem (16px)
  | 'text-lg' // 1.125rem (18px)
  | 'text-xl' // 1.25rem (20px)
  | 'text-2xl' // 1.5rem (24px)
  | 'text-3xl' // 1.875rem (30px)
  | 'text-4xl' // 2.25rem (36px)
  | 'text-5xl' // 3rem (48px)
  | 'text-6xl' // 3.75rem (60px)
  | 'text-7xl' // 4.5rem (72px)
  | 'text-8xl' // 6rem (96px)
  | 'text-9xl'; // 8rem (128px)

interface NoDataProps {
  message?: string;
  iconSize?: number;
  fontSize?: TailwindFontSize;
  gap?: number;
}

export default function NoData({ message = '조회된 데이터가 없습니다.', iconSize = 15, fontSize = 'text-base', gap = 4 }: NoDataProps) {
  return (
    <div className={cn('w-full h-full flex flex-col gap-4 items-center justify-center', `gap-${gap}`)}>
      <IconDataEmpty className={`size-${iconSize} text-gray-500`} />
      <pre className={cn('text-gray-500', fontSize)}>{message}</pre>
    </div>
  );
}
