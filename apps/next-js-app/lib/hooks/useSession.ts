// Utilities
import { api } from '@/lib/api-handler';

// React Query
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  phone: string;
  isPhoneVerified: boolean;
}

export function useSession() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<User, Error>({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await api.get<User>('/api/v1/users/me');
      if (error) throw error;
      return data as User;
    },
    retry: false,
  });

  const signOut = async () => {
    await api.post('/api/v1/users/sign-out');
    queryClient.invalidateQueries({ queryKey: ['session'] });
  };

  return {
    user,
    isLoading,
    isError,
    error,
    refetch,
    signOut,
  };
}