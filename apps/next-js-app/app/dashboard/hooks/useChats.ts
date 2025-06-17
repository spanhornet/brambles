// Utilites
import { api } from '@/lib/api-handler';

// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
import { Chat } from '../actions/constants';

export function useChats() {
  return useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await api.get<Chat[]>('/api/v1/chats');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChat(chatId: string) {
  const { data: chats } = useChats();

  const chat = chats?.find(chat => chat.ID === chatId);

  return {
    data: chat,
  };
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.post<Chat>('/api/v1/chats', { name });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
