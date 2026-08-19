import { LightningIcon } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { GameFooter, useTranslation } from '@vfair/games-web-shell';

import { useDiceGameStore } from '../../store/dice-game-store';

import './dice-game-footer.scss';

export const DiceGameFooter = () => {
  const { t } = useTranslation();
  const isInstantBetEnabled = useDiceGameStore(
    (state) => state.betResultTransitionMs === 0,
  );
  const toggleInstantBet = useDiceGameStore((state) => state.toggleInstantBet);

  return (
    <GameFooter
      start={
        <Tooltip content={t('diceInstantBet')}>
          <IconButton
            variant="ghost"
            size="1"
            aria-label={t('diceInstantBet')}
            aria-pressed={isInstantBetEnabled}
            onClick={toggleInstantBet}
          >
            <LightningIcon
              size={14}
              weight={isInstantBetEnabled ? 'fill' : 'regular'}
              className={clsx(
                'dice-game-footer__instant-bet-icon',
                isInstantBetEnabled &&
                  'dice-game-footer__instant-bet-icon--active',
              )}
            />
          </IconButton>
        </Tooltip>
      }
    />
  );
};
