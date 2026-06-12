import { cn } from '../../lib/utils';
import { Spinner, type SpinnerProps } from '../shadcn/spinner';

export type FallbackSpinnerProps = SpinnerProps & {
  useFullScreen?: boolean;
  /** 스피너 아래에 표시할 안내 문구 */
  tip?: string;
  /** 중앙 정렬 래퍼(div)에 추가할 클래스. className은 Spinner 자체에 전달됨 */
  wrapperClassName?: string;
};

export function FallbackSpinner({ useFullScreen = false, tip, wrapperClassName, variant = 'infinite', size = 100, ...spinnerProps }: FallbackSpinnerProps) {
  return (
    <div className={cn('h-full w-full flex flex-col items-center justify-center gap-2 text-[var(--color-bt-primary)]', useFullScreen && 'w-screen h-screen', wrapperClassName)}>
      <Spinner variant={variant} size={size} {...spinnerProps} />
      {tip && <span className="text-sm">{tip}</span>}
    </div>
  );
}
