import { LightningIcon } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { GameFooter, useTranslation } from '@vfair/games-web-shell';

import { useLimboGameStore } from '../../store/limbo-game-store';

import './limbo-game-footer.scss';

export const LimboGameFooter = () => {
  const { t } = useTranslation();
  const isInstantBetEnabled = useLimboGameStore(
    (state) => state.betResultTransitionMs === 0,
  );
  const toggleInstantBet = useLimboGameStore((state) => state.toggleInstantBet);

  return (
    <GameFooter
      start={
        <Tooltip content={t('limboInstantBet')}>
          <IconButton
            variant="ghost"
            size="1"
            aria-label={t('limboInstantBet')}
            aria-pressed={isInstantBetEnabled}
            onClick={toggleInstantBet}
          >
            <LightningIcon
              size={14}
              weight={isInstantBetEnabled ? 'fill' : 'regular'}
              className={clsx(
                'limbo-game-footer__instant-bet-icon',
                isInstantBetEnabled &&
                  'limbo-game-footer__instant-bet-icon--active',
              )}
            />
          </IconButton>
        </Tooltip>
      }
    />
  );
};
