import { Input } from 'antd';
import { USER_QUERY_MAX_LENGTH } from '../constants/chatConstants';
import { IconSend } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}

export default function ChatInput({ value, onChange, onSend, sending }: ChatInputProps) {
  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey) return;
    e.preventDefault();
    onSend();
  };

  return (
    <div className="shrink-0 border-t border-[#F1F3F5] bg-white px-5 py-4">
      <div className="flex items-end gap-2 rounded-2xl border border-[#E2E6EB] bg-white px-4 py-2 transition-all focus-within:border-[var(--color-bt-primary)] focus-within:ring-2 focus-within:ring-[var(--color-bt-primary)]/10">
        <Input.TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={handlePressEnter}
          placeholder="통계 분석 질문을 입력하세요."
          maxLength={USER_QUERY_MAX_LENGTH}
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={sending}
          variant="borderless"
          className="flex-1 !px-0 !py-1"
        />
        <Button
          onClick={onSend}
          disabled={sending || !value.trim()}
          className="mb-0.5 size-8 shrink-0 rounded-full bg-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/90 hover:cursor-pointer"
        >
          <IconSend />
          <span className="sr-only">전송</span>
        </Button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-[#A5AAB5]">Enter 전송 · Shift+Enter 줄바꿈</p>
    </div>
  );
}
