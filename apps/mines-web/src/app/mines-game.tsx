import { useEffect } from 'react';
import { Card, Flex } from '@radix-ui/themes';

import './mines-game.scss';
import {
  GameLayout,
  ProvablyFairModal,
  useMainStore,
} from '@vfair/games-web-shell';
import { MinesBetControls } from './components/mines-bet-controls/mines-bet-controls';
import { MinesBetHistoryTab } from './components/mines-bet-history-tab/mines-bet-history-tab';
import { MinesGameFooter } from './components/mines-game-footer/mines-game-footer';
import { MinesGrid } from './components/mines-grid/mines-grid';
import { minesGameService } from './services/mines-game.service';
import { minesSoundService } from './services/mines-sound.service';
import { useMinesGameStore } from './store/mines-game-store';

export const MinesGame = () => {
  const rtp = useMainStore((state) => state.rtp);
  const isDemo = useMainStore((state) => state.isDemo);
  const connectionState = useMainStore((state) => state.connectionState);

  useEffect(() => {
    useMinesGameStore.getState().initMinesOdds(rtp);
  }, [rtp]);

  useEffect(() => {
    if (isDemo || connectionState !== 'connected') {
      return;
    }

    void minesGameService.restoreActiveRound();
  }, [isDemo, connectionState]);

  useEffect(() => {
    minesSoundService.register();
  }, []);

  return (
    <>
      <GameLayout aside={<MinesBetControls />} footer={<MinesGameFooter />}>
        <Flex direction="column" gap="2" p="2" height="100%" justify="center">
          <Card className="mines-game__card" variant="surface">
            <MinesGrid />
          </Card>
        </Flex>
      </GameLayout>
      <ProvablyFairModal betHistoryTab={<MinesBetHistoryTab />} />
    </>
  );
};
