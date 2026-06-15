import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Log } from '@/log';
import { copyToClipboard, toast } from '@/shared-util';
import { cn } from '@/lib/utils';

interface MessageCopyButtonProps {
  /** 클립보드에 복사할 텍스트 */
  text: string;
  className?: string;
}

/**
 * 채팅 말풍선 hover 복사 버튼.
 * 노출 제어(opacity)는 부모 말풍선의 group hover 가 담당하므로 여기선 버튼만 렌더한다.
 */
export default function MessageCopyButton({ text, className }: MessageCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyToClipboard(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      Log.warn('message copy failed', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="복사"
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-md text-[#A5AAB5] transition-colors hover:bg-[#F1F3F5] hover:text-[#495057] hover:cursor-pointer',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}
