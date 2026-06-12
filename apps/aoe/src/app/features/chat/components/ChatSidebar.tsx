import { useRef, useState } from 'react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import { Plus, Search } from 'lucide-react';
import { CHAT_NAME_MAX_LENGTH } from '../constants/chatConstants';
import type { ChatItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconMoreVertical } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import { Button as ShadcnButton } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: ChatItem[];
  isFetching: boolean;
  selectedChatId: string | null;
  onSearch: (keyword: string) => void;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onRename: (chat: ChatItem, chatName: string) => void;
  onDelete: (chat: ChatItem) => void;
}

export default function ChatSidebar({ chats, isFetching, selectedChatId, onSearch, onSelect, onNewChat, onRename, onDelete }: ChatSidebarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [editing, setEditing] = useState<{ chatId: string; value: string } | null>(null);
  const cancelEditRef = useRef(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (e.target.value === '') onSearch('');
  };

  const handleStartEdit = (chat: ChatItem) => {
    cancelEditRef.current = false;
    setEditing({ chatId: chat.chatId, value: chat.chatName });
  };

  const handleCommitEdit = (chat: ChatItem) => {
    const name = editing?.value.trim() ?? '';
    setEditing(null);
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    if (!name || name === chat.chatName) return;
    onRename(chat, name);
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#F1F3F5]">
      <div className="flex flex-col gap-2.5 border-b border-[#F1F3F5] p-4">
        <Button type="primary" block icon={<Plus className="size-3.5" />} onClick={onNewChat}>
          새 채팅
        </Button>
        <Input
          value={searchValue}
          onChange={handleSearchChange}
          onPressEnter={() => onSearch(searchValue.trim())}
          placeholder="대화명·질문 검색"
          prefix={<Search className="size-3.5 text-[#888B9A]" />}
          allowClear
        />
      </div>

      {isFetching && !chats.length ? (
        <div className="flex flex-1 items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : chats.length ? (
        <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {chats.map((chat) => {
            const isSelected = chat.chatId === selectedChatId;
            const isEditing = editing?.chatId === chat.chatId;

            return (
              <li key={chat.chatId}>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-lg px-3 py-2.5 transition-colors hover:cursor-pointer hover:bg-[#F6F8FA]',
                    isSelected && 'bg-[var(--color-bt-primary)]/8 hover:bg-[var(--color-bt-primary)]/8',
                  )}
                  onClick={() => onSelect(chat.chatId)}
                >
                  {isEditing ? (
                    <Input
                      size="small"
                      autoFocus
                      value={editing.value}
                      maxLength={CHAT_NAME_MAX_LENGTH}
                      onChange={(e) => setEditing({ chatId: chat.chatId, value: e.target.value })}
                      onPressEnter={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEditRef.current = true;
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => handleCommitEdit(chat)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5" onDoubleClick={() => handleStartEdit(chat)}>
                      <span className={cn('truncate text-[13px] text-[#495057]', isSelected && 'font-medium text-[var(--color-bt-primary)]')}>{chat.chatName}</span>
                      <span className="text-[11px] text-[#888B9A]">{chat.workTime ? dayjs(chat.workTime).format('YYYY-MM-DD HH:mm') : '-'}</span>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <ShadcnButton
                        variant="ghost"
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:cursor-pointer',
                          isSelected && 'opacity-100',
                        )}
                      >
                        <IconMoreVertical />
                        <span className="sr-only">더보기</span>
                      </ShadcnButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleStartEdit(chat)} className="hover:cursor-pointer">
                        이름 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(chat)} className="hover:cursor-pointer">
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <NoData message="대화가 없습니다." iconSize={36} fontSize="text-sm" gap={2} />
        </div>
      )}
    </aside>
  );
}
