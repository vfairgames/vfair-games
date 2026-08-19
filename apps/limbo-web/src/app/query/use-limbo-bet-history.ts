import { useInfiniteQuery } from '@tanstack/react-query';

import { limboGameService } from '../services/limbo-game.service';
import { limboQueryKeys } from './limbo-query-keys';

export const useLimboBetHistory = () =>
  useInfiniteQuery({
    queryKey: limboQueryKeys.queries.betHistory,
    queryFn: ({ pageParam }) => limboGameService.loadHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
