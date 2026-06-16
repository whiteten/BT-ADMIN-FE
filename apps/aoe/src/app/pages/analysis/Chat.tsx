import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BreadcrumbProps } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { createUUID, toast } from '@/shared-util';
import ChatInput from '../../features/chat/components/ChatInput';
import ChatMessageList from '../../features/chat/components/ChatMessageList';
import ChatSidebar from '../../features/chat/components/ChatSidebar';
import { CHAT_NAME_MAX_LENGTH } from '../../features/chat/constants/chatConstants';
import { chatQueryKeys, useCreateChat, useDeleteChat, useGetChatList, useGetChatMessageList, useQueryChat, useUpdateChat } from '../../features/chat/hooks/useChatQueries';
import type { ChatItem } from '../../features/chat/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '분석', path: '/aoe/analysis' },
  { title: '대화형 분석', path: '/aoe/analysis/chat' },
];

export default function Chat() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [keyword, setKeyword] = useState('');
  /** null = 새 채팅 초안 — 첫 질문 전송 시 대화가 생성됨 */
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  /** 새 채팅 초안용 엔진 세션 식별자(UCID) — mount 시 1회 생성, "새 채팅" 클릭마다 재생성 */
  const draftServiceIdRef = useRef(createUUID());
  /** 화면 세션 내 chatId별 serviceId 고정 — 같은 채팅의 모든 질의에 같은 값 보장 */
  const serviceIdsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: chats = [], isFetching: isChatsFetching } = useGetChatList({ params: { keyword } });
  const { data: messages = [], isFetching: isMessagesFetching } = useGetChatMessageList({
    params: { chatId: selectedChatId ?? '' },
    queryOptions: { enabled: !!selectedChatId },
  });

  const { mutateAsync: createChat } = useCreateChat();
  const { mutateAsync: queryChat } = useQueryChat();
  const { mutate: updateChat } = useUpdateChat();
  const { mutate: deleteChat } = useDeleteChat();

  const invalidateChatList = () => queryClient.invalidateQueries({ queryKey: chatQueryKeys.getChatList._def });

  const handleSend = async () => {
    const userQuery = inputValue.trim();
    if (!userQuery || pendingQuery) return;

    setInputValue('');
    setPendingQuery(userQuery);
    try {
      let chatId = selectedChatId;
      if (!chatId) {
        const created = await createChat({ chatName: userQuery.slice(0, CHAT_NAME_MAX_LENGTH) });
        if (!created?.chatId) {
          toast.error('대화 생성에 실패했습니다.');
          return;
        }
        chatId = created.chatId;
        serviceIdsRef.current[chatId] = draftServiceIdRef.current;
        setSelectedChatId(chatId);
      }
      const serviceId = (serviceIdsRef.current[chatId] ??= createUUID());

      // BE 가 엔진 호출 + 메시지 저장까지 수행 (BE→엔진 read timeout 30초)
      await queryChat({ params: { chatId }, data: { userQuery, serviceId } });
      // 메시지 refetch 완료까지 await — pending(... 말풍선)이 새 메시지 표시 전에 사라지는 깜빡임 방지
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.getChatMessageList({ chatId }).queryKey });
      invalidateChatList();
    } catch (error) {
      // 400(입력 검증)·409(엔진 실패 등) 서버 message 는 전역 에러 핸들러가 토스트로 노출
      Log.warn('chat query error', error);
    } finally {
      setPendingQuery(null);
    }
  };

  const handleSelect = (chatId: string) => {
    if (pendingQuery) return;
    setSelectedChatId(chatId);
  };

  const handleNewChat = () => {
    if (pendingQuery) return;
    draftServiceIdRef.current = createUUID();
    setSelectedChatId(null);
    setInputValue('');
  };

  const handleRename = (chat: ChatItem, chatName: string) => {
    updateChat(
      { params: { chatId: chat.chatId }, data: { chatName } },
      {
        onSuccess: () => {
          toast.success('대화 이름이 변경되었습니다.');
          invalidateChatList();
        },
      },
    );
  };

  const handleDelete = (chat: ChatItem) => {
    modal.confirm.delete({
      onOk: () =>
        deleteChat(
          { chatId: chat.chatId },
          {
            onSuccess: () => {
              toast.success('대화가 삭제되었습니다.');
              if (selectedChatId === chat.chatId) setSelectedChatId(null);
              queryClient.removeQueries({ queryKey: chatQueryKeys.getChatMessageList({ chatId: chat.chatId }).queryKey });
              invalidateChatList();
            },
          },
        ),
    });
  };

  const selectedChat = chats.find((chat) => chat.chatId === selectedChatId);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full h-full min-h-0 bg-white bt-shadow overflow-hidden">
        <ChatSidebar
          chats={chats}
          isFetching={isChatsFetching}
          selectedChatId={selectedChatId}
          onSearch={setKeyword}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onRename={handleRename}
          onDelete={handleDelete}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#F1F3F5] bg-white px-5">
            <span className="truncate text-sm font-medium text-[#343A40]">{selectedChat?.chatName ?? '새 채팅'}</span>
            {selectedChat && messages.length > 0 && <span className="shrink-0 text-xs text-[#A5AAB5]">{messages.length}개의 대화</span>}
          </div>
          <ChatMessageList messages={messages} pendingQuery={pendingQuery} isFetching={isMessagesFetching} onExampleClick={setInputValue} />
          <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} sending={!!pendingQuery} />
        </div>
      </div>
    </div>
  );
}
