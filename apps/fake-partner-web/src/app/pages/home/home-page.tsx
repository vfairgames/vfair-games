import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
  getAvailableGame,
} from '@vfair/game-contracts';
import { Flex, Grid, Spinner } from '@radix-ui/themes';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GameCard } from '../../components/game-card/game-card';
import { PartnerHeader } from '../../components/partner-header/partner-header';
import { useAuthStore } from '../../auth/auth-store';
import { usePartnerProfile } from '../../auth/use-partner-profile';
import './home-page.scss';

const DICE_GAME = getAvailableGame(DICE_GAME_ID)!;
const MINES_GAME = getAvailableGame(MINES_GAME_ID)!;
const LIMBO_GAME = getAvailableGame(LIMBO_GAME_ID)!;
const PLINKO_GAME = getAvailableGame(PLINKO_GAME_ID)!;
const KENO_GAME = getAvailableGame(KENO_GAME_ID)!;

export const HomePage = () => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { data, isLoading, isFetched } = usePartnerProfile();
  const handleLogout = () => {
    logout();
    navigate('/sign-in', { replace: true });
  };

  useEffect(() => {
    if (isFetched && !data) {
      logout();
      navigate('/sign-in', { replace: true });
    }
  }, [isFetched, data, logout, navigate]);

  if (isLoading || !data) {
    return (
      <Flex className="home-page" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex className="home-page" direction="column" height="100%">
      <PartnerHeader wallets={data.wallets} onLogout={handleLogout} />
      <Flex
        className="home-page__content"
        direction="column"
        align="center"
        gap="4"
        flexGrow="1"
        p="4"
      >
        <Grid
          columns="repeat(auto-fill, minmax(180px, 1fr))"
          gap="4"
          width="100%"
        >
          <GameCard
            name={DICE_GAME.name}
            imageSrc="/games/dice.jpg"
            onClick={() => navigate('/games/dice')}
          />
          <GameCard
            name={MINES_GAME.name}
            imageSrc="/games/mines.jpg"
            onClick={() => navigate('/games/mines')}
          />
          <GameCard
            name={LIMBO_GAME.name}
            imageSrc="/games/limbo.jpg"
            onClick={() => navigate('/games/limbo')}
          />
          <GameCard
            name={PLINKO_GAME.name}
            imageSrc="/games/plinko.png"
            onClick={() => navigate('/games/plinko')}
          />
          <GameCard
            name={KENO_GAME.name}
            imageSrc="/games/keno.png"
            onClick={() => navigate('/games/keno')}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
