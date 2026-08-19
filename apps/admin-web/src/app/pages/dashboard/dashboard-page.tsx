import { usePageTitle } from '../../hooks/use-page-title';
import { Dashboard } from '../../components/dashboard/dashboard';

export const DashboardPage = () => {
  usePageTitle('Dashboard');
  return <Dashboard />;
};
