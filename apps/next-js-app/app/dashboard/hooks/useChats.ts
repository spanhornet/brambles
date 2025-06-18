// Utilites
import { api } from '@/lib/api-handler';

// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
import { Chat } from '../actions/constants';

export function useChats() {
  const queryClient = useQueryClient();

  const chatsQuery = useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await api.get<Chat[]>('/api/v1/chats');
      if (error) throw error;
      return data ?? [];
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.post<Chat>('/api/v1/chats', { name });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  return {
    ...chatsQuery,
    createChat: createChatMutation,
  };
}
