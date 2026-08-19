import { useInfiniteQuery } from '@tanstack/react-query';

import { minesGameService } from '../services/mines-game.service';
import { minesQueryKeys } from './mines-query-keys';

export const useMinesBetHistory = () =>
  useInfiniteQuery({
    queryKey: minesQueryKeys.queries.betHistory,
    queryFn: ({ pageParam }) => minesGameService.loadHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
