import { useEffect } from 'react';
import { Box, Card, Flex } from '@radix-ui/themes';

import './limbo-game.scss';
import {
  GameLayout,
  ProvablyFairModal,
  useMainStore,
} from '@vfair/games-web-shell';
import { LimboBetControls } from './components/limbo-bet-controls/limbo-bet-controls';
import { LimboBetHistoryTab } from './components/limbo-bet-history-tab/limbo-bet-history-tab';
import { LimboGameControls } from './components/limbo-game-controls/limbo-game-controls';
import { LimboGameFooter } from './components/limbo-game-footer/limbo-game-footer';
import { LimboResult } from './components/limbo-result/limbo-result';
import { LimboRollHistory } from './components/limbo-roll-history/limbo-roll-history';
import { limboSoundService } from './services/limbo-sound.service';
import { useLimboGameStore } from './store/limbo-game-store';

export const LimboGame = () => {
  const rtp = useMainStore((state) => state.rtp);

  useEffect(() => {
    useLimboGameStore.getState().initLimboOdds(rtp);
  }, [rtp]);

  useEffect(() => {
    limboSoundService.register();
  }, []);

  return (
    <>
      <GameLayout aside={<LimboBetControls />} footer={<LimboGameFooter />}>
        <Flex direction="column" gap="2" p="4" height="100%">
          <Card className="limbo-game__card" variant="surface">
            <LimboRollHistory />
            <LimboResult />
          </Card>
          <Box>
            <LimboGameControls />
          </Box>
        </Flex>
      </GameLayout>
      <ProvablyFairModal betHistoryTab={<LimboBetHistoryTab />} />
    </>
  );
};
