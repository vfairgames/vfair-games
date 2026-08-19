import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type QueryParamSetter = (value: string | number | null) => void;

type SearchParamsPatch = Record<string, string | number | null>;

const normalizeParamValue = (value: string | number | null) =>
  value === null ? null : String(value);

const applySearchParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | null,
  defaultValue: string,
) => {
  const normalized = normalizeParamValue(value);

  if (normalized === null || normalized === '' || normalized === defaultValue) {
    params.delete(key);
  } else {
    params.set(key, normalized);
  }
};

const parsePageParam = (raw: string, defaultPage: number) => {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : defaultPage;
};

export const usePatchSearchParams = () => {
  const [, setSearchParams] = useSearchParams();

  return useCallback(
    (patch: SearchParamsPatch) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);

          for (const [key, next] of Object.entries(patch)) {
            applySearchParam(params, key, next, '');
          }

          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
};

export const useQueryParamValue = (key: string, defaultValue: string) => {
  const [searchParams] = useSearchParams();
  return searchParams.get(key) ?? defaultValue;
};

export const useQueryParam = (
  key: string,
  defaultValue: string,
): [string, QueryParamSetter] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string | number | null) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          applySearchParam(params, key, next, defaultValue);
          return params;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
};

export const usePageQueryParam = (
  defaultPage = 1,
): [number, (next: number | ((current: number) => number)) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = searchParams.get('page') ?? String(defaultPage);

  const page = useMemo(
    () => parsePageParam(rawPage, defaultPage),
    [rawPage, defaultPage],
  );

  const setPage = useCallback(
    (next: number | ((current: number) => number)) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          const currentRaw = params.get('page') ?? String(defaultPage);
          const currentPage = parsePageParam(currentRaw, defaultPage);
          const resolved =
            typeof next === 'function' ? next(currentPage) : next;
          const clamped = Math.max(1, resolved);

          if (clamped === defaultPage) {
            params.delete('page');
          } else {
            params.set('page', String(clamped));
          }

          return params;
        },
        { replace: true },
      );
    },
    [defaultPage, setSearchParams],
  );

  return [page, setPage];
};

export const useTabQueryParam = <T extends string>(
  defaultTab: T,
  allowedTabs: readonly T[],
  paramKey = 'tab',
): [T, (tab: T) => void] => {
  const [rawTab, setRawTab] = useQueryParam(paramKey, defaultTab);

  const tab = useMemo(() => {
    return allowedTabs.includes(rawTab as T) ? (rawTab as T) : defaultTab;
  }, [rawTab, defaultTab, allowedTabs]);

  const setTab = useCallback(
    (next: T) => {
      setRawTab(next === defaultTab ? null : next);
    },
    [defaultTab, setRawTab],
  );

  return [tab, setTab];
};
