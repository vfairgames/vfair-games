import { LightningIcon } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { GameFooter, useTranslation } from '@vfair/games-web-shell';

import { useMinesGameStore } from '../../store/mines-game-store';

import './mines-game-footer.scss';

export const MinesGameFooter = () => {
  const { t } = useTranslation();
  const isInstantBetEnabled = useMinesGameStore(
    (state) => state.betResultTransitionMs === 0,
  );
  const toggleInstantBet = useMinesGameStore((state) => state.toggleInstantBet);

  return (
    <GameFooter
      start={
        <Tooltip content={t('minesInstantBet')}>
          <IconButton
            variant="ghost"
            size="1"
            aria-label={t('minesInstantBet')}
            aria-pressed={isInstantBetEnabled}
            onClick={toggleInstantBet}
          >
            <LightningIcon
              size={14}
              weight={isInstantBetEnabled ? 'fill' : 'regular'}
              className={clsx(
                'mines-game-footer__instant-bet-icon',
                isInstantBetEnabled &&
                  'mines-game-footer__instant-bet-icon--active',
              )}
            />
          </IconButton>
        </Tooltip>
      }
    />
  );
};
