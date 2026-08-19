import { useInfiniteQuery } from '@tanstack/react-query';

import { plinkoGameService } from '../services/plinko-game.service';
import { plinkoQueryKeys } from './plinko-query-keys';

export const usePlinkoBetHistory = () =>
  useInfiniteQuery({
    queryKey: plinkoQueryKeys.queries.betHistory,
    queryFn: ({ pageParam }) => plinkoGameService.loadHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
