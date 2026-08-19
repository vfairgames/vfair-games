import { useInfiniteQuery } from '@tanstack/react-query';

import { kenoGameService } from '../services/keno-game.service';
import { kenoQueryKeys } from './keno-query-keys';

export const useKenoBetHistory = () =>
  useInfiniteQuery({
    queryKey: kenoQueryKeys.queries.betHistory,
    queryFn: ({ pageParam }) => kenoGameService.loadHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
