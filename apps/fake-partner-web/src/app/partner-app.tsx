import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
} from '@vfair/game-contracts';
import { Flex, Spinner } from '@radix-ui/themes';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import { useAuthStore } from './auth/auth-store';
import { useAuthBootstrap } from './auth/use-auth-bootstrap';
import { PartnerGamePage } from './components/partner-game-page/partner-game-page';
import { HomePage } from './pages/home/home-page';
import { VerificationPage } from './pages/verification/verification-page';
import { SignInPage } from './pages/sign-in/sign-in-page';

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

export const PartnerApp = () => {
  useAuthBootstrap();

  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/games/dice"
          element={<PartnerGamePage gameId={DICE_GAME_ID} />}
        />
        <Route
          path="/games/mines"
          element={<PartnerGamePage gameId={MINES_GAME_ID} />}
        />
        <Route
          path="/games/limbo"
          element={<PartnerGamePage gameId={LIMBO_GAME_ID} />}
        />
        <Route
          path="/games/plinko"
          element={<PartnerGamePage gameId={PLINKO_GAME_ID} />}
        />
        <Route
          path="/games/keno"
          element={<PartnerGamePage gameId={KENO_GAME_ID} />}
        />
        <Route path="/verification" element={<VerificationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
