import { useInfiniteQuery } from '@tanstack/react-query';

import { diceGameService } from '../services/dice-game.service';
import { diceQueryKeys } from './dice-query-keys';

export const useDiceBetHistory = () =>
  useInfiniteQuery({
    queryKey: diceQueryKeys.queries.betHistory,
    queryFn: ({ pageParam }) => diceGameService.loadHistory(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
