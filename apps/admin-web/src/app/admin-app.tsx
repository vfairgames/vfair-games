import { Flex, Spinner } from '@radix-ui/themes';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './auth/auth-store';
import { useAuthBootstrap } from './auth/use-auth-bootstrap';
import type { AuthUser } from './auth/auth-types';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { SignInPage } from './pages/sign-in/sign-in-page';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { NotFoundPage } from './pages/not-found/not-found-page';
import { PartnersPage } from './pages/partners/partners-page';
import { CreatePartnerPage } from './pages/partners/create-partner-page';
import { EditPartnerPage } from './pages/partners/edit-partner-page';
import { UsersPage } from './pages/users/users-page';
import { CreateUserPage } from './pages/users/create-user-page';
import { EditUserPage } from './pages/users/edit-user-page';
import { SettingsPage } from './pages/settings/settings-page';
import { PlayersPage } from './pages/players/players-page';
import { EditPlayerPage } from './pages/players/edit-player-page';
import { FailedRoundDetailPage } from './pages/failed-rounds/failed-round-detail-page';
import { FailedRoundsPage } from './pages/failed-rounds/failed-rounds-page';

const ProtectedRoute = () => {
  const sessionStatus = useAuthStore((s) => s.sessionStatus);

  if (sessionStatus === 'unknown') {
    return (
      <Flex align="center" justify="center" height="100vh">
        <Spinner size="3" />
      </Flex>
    );
  }

  return sessionStatus === 'authenticated' ? (
    <Outlet />
  ) : (
    <Navigate to="/sign-in" replace />
  );
};

const hasPermission = (user: AuthUser | null, permission: string) =>
  user?.permissions[permission] === true;

const PermissionRoute = ({ permission }: { permission: string }) => {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, permission) ? (
    <Outlet />
  ) : (
    <Navigate to="/settings" replace />
  );
};

export const AdminApp = () => {
  useAuthBootstrap();

  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<PermissionRoute permission="MANAGE_PLAYERS" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:id" element={<EditPlayerPage />} />
            <Route path="/failed-rounds" element={<FailedRoundsPage />} />
            <Route
              path="/failed-rounds/:id"
              element={<FailedRoundDetailPage />}
            />
          </Route>
          <Route element={<PermissionRoute permission="MANAGE_PARTNERS" />}>
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/partners/new" element={<CreatePartnerPage />} />
            <Route path="/partners/:id/edit" element={<EditPartnerPage />} />
          </Route>
          <Route element={<PermissionRoute permission="MANAGE_USERS" />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/new" element={<CreateUserPage />} />
            <Route path="/users/:id/edit" element={<EditUserPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
};
