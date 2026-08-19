import { useCallback, useEffect, useState } from 'react';
import { Box, Card, Flex } from '@radix-ui/themes';

import './plinko-game.scss';
import { GameLayout, ProvablyFairModal } from '@vfair/games-web-shell';
import { PlinkoBetControls } from './components/plinko-bet-controls/plinko-bet-controls';
import { PlinkoBetHistoryTab } from './components/plinko-bet-history-tab/plinko-bet-history-tab';
import { PlinkoBoard } from './components/plinko-board/plinko-board';
import {
  PlinkoBuckets,
  type PlinkoBucketPulses,
} from './components/plinko-buckets/plinko-buckets';
import { PlinkoGameFooter } from './components/plinko-game-footer/plinko-game-footer';
import { finalizePlinkoDrop } from './query/place-bet-utils';
import { plinkoSoundService } from './services/plinko-sound.service';
import { usePlinkoGameStore } from './store/plinko-game-store';

export const PlinkoGame = () => {
  const drops = usePlinkoGameStore((state) => state.drops);
  const formRows = usePlinkoGameStore((state) => state.form.rows);
  const formRisk = usePlinkoGameStore((state) => state.form.risk);
  const boardRows = drops[0]?.rows ?? formRows;
  const [bucketPulses, setBucketPulses] = useState<PlinkoBucketPulses>({});
  const [pulsesBoardKey, setPulsesBoardKey] = useState(
    () => `${boardRows}:${formRisk}`,
  );
  const boardKey = `${boardRows}:${formRisk}`;

  if (pulsesBoardKey !== boardKey) {
    setPulsesBoardKey(boardKey);
    setBucketPulses({});
  }

  useEffect(() => {
    usePlinkoGameStore.getState().initPlinkoOdds();
  }, []);

  useEffect(() => {
    plinkoSoundService.register();
  }, []);

  const handleDropLand = useCallback((dropId: string, bucketIndex: number) => {
    setBucketPulses((current) => ({
      ...current,
      [bucketIndex]: Date.now(),
    }));
    finalizePlinkoDrop(dropId);
  }, []);

  return (
    <>
      <GameLayout aside={<PlinkoBetControls />} footer={<PlinkoGameFooter />}>
        <Flex direction="column" gap="2" height="100%" p="4">
          <Card className="plinko-game__card" variant="surface">
            <Box className="plinko-game__board-area">
              <div className="plinko-game__playfield">
                <PlinkoBoard
                  drops={drops}
                  rows={boardRows}
                  onDropLand={handleDropLand}
                />
                <PlinkoBuckets pulses={bucketPulses} rows={boardRows} />
              </div>
            </Box>
          </Card>
        </Flex>
      </GameLayout>
      <ProvablyFairModal betHistoryTab={<PlinkoBetHistoryTab />} />
    </>
  );
};
