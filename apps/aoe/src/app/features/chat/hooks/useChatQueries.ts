import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { chatApi } from '../api/chatApi';
import type { ChatCreateDatas, ChatItem, ChatMessageItem, ChatQueryDatas, ChatUpdateDatas } from '../types';

export const chatQueryKeys = createQueryKeys('chat', {
  getChatList: (params?: { keyword?: string }) => [params],
  getChatMessageList: (params: { chatId: string }) => [params],
});

export const useGetChatList = ({ params, queryOptions }: QueryHookWithParamsOptions<ChatItem[]> = {}) => {
  const keyword = (params?.keyword as string | undefined) ?? '';
  return useQuery({
    queryKey: chatQueryKeys.getChatList({ keyword }).queryKey,
    queryFn: () => chatApi.getChatList({ keyword }),
    ...queryOptions,
  });
};

export const useGetChatMessageList = ({ params, queryOptions }: QueryHookWithParamsOptions<ChatMessageItem[]> = {}) => {
  const chatId = (params?.chatId as string | undefined) ?? '';
  return useQuery({
    queryKey: chatQueryKeys.getChatMessageList({ chatId }).queryKey,
    queryFn: () => chatApi.getChatMessageList({ chatId }),
    ...queryOptions,
  });
};

export const useCreateChat = ({ mutationOptions }: MutationHookOptions<ChatItem | undefined, ChatCreateDatas> = {}) => {
  return useMutation({
    mutationFn: chatApi.createChat,
    ...mutationOptions,
  });
};

export const useUpdateChat = ({ mutationOptions }: MutationHookOptions<void, { params: { chatId: string }; data: ChatUpdateDatas }> = {}) => {
  return useMutation({
    mutationFn: chatApi.updateChat,
    ...mutationOptions,
  });
};

export const useDeleteChat = ({ mutationOptions }: MutationHookOptions<void, { chatId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => chatApi.deleteChat(params),
    ...mutationOptions,
  });
};

export const useQueryChat = ({ mutationOptions }: MutationHookOptions<ChatMessageItem | undefined, { params: { chatId: string }; data: ChatQueryDatas }> = {}) => {
  return useMutation({
    mutationFn: chatApi.queryChat,
    ...mutationOptions,
  });
};
