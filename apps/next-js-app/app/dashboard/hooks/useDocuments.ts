// Utilites
import { api } from '@/lib/api-handler';

// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
import { Document } from '../actions/constants';

export function useDocuments(chatId?: string) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery<Document[]>({
    queryKey: chatId ? ['documents', 'chat', chatId] : ['documents'],
    queryFn: async () => {
      const { data, error } = await api.get<Document[]>('/api/v1/documents');
      if (error) throw error;

      const documents = data ?? [];

      // Filter by chatId if provided
      if (chatId) {
        return documents.filter(doc => doc.ChatID === chatId);
      }

      return documents;
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to upload document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    ...documentsQuery,
    createDocument: createDocumentMutation,
  };
}
