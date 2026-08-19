import type { ActiveRoundGame } from '@vfair/game-contracts';

import { translate } from '../i18n/i18n';

export const formatActiveRoundsMessage = (
  games: ActiveRoundGame[],
): string | null => {
  if (games.length === 0) {
    return null;
  }

  if (games.length === 1) {
    return translate('shellRotationBlockedActiveRoundOne', {
      gameName: games[0].gameName,
    });
  }

  return translate('shellRotationBlockedActiveRoundMany', {
    gameNames: games.map((game) => game.gameName).join(', '),
  });
};
