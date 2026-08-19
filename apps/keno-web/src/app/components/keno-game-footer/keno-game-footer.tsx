import { LightningIcon } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { GameFooter, useTranslation } from '@vfair/games-web-shell';

import { useKenoGameStore } from '../../store/keno-game-store';

import './keno-game-footer.scss';

export const KenoGameFooter = () => {
  const { t } = useTranslation();
  const isInstantBetEnabled = useKenoGameStore(
    (state) => state.betResultTransitionMs === 0,
  );
  const toggleInstantBet = useKenoGameStore((state) => state.toggleInstantBet);

  return (
    <GameFooter
      start={
        <Tooltip content={t('kenoInstantBet')}>
          <IconButton
            aria-label={t('kenoInstantBet')}
            aria-pressed={isInstantBetEnabled}
            size="1"
            variant="ghost"
            onClick={toggleInstantBet}
          >
            <LightningIcon
              className={clsx(
                'keno-game-footer__instant-bet-icon',
                isInstantBetEnabled &&
                  'keno-game-footer__instant-bet-icon--active',
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
