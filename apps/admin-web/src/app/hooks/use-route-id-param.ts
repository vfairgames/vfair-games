import { useParams } from 'react-router';
import { parseRouteId } from '../utils/parse-route-id';

export const useRouteIdParam = (): number | null => {
  const { id } = useParams<{ id: string }>();
  return parseRouteId(id);
};
