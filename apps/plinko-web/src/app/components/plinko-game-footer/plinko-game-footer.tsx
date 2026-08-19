import { LightningIcon } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { GameFooter, useTranslation } from '@vfair/games-web-shell';

import { usePlinkoGameStore } from '../../store/plinko-game-store';

import './plinko-game-footer.scss';

export const PlinkoGameFooter = () => {
  const { t } = useTranslation();
  const isInstantBetEnabled = usePlinkoGameStore((state) => state.isInstantBet);
  const toggleInstantBet = usePlinkoGameStore(
    (state) => state.toggleInstantBet,
  );

  return (
    <GameFooter
      start={
        <Tooltip content={t('plinkoInstantBet')}>
          <IconButton
            aria-label={t('plinkoInstantBet')}
            aria-pressed={isInstantBetEnabled}
            size="1"
            variant="ghost"
            onClick={toggleInstantBet}
          >
            <LightningIcon
              className={clsx(
                'plinko-game-footer__instant-bet-icon',
                isInstantBetEnabled &&
                  'plinko-game-footer__instant-bet-icon--active',
              )}
              size={14}
              weight={isInstantBetEnabled ? 'fill' : 'regular'}
            />
          </IconButton>
        </Tooltip>
      }
    />
  );
};
