import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../services/partner-api.service';
import { useAuthStore } from './auth-store';

export const usePartnerProfile = () => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['partner-profile', token],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      return fetchProfile(token);
    },
    enabled: !!token,
    initialData: user ?? undefined,
    refetchInterval: 5_000,
  });
};
