import { useEffect } from 'react';
import { Box, Card, Flex } from '@radix-ui/themes';

import './keno-game.scss';
import { GameLayout, ProvablyFairModal } from '@vfair/games-web-shell';
import { KenoBetControls } from './components/keno-bet-controls/keno-bet-controls';
import { KenoBetHistoryTab } from './components/keno-bet-history-tab/keno-bet-history-tab';
import { KenoGameFooter } from './components/keno-game-footer/keno-game-footer';
import { KenoGrid } from './components/keno-grid/keno-grid';
import { KenoPaytable } from './components/keno-paytable/keno-paytable';
import { kenoSoundService } from './services/keno-sound.service';
import { useKenoGameStore } from './store/keno-game-store';

export const KenoGame = () => {
  useEffect(() => {
    useKenoGameStore.getState().initKenoOdds();
  }, []);

  useEffect(() => {
    kenoSoundService.register();
  }, []);

  return (
    <>
      <GameLayout aside={<KenoBetControls />} footer={<KenoGameFooter />}>
        <Flex direction="column" gap="2" height="100%" p="4">
          <Card className="keno-game__card" variant="surface">
            <KenoGrid />
          </Card>
          <Box width="100%">
            <KenoPaytable />
          </Box>
        </Flex>
      </GameLayout>
      <ProvablyFairModal betHistoryTab={<KenoBetHistoryTab />} />
    </>
  );
};
