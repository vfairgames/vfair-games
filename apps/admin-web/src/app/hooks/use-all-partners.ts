import { useQuery } from '@tanstack/react-query';
import { PARTNERS_FETCH_LIMIT } from '../constants/constants';
import { fetchPartners } from '../services/admin-api.service';

type UseAllPartnersOptions = {
  enabled?: boolean;
};

export const useAllPartners = ({
  enabled = true,
}: UseAllPartnersOptions = {}) => {
  const query = useQuery({
    queryKey: ['partners', 1, '', PARTNERS_FETCH_LIMIT],
    queryFn: () => fetchPartners({ page: 1, limit: PARTNERS_FETCH_LIMIT }),
    enabled,
  });

  return {
    partners: query.data?.data ?? [],
    isLoading: query.isLoading,
  };
};
