import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '../constants/constants';
import { usePatchSearchParams, useQueryParam } from './use-query-param';

type UseDebouncedSearchOptions = {
  onDebouncedChange?: () => void;
  paramKey?: string;
  delayMs?: number;
};

export const useDebouncedSearch = ({
  onDebouncedChange,
  paramKey = 'search',
  delayMs = SEARCH_DEBOUNCE_MS,
}: UseDebouncedSearchOptions = {}) => {
  const [urlSearch, setUrlSearch] = useQueryParam(paramKey, '');
  const patchSearchParams = usePatchSearchParams();
  const [search, setSearchState] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const isInitialMount = useRef(true);
  const onDebouncedChangeRef = useRef(onDebouncedChange);

  onDebouncedChangeRef.current = onDebouncedChange;

  useEffect(() => {
    setSearchState(urlSearch);
    setDebouncedSearch(urlSearch);
  }, [urlSearch]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setUrlSearch(value || null);
    },
    [setUrlSearch],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch === search) {
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
        return;
      }

      setDebouncedSearch(search);

      if (!isInitialMount.current) {
        if (onDebouncedChangeRef.current) {
          onDebouncedChangeRef.current();
        } else {
          patchSearchParams({ page: null });
        }
      }

      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [search, delayMs, debouncedSearch, patchSearchParams]);

  return { search, setSearch, debouncedSearch };
};
