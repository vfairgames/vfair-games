import { useEffect } from 'react';
import { Box, Card, Flex } from '@radix-ui/themes';

import './dice-game.scss';
import {
  GameLayout,
  ProvablyFairModal,
  useMainStore,
} from '@vfair/games-web-shell';
import { DiceBetControls } from './components/dice-bet-controls/dice-bet-controls';
import { DiceBetHistoryTab } from './components/dice-bet-history-tab/dice-bet-history-tab';
import { DiceGameFooter } from './components/dice-game-footer/dice-game-footer';
import { DiceGameControls } from './components/dice-game-controls/dice-game-controls';
import { DiceRollHistory } from './components/dice-roll-history/dice-roll-history';
import { DiceSlider } from './components/dice-slider/dice-slider';
import { diceSoundService } from './services/dice-sound.service';
import { useDiceGameStore } from './store/dice-game-store';

export const DiceGame = () => {
  const rtp = useMainStore((state) => state.rtp);

  useEffect(() => {
    useDiceGameStore.getState().initDiceOdds(rtp);
  }, [rtp]);

  useEffect(() => {
    diceSoundService.register();
  }, []);

  return (
    <>
      <GameLayout aside={<DiceBetControls />} footer={<DiceGameFooter />}>
        <Flex direction="column" gap="2" p="4" height="100%">
          <Card className="dice-game__card" variant="surface">
            <DiceRollHistory />
            <DiceSlider />
          </Card>
          <Box>
            <DiceGameControls />
          </Box>
        </Flex>
      </GameLayout>
      <ProvablyFairModal betHistoryTab={<DiceBetHistoryTab />} />
    </>
  );
};
