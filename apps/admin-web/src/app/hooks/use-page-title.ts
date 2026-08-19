import { useEffect } from 'react';
import { useLayoutStore } from '../store/layout-store';

export const usePageTitle = (title: string) => {
  const setPageTitle = useLayoutStore((s) => s.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
    return () => setPageTitle('');
  }, [title, setPageTitle]);
};
